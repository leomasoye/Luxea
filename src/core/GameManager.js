import { Scene, Vector3 } from '@babylonjs/core';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { CameraManager } from '../rendering/CameraManager.js';
import { LightingManager } from '../rendering/LightingManager.js';
import { EnvironmentManager } from '../world/EnvironmentManager.js';
import { LevelManager } from '../world/LevelManager.js';
import { CaveManager } from '../world/CaveManager.js';
import { ForestManager } from '../world/ForestManager.js';
import { CollisionManager } from '../world/CollisionManager.js';
import { Player } from '../entities/Player.js';
import { UIManager } from '../ui/UIManager.js';

export const GameState = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  TRANSITION: 'TRANSITION',
  PAUSED: 'PAUSED',
  SETTINGS: 'SETTINGS',
  QUIT_CONFIRM: 'QUIT_CONFIRM',
  QUIT_GOODBYE: 'QUIT_GOODBYE',
  GAMEOVER: 'GAMEOVER'
};

/**
 * GameManager.js — Cœur logique du jeu Luxea.
 * Conforme à AGENT.md & GDD.md :
 * - Scène unique continue Babylon.js avec activation/désactivation de zones (Plaine / Caverne).
 * - Machine à états (Titre -> Jeu -> Pause -> Dialogue -> Transition -> Défaite/Respawn).
 * - Boucle de jeu découplée avec deltaTime plafonné.
 * - Intégration de la mécanique de lumière et du combat d'épée.
 */
export class GameManager {
  constructor(engine, canvas) {
    this.engine = engine;
    this.canvas = canvas;
    this.scene = new Scene(this.engine);

    this.state = GameState.TITLE;
    this.currentZone = 'plaine';
    this.isTransitioning = false;
    this.transitionCooldown = 0;

    // Gestionnaires de sous-systèmes
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.saveData = SaveManager.load();

    this.cameraManager = new CameraManager(this.scene, this.canvas);
    this.lightingManager = new LightingManager(this.scene);
    this.collision = new CollisionManager();
    this.environment = new EnvironmentManager(this.scene);
    this.level = new LevelManager(this.scene, this.audio, this.saveData);
    this.cave = new CaveManager(this.scene, this.saveData);
    this.forest = new ForestManager(this.scene);

    // Initialisation des hitboxes (murs, falaises, arbres, buissons, panneau, portes, caverne, forêt)
    this.environment.initColliders(this.collision);
    this.level.initColliders(this.collision);
    this.cave.initColliders(this.collision);
    this.forest.initColliders(this.collision);

    // La caverne et la forêt sont désactivées par défaut au lancement (scène unique)
    this.cave.setEnabled(false);
    this.forest.setEnabled(false);

    this.player = new Player(this.scene, this.audio, this.lightingManager, this.cameraManager, this.collision);
    this.ui = new UIManager(this.scene);
    this.player.setUIManager(this.ui);
    this.previousState = GameState.TITLE;

    // Initialisation des liaisons d'événements UI
    this.setupUIEvents();

    // Démarrage de la boucle de rendu principale
    this.startLoop();
  }

  setupUIEvents() {
    // Boutons de l'Écran Titre (Zelda Style)
    this.ui.btnStartGame?.addEventListener('click', () => {
      this.startGame();
    });

    this.ui.btnTitleSettings?.addEventListener('click', () => {
      this.openSettings(false);
    });

    this.ui.btnTitleQuit?.addEventListener('click', () => {
      this.openQuitModal();
    });

    // Sélection dynamique au survol de la souris
    this.ui.titleMenuItems?.forEach((btn, idx) => {
      btn.addEventListener('mouseenter', () => {
        this.ui.setTitleSelection(idx);
      });
    });

    // Boutons des Paramètres
    this.ui.btnSettingsAudio?.addEventListener('click', () => {
      const active = this.audio.toggleMute();
      this.ui.updateSoundButton(!active);
    });

    this.ui.btnResetSave?.addEventListener('click', () => {
      this.resetProgression();
    });

    this.ui.btnSettingsBack?.addEventListener('click', () => {
      this.closeSettings();
    });

    // Boutons de Quitter le jeu
    this.ui.btnQuitConfirm?.addEventListener('click', () => {
      this.confirmQuit();
    });

    this.ui.btnQuitCancel?.addEventListener('click', () => {
      this.closeQuitModal();
    });

    this.ui.btnQuitReturn?.addEventListener('click', () => {
      this.returnToTitle();
    });

    // Menu Pause
    this.ui.btnResumeGame?.addEventListener('click', () => {
      this.resumeGame();
    });

    this.ui.btnPauseSettings?.addEventListener('click', () => {
      this.openSettings(true);
    });

    this.ui.btnPauseSound?.addEventListener('click', () => {
      const active = this.audio.toggleMute();
      this.ui.updateSoundButton(!active);
    });

    this.ui.btnResetGame?.addEventListener('click', () => {
      this.respawnPlayer();
    });

    // Bouton « Réapparaître » (Game Over)
    this.ui.btnRespawn?.addEventListener('click', () => {
      this.respawnPlayer();
    });
  }

