import { Scene } from '@babylonjs/core';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { CameraManager } from '../rendering/CameraManager.js';
import { LightingManager } from '../rendering/LightingManager.js';
import { EnvironmentManager } from '../world/EnvironmentManager.js';
import { LevelManager } from '../world/LevelManager.js';
import { CollisionManager } from '../world/CollisionManager.js';
import { Player } from '../entities/Player.js';
import { UIManager } from '../ui/UIManager.js';

export const GameState = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  DIALOGUE: 'DIALOGUE',
  PAUSED: 'PAUSED',
  SETTINGS: 'SETTINGS',
  QUIT_CONFIRM: 'QUIT_CONFIRM',
  QUIT_GOODBYE: 'QUIT_GOODBYE',
  GAMEOVER: 'GAMEOVER'
};

/**
 * GameManager.js — Cœur logique du jeu Luxea.
 * Conforme à AGENT.md & GDD.md :
 * - Scène unique continue Babylon.js.
 * - Machine à états (Titre -> Jeu -> Pause -> Dialogue -> Défaite/Respawn).
 * - Boucle de jeu découplée avec deltaTime plafonné.
 * - Intégration de la mécanique de lumière et du combat d'épée.
 */
export class GameManager {
  constructor(engine, canvas) {
    this.engine = engine;
    this.canvas = canvas;
    this.scene = new Scene(this.engine);

    this.state = GameState.TITLE;

    // Gestionnaires de sous-systèmes
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.saveData = SaveManager.load();

    this.cameraManager = new CameraManager(this.scene, this.canvas);
    this.lightingManager = new LightingManager(this.scene);
    this.collision = new CollisionManager();
    this.environment = new EnvironmentManager(this.scene);
    this.level = new LevelManager(this.scene, this.audio, this.saveData);

    // Initialisation des hitboxes (murs, falaises, arbres, buissons, panneau, portes)
    this.environment.initColliders(this.collision);
    this.level.initColliders(this.collision);

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
    if (this.state === GameState.PLAYING || this.state === GameState.DIALOGUE) {
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

  respawnPlayer() {
    this.player.reset(0, 0, -4);
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
    this.ui.hideDialogue();
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
      } else if (this.state === GameState.PLAYING) {
        this.updatePlaying(dt);
      } else if (this.state === GameState.DIALOGUE) {
        this.updateDialogue(dt);
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
    // A. Pause
    if (this.input.consumePause()) {
      this.pauseGame();
      return;
    }

    // B. Attaque à l'épée
    if (this.input.consumeAttack()) {
      const swung = this.player.attack();
      if (swung) {
        // Test de collision avec les buissons et l'environnement
        this.level.checkSwordHits(
          this.player.getPosition(),
          this.player.facingAngle,
          this.player.weapon
        );
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

    // F. Mise à jour des objets du niveau (pickups de cœurs, portes)
    this.level.update(dt, this.player);

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

    // H. Détection des interactions environnementales (Portes, Panneau, Caverne)
    const nearest = this.level.getNearestInteractable(this.player.getPosition(), this.player.facingAngle);
    if (nearest) {
      this.ui.updateInteractionPrompt(nearest.position, nearest.promptText);

      // Si le joueur appuie sur [E] ou [Espace] (hors combat)
      if (this.input.consumeInteract()) {
        this.openDialogue(nearest);
      }
    } else {
      this.ui.hideInteractionPrompt();
    }

    // I. Mise à jour de l'UI (HUD)
    this.ui.updateHealth(this.player.health);
    this.ui.updateLightGauge(this.player.lightGauge, this.player.isTorchMode);
    this.ui.updateKeys(this.saveData.simpleKey, this.saveData.bossKey);
  }

  updateDialogue(dt) {
    // La caméra continue de cadrer la scène et peut pivoter
    if (this.input.consumeRecenter()) {
      this.cameraManager.recenter(this.player.facingAngle);
    }
    const cameraInput = this.input.consumeCameraInput();
    this.cameraManager.update(
      this.player.getPosition(),
      this.player.facingAngle,
      false,
      cameraInput,
      dt
    );

    // [E] ou [Espace] pour fermer / avancer le dialogue
    if (this.input.consumeInteract() || this.input.consumeAttack()) {
      this.closeDialogue();
    }
  }

  openDialogue(interactable) {
    this.state = GameState.DIALOGUE;
    this.ui.hideInteractionPrompt();

    const text = typeof interactable.getText === 'function' ? interactable.getText() : interactable.text;
    this.audio.playDialogueLetter();
    this.ui.showDialogue(interactable.speaker || 'Mystère', text);
  }

  closeDialogue() {
    this.ui.hideDialogue();
    this.input.flush();
    this.state = GameState.PLAYING;
  }
}
