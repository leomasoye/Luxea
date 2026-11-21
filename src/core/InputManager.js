/**
 * InputManager.js — Gestionnaire universel d'entrées clavier, souris & manette.
 * Conforme à AGENT.md :
 * - Support natif ZQSD (AZERTY), WASD (QWERTY) et Flèches directionnelles sans configuration.
 * - Support de la rotation caméra intelligente à la souris (Clic Droit ou Clic Molette maintenu).
 * - Zoom caméra à la molette.
 * - Recentrage caméra (Touche R ou R3 manette).
 */
export class InputManager {
  constructor() {
    this.keys = new Map();
    this.previousKeys = new Map();

    this.mouse = {
      leftDown: false,
      rightDown: false,
      middleDown: false,
      leftPressed: false,
      rightPressed: false,
      middlePressed: false
    };

    // Deltas de déplacement et zoom caméra
    this.cameraDeltaX = 0;
    this.cameraDeltaY = 0;
    this.cameraZoomDelta = 0;
    this.lastMouseX = null;
    this.lastMouseY = null;

    this.moveVector = { x: 0, z: 0 };
    this.attackPressed = false;
    this.torchHeld = false;
    this.dodgePressed = false;
    this.interactPressed = false;
    this.pausePressed = false;
    this.recenterPressed = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    // Utilisation de pointerdown / pointerup en phase de capture pour contourner l'interception de canvas par Babylon.js
    window.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    window.addEventListener('pointerup', this.onPointerUp, { capture: true });
    window.addEventListener('pointermove', this.onPointerMove, { capture: true });
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown, { capture: true });
    window.removeEventListener('pointerup', this.onPointerUp, { capture: true });
    window.removeEventListener('pointermove', this.onPointerMove, { capture: true });
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('contextmenu', this.onContextMenu);
  }

  isUIEvent(e) {
    if (!e || !e.target) return false;
    // Clic sur un bouton ou élément d'interface utilisateur (modal, pause, HUD)
    return !!(e.target.closest && e.target.closest('button, .menu-modal, .interactive, #hud, #dialogue-container'));
  }

  onContextMenu(e) {
    // Empêcher l'ouverture du menu contextuel au clic droit (utilisé pour la caméra et la lumière/torche)
    e.preventDefault();
  }

  onPointerDown(e) {
    // Si le clic s'est produit sur un élément d'interface (bouton menu, dialogue), ne pas attaquer en jeu
    if (this.isUIEvent(e)) return;

    if (e.button === 0) {
      this.mouse.leftDown = true;
      this.mouse.leftPressed = true;
      this.attackPressed = true;
    } else if (e.button === 1) {
      // Clic molette pour rotation caméra
      this.mouse.middleDown = true;
      this.mouse.middlePressed = true;
      e.preventDefault();
    } else if (e.button === 2) {
      this.mouse.rightDown = true;
      this.mouse.rightPressed = true;
      this.torchHeld = true;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  onPointerUp(e) {
    if (e.button === 0) {
      this.mouse.leftDown = false;
    } else if (e.button === 1) {
      this.mouse.middleDown = false;
    } else if (e.button === 2) {
      this.mouse.rightDown = false;
    }
  }

  onPointerMove(e) {
    if (this.mouse.rightDown || this.mouse.middleDown) {
      let dx = e.movementX;
      let dy = e.movementY;

      // Fallback si movementX/Y n'est pas fourni par le navigateur
      if (dx === undefined || dy === undefined || (dx === 0 && dy === 0 && this.lastMouseX !== null)) {
        if (this.lastMouseX !== null && this.lastMouseY !== null) {
          dx = e.clientX - this.lastMouseX;
          dy = e.clientY - this.lastMouseY;
        } else {
          dx = 0;
          dy = 0;
        }
      }

      this.cameraDeltaX += dx;
      this.cameraDeltaY += dy;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  onWheel(e) {
    // Zoom / Dézoom caméra
    if (Math.abs(e.deltaY) > 0) {
      this.cameraZoomDelta += Math.sign(e.deltaY);
    }
  }

  onKeyDown(e) {
    this.keys.set(e.code, true);

    // Raccourcis directs non répétitifs
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!this.previousKeys.get(e.code)) {
        this.pausePressed = true;
      }
    }

    if (e.code === 'KeyE') {
      if (!this.previousKeys.get(e.code)) {
        this.interactPressed = true;
      }
    }

    if (e.code === 'Space' || e.code === 'KeyJ') {
      if (!this.previousKeys.get(e.code)) {
        this.attackPressed = true;
      }
    }

    if (e.code === 'KeyK') {
      if (!this.previousKeys.get(e.code)) {
        this.dodgePressed = true;
      }
    }

    // Recentrage rapide de la caméra (R)
    if (e.code === 'KeyR') {
      if (!this.previousKeys.get(e.code)) {
        this.recenterPressed = true;
      }
    }
  }

  onKeyUp(e) {
    this.keys.set(e.code, false);
  }

  isKeyDown(code) {
    return !!this.keys.get(code);
  }

  isKeyJustPressed(code) {
    return !!this.keys.get(code) && !this.previousKeys.get(code);
  }

  update() {
    // 1. Détection des déplacements (AZERTY: ZQSD, QWERTY: WASD, Flèches)
    let forward = 0;
    let sideways = 0;

    // Avancer (Z / W / Flèche Haut)
    if (this.isKeyDown('KeyW') || this.isKeyDown('KeyZ') || this.isKeyDown('ArrowUp')) {
      forward += 1;
    }
    // Reculer (S / Flèche Bas)
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) {
      forward -= 1;
    }
    // Gauche (A / Q / Flèche Gauche)
    if (this.isKeyDown('KeyA') || this.isKeyDown('KeyQ') || this.isKeyDown('ArrowLeft')) {
      sideways -= 1;
    }
    // Droite (D / Flèche Droite)
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) {
      sideways += 1;
    }

    // Support Gamepad API
    const gamepad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gamepad) {
      const stickX = Math.abs(gamepad.axes[0]) > 0.15 ? gamepad.axes[0] : 0;
      const stickY = Math.abs(gamepad.axes[1]) > 0.15 ? -gamepad.axes[1] : 0;

      if (stickX !== 0 || stickY !== 0) {
        sideways = stickX;
        forward = stickY;
      }

      // Stick droit manette pour rotation caméra
      const rightStickX = Math.abs(gamepad.axes[2]) > 0.15 ? gamepad.axes[2] : 0;
      const rightStickY = Math.abs(gamepad.axes[3]) > 0.15 ? gamepad.axes[3] : 0;
      if (rightStickX !== 0 || rightStickY !== 0) {
        this.cameraDeltaX += rightStickX * 14;
        this.cameraDeltaY += rightStickY * 14;
      }

      // Clic Stick Droit (R3) = Recentrage caméra
      if (gamepad.buttons[11]?.pressed && !this.gamepadPrevR3) {
        this.recenterPressed = true;
      }
      this.gamepadPrevR3 = gamepad.buttons[11]?.pressed;

      // Bouton A / X (Xbox/PS) = Attaque
      if (gamepad.buttons[0]?.pressed && !this.gamepadPrevA) {
        this.attackPressed = true;
      }
      this.gamepadPrevA = gamepad.buttons[0]?.pressed;

      // Bouton B = Esquive
      if (gamepad.buttons[1]?.pressed && !this.gamepadPrevB) {
        this.dodgePressed = true;
      }
      this.gamepadPrevB = gamepad.buttons[1]?.pressed;

      // Gâchette droite ou Y = Mode Torche
      if (gamepad.buttons[7]?.pressed || gamepad.buttons[3]?.pressed) {
        this.torchHeld = true;
      }
    }

    // Normalisation de la vitesse en diagonale
    const length = Math.sqrt(sideways * sideways + forward * forward);
    if (length > 0) {
      this.moveVector.x = sideways / length;
      this.moveVector.z = forward / length;
    } else {
      this.moveVector.x = 0;
      this.moveVector.z = 0;
    }

    // Mode Torche (Shift maintenu ou Clic Droit)
    this.torchHeld = this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight') || this.mouse.rightDown;

    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.mouse.middlePressed = false;
  }

  // Sauvegarde de l'état précédent en fin de boucle de jeu pour détection de front montant
  postUpdate() {
    for (const [code, val] of this.keys.entries()) {
      this.previousKeys.set(code, val);
    }
  }

  // Consomme le signal d'attaque (évite les répétitions non voulues)
  consumeAttack() {
    const val = this.attackPressed;
    this.attackPressed = false;
    return val;
  }

  consumeDodge() {
    const val = this.dodgePressed;
    this.dodgePressed = false;
    return val;
  }

  consumeInteract() {
    const val = this.interactPressed;
    this.interactPressed = false;
    return val;
  }

  consumePause() {
    const val = this.pausePressed;
    this.pausePressed = false;
    return val;
  }

  // Consomme les deltas caméra cumulés
  consumeCameraInput() {
    const delta = {
      deltaX: this.cameraDeltaX,
      deltaY: this.cameraDeltaY,
      zoomDelta: this.cameraZoomDelta
    };
    this.cameraDeltaX = 0;
    this.cameraDeltaY = 0;
    this.cameraZoomDelta = 0;
    return delta;
  }

  // Consomme le déclenchement de recentrage caméra
  consumeRecenter() {
    const val = this.recenterPressed;
    this.recenterPressed = false;
    return val;
  }

  // Réinitialise tous les états transitoires (clics en attente, entrées résiduelles après un clic UI)
  flush() {
    this.attackPressed = false;
    this.dodgePressed = false;
    this.interactPressed = false;
    this.pausePressed = false;
    this.recenterPressed = false;
    this.cameraDeltaX = 0;
    this.cameraDeltaY = 0;
    this.cameraZoomDelta = 0;
    this.mouse.leftDown = false;
    this.mouse.rightDown = false;
    this.mouse.middleDown = false;
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.mouse.middlePressed = false;
  }
}
