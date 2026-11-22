import { Vector3, ArcRotateCamera, Ray } from '@babylonjs/core';

/**
 * CameraManager.js — Caméra orbitale intelligente style Zelda.
 * - Suivi automatique par défaut dans le dos du personnage (comme dans Zelda).
 * - Orientation fluide en temps réel lors des déplacements.
 * - Débrayage manuel complet lors du contrôle à la souris (Clic Droit ou Molette maintenu).
 * - Reprise automatique du suivi dans le dos une fois le contrôle manuel relâché et en mouvement.
 * - Angle de plongée rétro sécurisé (Beta borné entre 43° et 66° pour préserver la lisibilité).
 * - Zoom/dézoom à la molette.
 * - Recentrage instantané / rapide (Touche R).
 * - Gestion automatique de l'occlusion des arbres et falaises (Raycast).
 * - Secousse d'écran (screen shake) lors des impacts et dégâts.
 */
export class CameraManager {
  constructor(scene, canvas) {
    this.scene = scene;
    this.canvas = canvas;
    this.camera = null;

    // Cible lissée et anticipation
    this.targetPosition = new Vector3(0, 1.2, 0);
    this.smoothedTarget = new Vector3(0, 1.2, 0);
    this.leadOffset = new Vector3(0, 0, 0);

    // Paramètres d'angles et zoom (vue immersive plus proche du sol et de Zelya)
    this.minBeta = Math.PI / 3.6;      // ~50° angle plongeant maximal (vue légèrement plus haute)
    this.maxBeta = Math.PI / 2.25;     // ~80° angle plongeant minimal (près du sol)
    this.defaultBeta = Math.PI / 2.65; // ~68° angle d'aventure immersif proche du sol
    this.defaultAlpha = -Math.PI / 2;  // Regard initial vers le Nord (dans le dos de Zelya)
    this.minRadius = 9;
    this.maxRadius = 24;
    this.defaultRadius = 16.0;

    this.currentAlpha = this.defaultAlpha;
    this.targetAlpha = this.defaultAlpha;
    this.currentBeta = this.defaultBeta;
    this.targetBeta = this.defaultBeta;
    this.currentRadius = this.defaultRadius;
    this.targetRadius = this.defaultRadius;

    // Sensibilité des contrôles souris
    this.mouseSensitivityX = 0.0042;
    this.mouseSensitivityY = 0.0032;
    this.zoomStep = 1.6;

    // Contrôle manuel & reprise auto-follow
    this.manualOverrideTimer = 0;
    this.isSnappingRecenter = false;

    // Paramètres de secousse d'écran (screen shake)
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;

    // Bornes de la Plaine d'Éveil
    this.bounds = {
      minX: -26,
      maxX: 26,
      minZ: -24,
      maxZ: 28
    };

    // Gestion d'occlusion (transparence dynamique des obstacles interposés)
    this.occludedMeshes = new Set();

    this.init();
  }

  init() {
    this.camera = new ArcRotateCamera(
      'RetroSmartCamera',
      this.currentAlpha,
      this.currentBeta,
      this.currentRadius,
      this.smoothedTarget,
      this.scene
    );

    // Bornes d'élévation verticale (Beta) et distance (Radius)
    this.camera.lowerBetaLimit = this.minBeta;
    this.camera.upperBetaLimit = this.maxBeta;
    this.camera.lowerRadiusLimit = this.minRadius;
    this.camera.upperRadiusLimit = this.maxRadius;

    // Alpha libre à 360°
    this.camera.lowerAlphaLimit = null;
    this.camera.upperAlphaLimit = null;

    // Champ de vision (FOV) net rétro isométrique
    this.camera.fov = 0.65;
  }

