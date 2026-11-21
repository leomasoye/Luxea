import { Vector3 } from '@babylonjs/core';

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
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnPauseSound = document.getElementById('btn-pause-sound');
    this.btnResetGame = document.getElementById('btn-reset-game');
    this.btnRespawn = document.getElementById('btn-respawn');

    this.devStats = document.getElementById('dev-stats');

    this.tempVector = new Vector3();
    this.isDialogueActive = false;
    this.dialogueCallback = null;
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
    const slotSimple = document.getElementById('slot-simple-key');
    const slotBoss = document.getElementById('slot-boss-key');

    if (this.iconSimpleKey) {
      if (simpleKey) {
        this.iconSimpleKey.classList.add('acquired');
        slotSimple?.classList.add('acquired');
      } else {
        this.iconSimpleKey.classList.remove('acquired');
        slotSimple?.classList.remove('acquired');
      }
    }

    if (this.iconBossKey) {
      if (bossKey) {
        this.iconBossKey.classList.add('acquired');
        slotBoss?.classList.add('acquired');
      } else {
        this.iconBossKey.classList.remove('acquired');
        slotBoss?.classList.remove('acquired');
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

    // Projection 3D -> 2D
    const projected = Vector3.Project(
      targetWorldPos,
      camera.getWorldMatrix(),
      this.scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );

    // Si l'objet est devant la caméra (z > 0)
    if (projected.z > 0) {
      // Conversion coordonnées réelles écran en tenant compte du devicePixelRatio
      const scale = engine.getHardwareScalingLevel ? 1 / engine.getHardwareScalingLevel() : 1;
      const x = projected.x * scale;
      const y = (projected.y * scale) - 35; // Décalage de 35px vers le haut de l'objet

      this.interactionPrompt.style.left = `${x}px`;
      this.interactionPrompt.style.top = `${y}px`;
      this.interactionPrompt.textContent = promptText;
      this.interactionPrompt.style.display = 'block';
    } else {
      this.interactionPrompt.style.display = 'none';
    }
  }

  hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
  }

  // Contrôles des fenêtres modales
  showTitleScreen() {
    if (this.titleScreen) this.titleScreen.style.display = 'flex';
  }

  hideTitleScreen() {
    if (this.titleScreen) this.titleScreen.style.display = 'none';
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
    const html = `<span class="cursor-arrow">►</span> Son : ${isMuted ? 'Désactivé' : 'Activé'}`;
    if (this.btnSoundToggle) this.btnSoundToggle.innerHTML = html;
    if (this.btnPauseSound) this.btnPauseSound.innerHTML = html;
  }

  updateDevStats(fps) {
    if (this.devStats) {
      this.devStats.textContent = `${Math.round(fps)} FPS`;
    }
  }
}