  openSettings(fromPause = false) {
    this.previousState = fromPause ? GameState.PAUSED : GameState.TITLE;
    this.state = GameState.SETTINGS;
    this.input.flush();
    if (fromPause) {
      this.ui.hidePauseModal();
    } else {
      this.ui.hideTitleScreen();
    }
    this.ui.showSettings(fromPause);
  }

  closeSettings() {
    const wasFromPause = this.ui.hideSettings();
    this.input.flush();
    if (wasFromPause || this.previousState === GameState.PAUSED) {
      this.state = GameState.PAUSED;
      this.ui.showPauseModal();
    } else {
      this.state = GameState.TITLE;
      this.ui.showTitleScreen();
    }
  }

  openQuitModal() {
    this.state = GameState.QUIT_CONFIRM;
    this.input.flush();
    this.ui.showQuitModal();
  }

  closeQuitModal() {
    this.ui.hideQuitModal();
    this.input.flush();
    this.state = GameState.TITLE;
  }

  confirmQuit() {
    try {
      window.close();
    } catch {
      // Ignorer si bloqué par les restrictions de sécurité du navigateur
    }
    this.state = GameState.QUIT_GOODBYE;
    this.input.flush();
    this.ui.showQuitGoodbye();
  }

  returnToTitle() {
    this.ui.hideQuitGoodbye();
    this.ui.hideQuitModal();
    this.input.flush();
    this.state = GameState.TITLE;
    this.ui.showTitleScreen();
  }

  startGame() {
    this.audio.unlock();
    this.input.flush();
    this.state = GameState.PLAYING;
    this.ui.hideTitleScreen();
    this.ui.updateHealth(this.player.health);
    this.ui.updateKeys(this.saveData.simpleKey, this.saveData.bossKey);
  }

