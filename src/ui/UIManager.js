import { Vector3, Matrix } from '@babylonjs/core';

/**
 * UIManager.js — Gestion de l'interface utilisateur en overlay HTML5/CSS3 pur.
 * Conforme à AGENT.md & GDD.md :
 * - Zéro dépendance sur @babylonjs/gui (~1.5 Mo d'économie de bundle).
 * - Cœurs rétro, Jauge de Lumière, Inventaire des Clés.
 * - Dialogue box en français.
 * - Projection 3D -> 2D (Vector3.Project) pour les étiquettes contextuelles flottantes.
 */
export class UIManager {
  constructor(scene) {
    this.scene = scene;

    // Éléments du DOM
    this.hearts = [
      document.getElementById('heart-0'),
      document.getElementById('heart-1'),
      document.getElementById('heart-2')
    ];
    this.lightBarFill = document.getElementById('light-bar-fill');
    this.iconSimpleKey = document.getElementById('icon-simple-key');
    this.iconBossKey = document.getElementById('icon-boss-key');

    this.interactionPrompt = document.getElementById('interaction-prompt');

    this.dialogueContainer = document.getElementById('dialogue-container');
    this.dialogueSpeaker = document.getElementById('dialogue-speaker');
    this.dialogueText = document.getElementById('dialogue-text');

    this.titleScreen = document.getElementById('title-screen');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('gameover-modal');

    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnTitleSettings = document.getElementById('btn-title-settings');
    this.btnTitleQuit = document.getElementById('btn-title-quit');
    this.titleMenuItems = Array.from(document.querySelectorAll('.btn-title-item'));

    this.settingsModal = document.getElementById('settings-modal');
    this.btnSettingsAudio = document.getElementById('btn-settings-audio');
    this.btnSettingsBack = document.getElementById('btn-settings-back');

    this.quitModal = document.getElementById('quit-modal');
    this.btnQuitConfirm = document.getElementById('btn-quit-confirm');
    this.btnQuitCancel = document.getElementById('btn-quit-cancel');
    this.quitGoodbyeScreen = document.getElementById('quit-goodbye-screen');
    this.btnQuitReturn = document.getElementById('btn-quit-return');

    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnPauseSettings = document.getElementById('btn-pause-settings');
    this.btnPauseSound = document.getElementById('btn-pause-sound');
    this.btnResetGame = document.getElementById('btn-reset-game');
    this.btnRespawn = document.getElementById('btn-respawn');

    this.devStats = document.getElementById('dev-stats');

    this.tempVector = new Vector3();
    this.isDialogueActive = false;
    this.dialogueCallback = null;
    this.titleSelectedIndex = 0;
    this.settingsFromPause = false;

    // Écouteur global clavier pour navigation instantanée dans les menus
    this.setupKeyboardNavigation();
    this.setTitleSelection(0);
  }

  setupKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      // 1. Navigation dans l'Écran Titre (Flèches Haut/Bas, W/S, Z/S et validation Entrée/Espace)
      const isTitleActive = this.titleScreen && this.titleScreen.style.display !== 'none';
      const isSettingsOpen = this.settingsModal && this.settingsModal.style.display !== 'none';
      const isQuitOpen = this.quitModal && this.quitModal.style.display !== 'none';
      const isGoodbyeOpen = this.quitGoodbyeScreen && this.quitGoodbyeScreen.style.display !== 'none';

