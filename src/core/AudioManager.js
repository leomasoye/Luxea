/**
 * AudioManager.js — Gestionnaire audio du jeu Luxea.
 * Sons désactivés temporairement selon la demande du joueur en attendant l'intégration des assets sonores définitifs.
 */
export class AudioManager {
  constructor() {
    this.isMuted = true;
    this.initialized = false;
  }

  init() {
    this.initialized = true;
  }

  unlock() {
    this.initialized = true;
  }

  toggleMute() {
    return false;
  }

  setMuted() {}

  playStep() {}
  playSwordSwing() {}
  playSwordLightBurst() {}
  playBushCut() {}
  playRoll() {}
  playHeartPickup() {}
  playDoorKnock() {}
  playDialogueLetter() {}
  playHurt() {}
  playTorchIgnite() {}
  playGameOver() {}
  startAmbientDrone() {}
}
