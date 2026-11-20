/**
 * InputManager.js — Gestionnaire universel d'entrées clavier & manette.
 * Conforme à AGENT.md : Support natif ZQSD (AZERTY), WASD (QWERTY) et Flèches directionnelles sans configuration.
 */
export class InputManager {
  constructor() {
    this.keys = new Map();
    this.previousKeys = new Map();

    this.mouse = {
      leftDown: false,
      rightDown: false,
      leftPressed: false,
      rightPressed: false
    };

    this.moveVector = { x: 0, z: 0 };
    this.attackPressed = false;
    this.torchHeld = false;
    this.dodgePressed = false;
    this.interactPressed = false;
    this.pausePressed = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
  }

  onContextMenu(e) {
    // Empêcher l'ouverture du menu contextuel au clic droit (utilisé pour la lumière/torche)
    e.preventDefault();
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
  }

  onKeyUp(e) {
    this.keys.set(e.code, false);
  }

  onMouseDown(e) {
    if (e.button === 0) {
      this.mouse.leftDown = true;
      this.mouse.leftPressed = true;
      this.attackPressed = true;
    } else if (e.button === 2) {
      this.mouse.rightDown = true;
      this.mouse.rightPressed = true;
    }
  }

  onMouseUp(e) {
    if (e.button === 0) {
      this.mouse.leftDown = false;
    } else if (e.button === 2) {
      this.mouse.rightDown = false;
    }
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

    // Sauvegarde de l'état précédent pour détection de front montant
    for (const [code, val] of this.keys.entries()) {
      this.previousKeys.set(code, val);
    }
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
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
}