  /**
   * Calcule la différence d'angle la plus courte entre deux angles en radians (gère le franchissement de +/- PI).
   */
  static angleDiff(target, current) {
    let diff = (target - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  /**
   * Retourne l'angle horizontal actuel de la caméra.
   */
  getHorizontalAngle() {
    return this.camera ? this.camera.alpha : this.currentAlpha;
  }

  /**
   * Convertit un vecteur d'entrée écran (screenX: gauche/droite, screenZ: bas/haut)
   * en vecteur de déplacement monde 3D (X/Z) projeté selon l'orientation de la caméra.
   */
  getWorldDirection(screenX, screenZ) {
    if (!this.camera || (screenX === 0 && screenZ === 0)) {
      return { x: screenX, z: screenZ };
    }
    const alpha = this.camera.alpha;

    // Vecteur avant de la caméra sur le plan horizontal XZ
    const fx = -Math.cos(alpha);
    const fz = -Math.sin(alpha);

    // Vecteur droite de la caméra sur le plan horizontal XZ
    const rx = -Math.sin(alpha);
    const rz = Math.cos(alpha);

    const worldX = screenX * rx + screenZ * fx;
    const worldZ = screenX * rz + screenZ * fz;

    const len = Math.hypot(worldX, worldZ);
    if (len > 0) {
      return { x: worldX / len, z: worldZ / len };
    }
    return { x: 0, z: 0 };
  }

  /**
   * Recentre la caméra directement dans le dos de Zelya ou vers le Nord par défaut.
   */
  recenter(playerFacingAngle = null) {
    if (playerFacingAngle !== null && playerFacingAngle !== undefined) {
      // Dans notre projection, l'angle caméra situé exactement dans le dos du personnage :
      this.targetAlpha = -playerFacingAngle - Math.PI / 2;
    } else {
      this.targetAlpha = this.defaultAlpha;
    }
    this.targetBeta = this.defaultBeta;
    this.targetRadius = this.defaultRadius;
    this.manualOverrideTimer = 0;
    this.isSnappingRecenter = true;
  }

  // Déclenche une secousse de caméra fluide lors d'un coup réussi ou d'un dégât
  shake(intensity = 0.14, duration = 0.18) {
    this.shakeIntensity = Math.min(intensity, 0.22); // Plafond de sécurité pour éviter tout décrochage
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  // Recentre instantanément la caméra sur une position (sans lerp)
  snapTo(targetPos, alpha = null) {
    if (!targetPos || !this.camera) return;
    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetPos.x));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, targetPos.z));

    this.targetPosition.set(clampedX, 1.2, clampedZ);
    this.smoothedTarget.copyFrom(this.targetPosition);
    this.leadOffset.set(0, 0, 0);

    if (alpha !== null) {
      this.currentAlpha = alpha;
      this.targetAlpha = alpha;
      this.camera.alpha = alpha;
    }

    this.currentBeta = this.defaultBeta;
    this.targetBeta = this.defaultBeta;
    this.camera.beta = this.defaultBeta;

    this.currentRadius = this.defaultRadius;
    this.targetRadius = this.defaultRadius;
    this.camera.radius = this.defaultRadius;