      if (isTitleActive && !isSettingsOpen && !isQuitOpen && !isGoodbyeOpen) {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          this.navigateTitleMenu(1);
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyZ') {
          e.preventDefault();
          this.navigateTitleMenu(-1);
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.activateCurrentTitleMenu();
        }
      } else if (isSettingsOpen) {
        if (e.code === 'Escape' || e.code === 'Backspace') {
          e.preventDefault();
          this.btnSettingsBack?.click();
        }
      } else if (isQuitOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          this.btnQuitCancel?.click();
        } else if (e.code === 'Enter') {
          e.preventDefault();
          this.btnQuitConfirm?.click();
        }
      } else if (isGoodbyeOpen) {
        if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') {
          e.preventDefault();
          this.btnQuitReturn?.click();
        }
      }
    }, { capture: true });
  }

  // Met à jour l'affichage des 3 cœurs (6 PV max)
  updateHealth(health) {
    // 6 PV = 3 cœurs pleins
    // Chaque cœur vaut 2 PV
    for (let i = 0; i < 3; i++) {
      const heartEl = this.hearts[i];
      if (!heartEl) continue;

      const heartHp = health - (i * 2);
      if (heartHp >= 2) {
        heartEl.className = 'heart-icon'; // Plein
      } else if (heartHp === 1) {
        heartEl.className = 'heart-icon half'; // Demi-cœur
      } else {
        heartEl.className = 'heart-icon empty'; // Vide
      }
    }
  }

  // Met à jour la jauge de lumière de l'épée (0.0 à 1.0)
  updateLightGauge(ratio, isTorchMode) {
    if (!this.lightBarFill) return;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    this.lightBarFill.style.width = `${clampedRatio * 100}%`;

    if (isTorchMode) {
      this.lightBarFill.style.background = 'repeating-linear-gradient(90deg, #ffffff 0px, #ffffff 7px, #ffe066 7px, #ffe066 8px)';
    } else {
      this.lightBarFill.style.background = 'repeating-linear-gradient(90deg, #ffe066 0px, #ffe066 7px, #e5a800 7px, #e5a800 8px)';
    }
  }

  // Met à jour l'inventaire des clés
  updateKeys(simpleKey, bossKey) {
    if (this.iconSimpleKey) {
      if (simpleKey) {
        this.iconSimpleKey.classList.add('acquired');
      } else {
        this.iconSimpleKey.classList.remove('acquired');
      }
    }

    if (this.iconBossKey) {
      if (bossKey) {
        this.iconBossKey.classList.add('acquired');
      } else {
        this.iconBossKey.classList.remove('acquired');
      }
    }
  }

  // Affiche une boîte de dialogue narrative en français
  showDialogue(speaker, text, onComplete = null) {
    this.isDialogueActive = true;
    this.dialogueCallback = onComplete;

    if (this.dialogueSpeaker) this.dialogueSpeaker.textContent = speaker;
    if (this.dialogueText) this.dialogueText.textContent = text;
    if (this.dialogueContainer) this.dialogueContainer.style.display = 'block';
  }

  hideDialogue() {
    this.isDialogueActive = false;
    if (this.dialogueContainer) this.dialogueContainer.style.display = 'none';

    if (this.dialogueCallback) {
      const cb = this.dialogueCallback;
      this.dialogueCallback = null;
      cb();
    }
  }

  // Projette un point 3D du monde vers des coordonnées 2D d'écran
  updateInteractionPrompt(targetWorldPos, promptText) {
    if (!this.interactionPrompt) return;

    if (!targetWorldPos || !promptText) {
      this.interactionPrompt.style.display = 'none';
      return;
    }

    const engine = this.scene.getEngine();
    const camera = this.scene.activeCamera;
    if (!camera) return;

    // 1. Vérification que l'objet est strictement devant le plan de la caméra (view space)
    const viewMatrix = camera.getViewMatrix();
    const viewPos = Vector3.TransformCoordinates(targetWorldPos, viewMatrix);
    if (viewPos.z <= 0.1) {
      this.interactionPrompt.style.display = 'none';
      return;
    }

    // 2. Projection 3D monde -> 2D écran avec la matrice Identité (l'objet est déjà en coordonnées monde)
    const renderWidth = engine.getRenderWidth();
    const renderHeight = engine.getRenderHeight();
    const globalViewport = camera.viewport.toGlobal(renderWidth, renderHeight);

    const projected = Vector3.Project(
      targetWorldPos,
      Matrix.IdentityReadOnly || Matrix.Identity(),
      this.scene.getTransformMatrix(),
      globalViewport
    );

    // 3. Vérification des coordonnées à l'écran (doit être dans le champ visuel)
    const padding = 60;
    if (
      projected.z < 0 ||
      projected.z > 1.0 ||
      projected.x < -padding ||
      projected.x > renderWidth + padding ||
      projected.y < -padding ||
      projected.y > renderHeight + padding
    ) {
      this.interactionPrompt.style.display = 'none';
      return;
    }

    // Conversion coordonnées réelles écran en tenant compte du devicePixelRatio
    const scale = engine.getHardwareScalingLevel ? 1 / engine.getHardwareScalingLevel() : 1;
    const x = projected.x * scale;
    const y = (projected.y * scale) - 35; // Décalage de 35px vers le haut de l'objet

    this.interactionPrompt.style.left = `${x}px`;
    this.interactionPrompt.style.top = `${y}px`;
    this.interactionPrompt.textContent = promptText;
    this.interactionPrompt.style.display = 'block';
  }

  hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
  }

  // Navigation dans le menu Titre style Zelda
  setTitleSelection(index) {
    if (!this.titleMenuItems || this.titleMenuItems.length === 0) return;
    this.titleSelectedIndex = (index + this.titleMenuItems.length) % this.titleMenuItems.length;
    this.titleMenuItems.forEach((btn, idx) => {
      if (idx === this.titleSelectedIndex) {
        btn.classList.add('active-select');
      } else {
        btn.classList.remove('active-select');
      }
    });
  }

  navigateTitleMenu(direction) {
    this.setTitleSelection(this.titleSelectedIndex + direction);
  }

  activateCurrentTitleMenu() {
    if (this.titleMenuItems && this.titleMenuItems[this.titleSelectedIndex]) {
      this.titleMenuItems[this.titleSelectedIndex].click();
    }
  }

  // Contrôles des fenêtres modales
  showTitleScreen(replayAnimation = false) {
    if (this.titleScreen) {
      this.titleScreen.style.display = 'flex';
      if (replayAnimation) {
        const logo = this.titleScreen.querySelector('.title-logo-container');
        if (logo) {
          logo.style.animation = 'none';
          void logo.offsetHeight; // force reflow
          logo.style.animation = '';
        }
      }
      this.setTitleSelection(0);
    }
  }

  hideTitleScreen() {
    if (this.titleScreen) this.titleScreen.style.display = 'none';
  }

  showSettings(fromPause = false) {
    this.settingsFromPause = fromPause;
    if (this.settingsModal) this.settingsModal.style.display = 'flex';
  }

  hideSettings() {
    if (this.settingsModal) this.settingsModal.style.display = 'none';
    return this.settingsFromPause;
  }

  showQuitModal() {
    if (this.quitModal) this.quitModal.style.display = 'flex';
  }

  hideQuitModal() {
    if (this.quitModal) this.quitModal.style.display = 'none';
  }

  showQuitGoodbye() {
    if (this.quitModal) this.quitModal.style.display = 'none';
    if (this.quitGoodbyeScreen) this.quitGoodbyeScreen.style.display = 'flex';
  }

  hideQuitGoodbye() {
    if (this.quitGoodbyeScreen) this.quitGoodbyeScreen.style.display = 'none';
  }

  showPauseModal() {
    if (this.pauseModal) this.pauseModal.style.display = 'flex';
  }

  hidePauseModal() {
    if (this.pauseModal) this.pauseModal.style.display = 'none';
  }

  showGameOver() {
    if (this.gameOverModal) this.gameOverModal.style.display = 'flex';
  }

  hideGameOver() {
    if (this.gameOverModal) this.gameOverModal.style.display = 'none';
  }

  updateSoundButton(isMuted) {
    const html = `<span class="cursor-arrow">►</span> Son : ${isMuted ? 'Desactive' : 'Active'}`;
    if (this.btnSettingsAudio) this.btnSettingsAudio.innerHTML = html;
    if (this.btnPauseSound) this.btnPauseSound.innerHTML = html;
  }

  updateDevStats(fps) {
    if (this.devStats) {
      this.devStats.textContent = `${Math.round(fps)} FPS`;
    }
  }
}
