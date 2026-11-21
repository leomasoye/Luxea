import { Vector3, ArcRotateCamera } from '@babylonjs/core';

/**
 * CameraManager.js — Caméra zénithale / isométrique rétro 3/4.
 * Conforme à GDD.md : Vue plongeante ~45°, suivi lissé (Lerp) de Zelya,
 * secousse d'écran (screen shake) rétro et bornage de la plaine.
 */
export class CameraManager {
  constructor(scene, canvas) {
    this.scene = scene;
    this.canvas = canvas;
    this.camera = null;

    // Cible lissée
    this.targetPosition = new Vector3(0, 1, 0);
    this.smoothedTarget = new Vector3(0, 1, 0);

    // Paramètres de secousse d'écran (screen shake)
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;

    // Bornes de la Plaine d'Éveil (pour ne pas voir le vide)
    this.bounds = {
      minX: -26,
      maxX: 26,
      minZ: -24,
      maxZ: 28
    };

    this.init();
  }

  init() {
    // Vue 3/4 rétro : alpha (angle horizontal ~45° ou zénithal), beta (~50° par rapport à la verticale), radius (~24)
    const alpha = -Math.PI / 2; // Regard vers le Nord
    const beta = Math.PI / 3.4; // Angle plongeant rétro ~53°
    const radius = 22;

    this.camera = new ArcRotateCamera(
      'RetroCamera',
      alpha,
      beta,
      radius,
      this.smoothedTarget,
      this.scene
    );

    // Verrouillage des contrôles manuels de caméra (vue fixe rétro type Zelda)
    this.camera.lowerBetaLimit = beta;
    this.camera.upperBetaLimit = beta;
    this.camera.lowerAlphaLimit = alpha;
    this.camera.upperAlphaLimit = alpha;
    this.camera.lowerRadiusLimit = radius;
    this.camera.upperRadiusLimit = radius;

    // Champ de vision (FOV) resserré pour un aspect rétro isométrique net
    this.camera.fov = 0.65;
  }

  // Déclenche une secousse de caméra lors d'un coup réussi ou dégât
  shake(intensity = 0.25, duration = 0.18) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  // Recentre instantanément la caméra sur une position (sans lerp)
  snapTo(targetPos) {
    if (!targetPos || !this.camera) return;
    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetPos.x));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, targetPos.z));

    this.targetPosition.set(clampedX, 1.2, clampedZ);
    this.smoothedTarget.copyFrom(this.targetPosition);
    this.camera.setTarget(this.smoothedTarget);
    this.shakeTimer = 0;
  }

  update(playerPos, dt) {
    if (!playerPos || !this.camera) return;

    // Bornage de la position cible dans les limites de la plaine
    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, playerPos.x));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, playerPos.z));

    this.targetPosition.set(clampedX, 1.2, clampedZ);

    // Suivi lissé (Lerp) sans saccades (vitesse d'interpolation réactive)
    const lerpFactor = Math.min(1.0, dt * 7.5);
    Vector3.LerpToRef(this.smoothedTarget, this.targetPosition, lerpFactor, this.smoothedTarget);

    // Gestion du screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * progress;

      const shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      const shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;

      this.camera.setTarget(
        new Vector3(
          this.smoothedTarget.x + shakeOffsetX,
          this.smoothedTarget.y + shakeOffsetY,
          this.smoothedTarget.z
        )
      );
    } else {
      this.camera.setTarget(this.smoothedTarget);
    }
  }
}