    this.camera.setTarget(this.smoothedTarget);
    this.shakeTimer = 0;
    this.manualOverrideTimer = 0;
    this.isSnappingRecenter = false;
    this.restoreAllOcclusions();
  }

  /**
   * Gestion de l'occlusion : détecte les obstacles solides (arbres, falaises)
   * situés entre la caméra et Zelya et leur applique une transparence douce.
   */
  updateOcclusion() {
    if (!this.camera || !this.scene) return;

    const camPos = this.camera.position;
    const targetPos = this.smoothedTarget;
    const dir = targetPos.subtract(camPos);
    const dist = dir.length();
    if (dist <= 0.5) return;
    dir.normalize();

    // Raycast depuis la caméra vers Zelya
    const ray = new Ray(camPos, dir, dist - 0.4);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      if (!mesh || !mesh.name) return false;
      const name = mesh.name;
      // Ne pas masquer Zelya, son arme, le sol ou les sentiers
      if (name.startsWith('zelya') || name.startsWith('weapon') || name.startsWith('main_ground') || name.startsWith('path_')) {
        return false;
      }
      // Filtrer les feuillages, troncs d'arbres et bords de falaises
      return name.startsWith('tree_') || name.startsWith('cliff_') || name.startsWith('arch_');
    });

    const hitMesh = (hit && hit.hit && hit.pickedMesh) ? hit.pickedMesh : null;

    // Rétablir la pleine visibilité des objets qui ne masquent plus Zelya
    for (const mesh of this.occludedMeshes) {
      if (mesh !== hitMesh && !mesh.isDisposed()) {
        mesh.visibility = 1.0;
        this.occludedMeshes.delete(mesh);
      }
    }

    // Appliquer une transparence subtile à l'obstacle
    if (hitMesh) {
      hitMesh.visibility = 0.35;
      this.occludedMeshes.add(hitMesh);
    }
  }

  restoreAllOcclusions() {
    for (const mesh of this.occludedMeshes) {
      if (!mesh.isDisposed()) {
        mesh.visibility = 1.0;
      }
    }
    this.occludedMeshes.clear();
  }

  /**
   * Boucle de mise à jour de la caméra intelligente.
   */
  update(playerPos, playerFacingAngle = 0, isMoving = false, cameraInput = null, dt = 0.016) {
    if (!playerPos || !this.camera) return;

    // 1. Prise en compte des entrées manuelles de la souris
    let hadManualInput = false;
    if (cameraInput) {
      const { deltaX, deltaY, zoomDelta } = cameraInput;

      if (deltaX !== 0 || deltaY !== 0) {
        hadManualInput = true;
        this.targetAlpha += deltaX * this.mouseSensitivityX;
        this.targetBeta = Math.max(this.minBeta, Math.min(this.maxBeta, this.targetBeta + deltaY * this.mouseSensitivityY));
        this.manualOverrideTimer = 1.0; // Suspend l'auto-follow pendant 1s pour laisser le joueur orienter la vue
        this.isSnappingRecenter = false;
      }

      if (zoomDelta !== 0) {
        this.targetRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.targetRadius + zoomDelta * this.zoomStep));
      }
    }

    if (!hadManualInput && this.manualOverrideTimer > 0) {
      this.manualOverrideTimer = Math.max(0, this.manualOverrideTimer - dt);
    }

    // 2. Gestion de l'orientation de la caméra (Stabilité Zelda / Rétro 3D)
    // L'angle horizontal ne tourne PAS brusquement de lui-même quand le joueur recule ou change de direction.
    // L'orientation est contrôlée librement à la souris (Clic Droit / Molette) ou recentrée via [R].
    // Cela supprime définitivement les retournements à 180° inattendus et les inversions de touches.

    // 3. Interpolation lissée des angles et de la distance
    const alphaLerpSpeed = this.isSnappingRecenter ? 14.0 : 10.0;
    const alphaDiff = CameraManager.angleDiff(this.targetAlpha, this.currentAlpha);
    this.currentAlpha += alphaDiff * Math.min(1.0, dt * alphaLerpSpeed);
    if (this.isSnappingRecenter && Math.abs(alphaDiff) < 0.02) {
      this.currentAlpha = this.targetAlpha;
      this.isSnappingRecenter = false;
    }
    this.camera.alpha = this.currentAlpha;

    const betaDiff = this.targetBeta - this.currentBeta;
    this.currentBeta += betaDiff * Math.min(1.0, dt * 10.0);
    this.camera.beta = this.currentBeta;

    const radiusDiff = this.targetRadius - this.currentRadius;
    this.currentRadius += radiusDiff * Math.min(1.0, dt * 8.0);
    this.camera.radius = this.currentRadius;

    // Normalisation continue pour éviter tout débordement numérique
    while (this.currentAlpha > Math.PI) {
      this.currentAlpha -= Math.PI * 2;
      this.targetAlpha -= Math.PI * 2;
    }
    while (this.currentAlpha < -Math.PI) {
      this.currentAlpha += Math.PI * 2;
      this.targetAlpha += Math.PI * 2;
    }

    // 4. Centrage stable et doux sur le joueur (sans à-coups directionnels)
    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, playerPos.x));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, playerPos.z));

    this.targetPosition.set(clampedX, 1.2, clampedZ);

    // Suivi lissé (Lerp) de la position cible
    const lerpFactor = Math.min(1.0, dt * 7.5);
    Vector3.LerpToRef(this.smoothedTarget, this.targetPosition, lerpFactor, this.smoothedTarget);

    // 6. Gestion du screen shake (vibration harmonique orientée, sans téléportation aléatoire)
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);

      // Fréquence rapide produisant un tremblement mécanique net et continu
      const elapsed = this.shakeDuration - this.shakeTimer;
      const freq = 44.0;
      const waveLateral = Math.sin(elapsed * freq);
      const waveVertical = Math.cos(elapsed * freq * 0.75);
      const amp = this.shakeIntensity * Math.pow(progress, 1.25);

      // Décalage dans le plan de vue de la caméra (perpendiculaire à l'axe optique)
      const alpha = this.camera.alpha;
      const rx = -Math.sin(alpha);
      const rz = Math.cos(alpha);

      const shakeOffsetX = rx * (waveLateral * amp);
      const shakeOffsetZ = rz * (waveLateral * amp);
      const shakeOffsetY = waveVertical * (amp * 0.35);

      this.camera.setTarget(
        new Vector3(
          this.smoothedTarget.x + shakeOffsetX,
          this.smoothedTarget.y + shakeOffsetY,
          this.smoothedTarget.z + shakeOffsetZ
        )
      );
    } else {
      this.camera.setTarget(this.smoothedTarget);
    }

    // 7. Mise à jour de l'occlusion des obstacles
    this.updateOcclusion();
  }
}