  pauseGame() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.input.flush();
      this.ui.showPauseModal();
    }
  }

  resumeGame() {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.ui.hidePauseModal();
      this.input.flush();
    }
  }

  gameOver() {
    this.state = GameState.GAMEOVER;
    this.input.flush();
    this.audio.playGameOver();
    this.ui.showGameOver();
  }

  resetProgression() {
    const fresh = SaveManager.reset();
    Object.assign(this.saveData, fresh);
    this.cave.resetPuzzle();
    this.level.syncGates();
    this.ui.updateKeys(this.saveData.simpleKey, this.saveData.bossKey);
    this.ui.hideSettings();
    this.respawnPlayer();
  }

  respawnPlayer() {
    if (this.currentZone === 'cavern' || this.currentZone === 'forest') {
      // Retour complet à la Plaine d'Éveil (conforme au libellé « Réapparaître dans la Plaine »)
      if (this.currentZone === 'cavern') {
        this.cave.resetEnemies();
        this.cave.setEnabled(false);
      } else if (this.currentZone === 'forest') {
        this.forest.setEnabled(false);
      }
      this.environment.root.setEnabled(true);
      this.level.root.setEnabled(true);

      this.currentZone = 'plaine';
      this.collision.setZone('plaine');
      this.lightingManager.setZone('plaine');

      this.player.setBounds({ minX: -26, maxX: 26, minZ: -23, maxZ: 26 });
      this.cameraManager.setBounds({ minX: -26, maxX: 26, minZ: -24, maxZ: 28 });
      this.player.setZone('plaine');
      this.player.setGroundHeightProvider(null);
      this.player.root.position.y = 0;
    }

    // Réapparition au Spawn de la Plaine d'Éveil
    this.player.reset(0, 0, -4);
    this.player.facingAngle = 0;
    this.player.targetFacingAngle = 0;
    if (this.player.rollNode) this.player.rollNode.rotation.y = 0;
    this.player.visualRoot.rotation.y = 0;
    if (this.cameraManager) {
      this.cameraManager.snapTo(this.player.getPosition(), -Math.PI / 2);
    }
    this.ui.updateHealth(this.player.health);
    this.ui.updateLightGauge(this.player.lightGauge, false);
    this.ui.hideGameOver();
    this.ui.hidePauseModal();
    this.ui.hideSettings();
    this.ui.hideQuitModal();
    this.ui.hideQuitGoodbye();
    this.ui.hideInteractionPrompt();
    this.input.flush();
    this.state = GameState.PLAYING;
  }

  /**
   * Transition de zone ultra-fluide avec fondu sombre (Fade to Black).
   * Zéro lag, zéro freeze : bascule des scènes et coordonnées sous écran noir complet.
   */
  async switchZone(targetZone) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.state = GameState.TRANSITION;
    this.input.flush();
    this.ui.hideInteractionPrompt();

    // 1. Fondu progressif vers le noir complet
    await this.ui.fadeToBlack(380);

    // 2. Bascule instantanée des zones, colliders et lumières sous l'écran noir
    const prevZone = this.currentZone;
    if (targetZone === 'cavern') {
      this.currentZone = 'cavern';
      this.environment.root.setEnabled(false);
      this.level.root.setEnabled(false);
      this.forest.setEnabled(false);
      this.cave.setEnabled(true);

      this.collision.setZone('cavern');
      this.lightingManager.setZone('cavern');

      const caveBounds = this.cave.getBounds();
      this.player.setBounds(caveBounds.player);
      this.cameraManager.setBounds(caveBounds.camera);
      this.player.setZone('cavern');
      this.player.setGroundHeightProvider((x, z) => this.cave.getGroundHeight(x, z));

      // Téléportation à l'entrée Ouest de la caverne, face vers l'intérieur (Est)
      this.player.reset(185.0, 0, 0);
      this.player.facingAngle = Math.PI / 2;
      this.player.targetFacingAngle = Math.PI / 2;
      if (this.player.rollNode) this.player.rollNode.rotation.y = Math.PI / 2;
      this.player.visualRoot.rotation.y = Math.PI / 2;

      this.cameraManager.snapTo(new Vector3(185.0, 1.2, 0), -Math.PI * 0.78, 8.5);
    } else if (targetZone === 'forest') {
      this.currentZone = 'forest';
      this.environment.root.setEnabled(false);
      this.level.root.setEnabled(false);
      this.cave.setEnabled(false);
      this.forest.setEnabled(true);

      this.collision.setZone('forest');
      this.lightingManager.setZone('forest');

      const forestBounds = this.forest.getBounds();
      this.player.setBounds(forestBounds.player);
      this.cameraManager.setBounds(forestBounds.camera);
      this.player.setZone('forest');
      this.player.setGroundHeightProvider((x, z) => this.forest.getGroundHeight(x, z));

      // Téléportation à l'entrée Est de la Forêt Sacrée, face vers l'Arbre Sacré (Ouest)
      this.player.reset(-184.5, 0, 0);
      this.player.facingAngle = -Math.PI / 2;
      this.player.targetFacingAngle = -Math.PI / 2;
      if (this.player.rollNode) this.player.rollNode.rotation.y = -Math.PI / 2;
      this.player.visualRoot.rotation.y = -Math.PI / 2;

      this.cameraManager.snapTo(new Vector3(-184.5, 1.2, 0), -Math.PI * 0.08, 10.5);
    } else {
      this.currentZone = 'plaine';
      this.cave.setEnabled(false);
      this.forest.setEnabled(false);
      this.environment.root.setEnabled(true);
      this.level.root.setEnabled(true);

      this.collision.setZone('plaine');
      this.lightingManager.setZone('plaine');

      this.player.setBounds({ minX: -26, maxX: 26, minZ: -23, maxZ: 26 });
      this.cameraManager.setBounds({ minX: -26, maxX: 26, minZ: -24, maxZ: 28 });
      this.player.setZone('plaine');
      this.player.setGroundHeightProvider(null);
      this.player.root.position.y = 0;

      if (prevZone === 'forest') {
        // Retour depuis la Forêt Sacrée : apparition devant l'arche Ouest, face vers la plaine (Est)
        this.player.reset(-21.2, 0, 2.0);
        this.player.facingAngle = Math.PI / 2;
        this.player.targetFacingAngle = Math.PI / 2;
        if (this.player.rollNode) this.player.rollNode.rotation.y = Math.PI / 2;
        this.player.visualRoot.rotation.y = Math.PI / 2;

        this.cameraManager.snapTo(new Vector3(-21.2, 1.2, 2.0), -Math.PI * 0.55, 9.5);
      } else {
        // Retour depuis la Caverne : apparition devant l'arche Est, face vers la plaine (Ouest)
        this.player.reset(21.2, 0, 2.0);
        this.player.facingAngle = -Math.PI / 2;
        this.player.targetFacingAngle = -Math.PI / 2;
        if (this.player.rollNode) this.player.rollNode.rotation.y = -Math.PI / 2;
        this.player.visualRoot.rotation.y = -Math.PI / 2;

        this.cameraManager.snapTo(new Vector3(21.2, 1.2, 2.0), -Math.PI * 0.45, 9.5);
      }
    }

    // Stabilisation technique de la première frame de rendu
    await new Promise((resolve) => setTimeout(resolve, 60));

    // 3. Réapparition progressive (fade from black)
    await this.ui.fadeFromBlack(380);

    this.transitionCooldown = 1.2; // Délai de sécurité anti-rebond
    this.isTransitioning = false;
    this.input.flush();
    this.state = GameState.PLAYING;
  }

  startLoop() {
    this.engine.runRenderLoop(() => {
      // 1. Calcul du deltaTime plafonné (Math.min(dt, 0.05)) pour éviter tout saut de collision
      const rawDt = this.engine.getDeltaTime() / 1000;
      const dt = Math.min(rawDt, 0.05);

      // 2. Mise à jour des entrées utilisateur
      this.input.update();

      // 3. Gestion des états
      if (this.state === GameState.TITLE) {
        // Navigation clavier du menu titre gérée directement par UIManager.setupKeyboardNavigation
      } else if (this.state === GameState.SETTINGS) {
        if (this.input.consumePause() || this.input.isKeyJustPressed('Backspace')) {
          this.closeSettings();
        }
      } else if (this.state === GameState.QUIT_CONFIRM) {
        if (this.input.consumePause()) {
          this.closeQuitModal();
        }
      } else if (this.state === GameState.QUIT_GOODBYE) {
        if (this.input.consumePause() || this.input.isKeyJustPressed('Enter')) {
          this.returnToTitle();
        }
      } else if (this.state === GameState.TRANSITION) {
        // En transition : figer le joueur mais continuer le rendu propre
      } else if (this.state === GameState.PLAYING) {
        this.updatePlaying(dt);
      } else if (this.state === GameState.PAUSED) {
        if (this.input.consumePause()) {
          this.resumeGame();
        }
      } else if (this.state === GameState.GAMEOVER) {
        if (this.input.consumeAttack() || this.input.consumeInteract()) {
          this.respawnPlayer();
        }
      }

      // 4. Statistiques de performance
      if (import.meta.env.DEV) {
        this.ui.updateDevStats(this.engine.getFps());
      }

      // 5. Rendu de la scène 3D
      this.scene.render();

      // 6. Sauvegarde des touches en fin de frame pour détection de front montant
      this.input.postUpdate();
    });
  }

  updatePlaying(dt) {
    // 0. Détection des déclencheurs de transition de zone (Caverne / Plaine)
    if (this.transitionCooldown > 0) {
      this.transitionCooldown -= dt;
    } else if (!this.isTransitioning) {
      const pPos = this.player.getPosition();
      if (this.currentZone === 'plaine') {
        // Seuil d'entrée de la Caverne à l'Est (X >= 24.5, Z entre 0.8 et 3.2)
        if (pPos.x >= 24.5 && pPos.z >= 0.8 && pPos.z <= 3.2) {
          this.switchZone('cavern');
          return;
        }
        // Seuil d'entrée de la Forêt Sacrée à l'Ouest (une fois la grille ouverte)
        if (this.saveData.westGateOpen && pPos.x <= -24.5 && pPos.z >= 0.8 && pPos.z <= 3.2) {
          this.switchZone('forest');
          return;
        }
      } else if (this.currentZone === 'cavern') {
        // Seuil de sortie de la Caverne à l'Ouest (X <= 181.2, Z entre -2.4 et 2.4)
        if (pPos.x <= 181.2 && pPos.z >= -2.4 && pPos.z <= 2.4) {
          this.switchZone('plaine');
          return;
        }
      } else if (this.currentZone === 'forest') {
        // Seuil de sortie de la Forêt Sacrée à l'Est (X >= -181.2, Z entre -2.6 et 2.6)
        if (pPos.x >= -181.2 && pPos.z >= -2.6 && pPos.z <= 2.6) {
          this.switchZone('plaine');
          return;
        }
      }
    }

    // A. Pause
    if (this.input.consumePause()) {
      this.pauseGame();
      return;
    }

    // B. Attaque à l'épée
    if (this.input.consumeAttack()) {
      const swung = this.player.attack();
      if (swung) {
        if (this.currentZone === 'plaine') {
          // Test de collision avec les buissons, ronces, mannequin et l'environnement de la plaine
          this.level.checkSwordHits(
            this.player.getPosition(),
            this.player.facingAngle,
            this.player.weapon,
            this.cameraManager
          );
        } else if (this.currentZone === 'cavern') {
          // Test de frappe d'épée contre les torches de la caverne
          this.cave.checkSwordHits(
            this.player.getPosition(),
            this.player.facingAngle,
            this.player.weapon,
            this.cameraManager,
            this.audio
          );
        }
      }
    }

    // C. Esquive / Roulade (K)
    if (this.input.consumeDodge()) {
      this.player.dodge(this.input.moveVector);
    }

    // D. Mise à jour du joueur
    this.player.update(this.input, dt);

    // E. Vérification de défaite (Game Over)
    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    // F. Mise à jour des objets du niveau selon la zone
    if (this.currentZone === 'plaine') {
      this.level.update(dt, this.player);
    } else if (this.currentZone === 'cavern') {
      this.cave.update(dt, this.player, this.cameraManager, this.audio, this.collision);
    } else if (this.currentZone === 'forest') {
      this.forest.update(dt);
    }

    // G. Mise à jour de la caméra intelligente semi-contrainte
    if (this.input.consumeRecenter()) {
      this.cameraManager.recenter(this.player.facingAngle);
    }
    const cameraInput = this.input.consumeCameraInput();
    this.cameraManager.update(
      this.player.getPosition(),
      this.player.facingAngle,
      this.player.isMoving,
      cameraInput,
      dt
    );

    // H. Détection des interactions environnementales (Coffre, Grille Ouest)
    const nearest = this.currentZone === 'plaine'
      ? this.level.getNearestInteractable(this.player.getPosition(), this.player.facingAngle)
      : this.currentZone === 'cavern'
        ? this.cave.getNearestInteractable(this.player.getPosition(), this.player.facingAngle)
        : null;

    if (nearest) {
      this.ui.updateInteractionPrompt(nearest.position, nearest.promptText);

      // Si le joueur appuie sur [E]
      if (this.input.consumeInteract()) {
        if (typeof nearest.onInteract === 'function') {
          nearest.onInteract();
        }
        this.ui.hideInteractionPrompt();
      }
    } else {
      this.ui.hideInteractionPrompt();
    }

    // I. Mise à jour de l'UI (HUD)
    this.ui.updateHealth(this.player.health);
    this.ui.updateLightGauge(this.player.lightGauge, this.player.isTorchMode);
    this.ui.updateKeys(this.saveData.simpleKey, this.saveData.bossKey);
  }
}
