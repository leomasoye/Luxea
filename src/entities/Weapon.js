import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * Weapon.js — Épée courte de Zelya & mécanique de la Frappe Lumineuse.
 * Conforme à AGENT.md & GDD.md :
 * - Modèle low-poly original avec gemme lumineuse.
 * - Arc de cercle tranchant (sweep ~180°).
 * - Flash lumineux à l'impact.
 * - Hitbox circulaire sectorielle.
 */
export class Weapon {
  constructor(scene, parentNode) {
    this.scene = scene;
    this.parentNode = parentNode;

    this.root = new TransformNode('WeaponRoot', this.scene);
    this.root.parent = parentNode;

    this.bladeMesh = null;
    this.trailMesh = null;
    this.basePath = [];
    this.tipPath = [];
    this.tipNode = null;

    this.isSlashing = false;
    this.slashTimer = 0;
    this.slashDuration = 0.30; // Durée de l'animation d'attaque complète (windup + frappe + recovery)

    this.initMeshes();
  }

  initMeshes() {
    // 1. Matériaux de l'épée
    const steelMat = new StandardMaterial('mat_steel', this.scene);
    steelMat.diffuseColor = new Color3(0.88, 0.92, 0.98);
    steelMat.specularColor = new Color3(0.9, 0.9, 1.0);

    const goldMat = new StandardMaterial('mat_guard', this.scene);
    goldMat.diffuseColor = new Color3(0.9, 0.75, 0.2);
    goldMat.specularColor = new Color3(0.8, 0.6, 0.1);

    const gemMat = new StandardMaterial('mat_gem', this.scene);
    gemMat.diffuseColor = new Color3(0.4, 0.85, 1.0);
    gemMat.emissiveColor = new Color3(0.3, 0.7, 1.0);

    // 2. Poignée
    const handle = MeshBuilder.CreateCylinder('swordHandle', {
      height: 0.35,
      diameter: 0.08
    }, this.scene);
    handle.material = goldMat;
    handle.parent = this.root;
    handle.position.y = 0.15;

    // 3. Garde
    const guard = MeshBuilder.CreateBox('swordGuard', {
      width: 0.42,
      height: 0.08,
      depth: 0.12
    }, this.scene);
    guard.material = goldMat;
    guard.parent = this.root;
    guard.position.y = 0.35;

    // 4. Lame d'acier biseautée
    this.bladeMesh = MeshBuilder.CreateBox('swordBlade', {
      width: 0.16,
      height: 1.0,
      depth: 0.05
    }, this.scene);
    this.bladeMesh.material = steelMat;
    this.bladeMesh.parent = this.root;
    this.bladeMesh.position.y = 0.90;

    // 5. Gemme incrustée dans la garde (source de l'énergie lumineuse)
    const gem = MeshBuilder.CreateSphere('swordGem', {
      diameter: 0.12
    }, this.scene);
    gem.material = gemMat;
    gem.parent = this.root;
    gem.position.y = 0.35;
    gem.position.z = 0.05;

    // 6. Point d'attache de la lumière dynamique (pointe de l'épée)
    this.tipNode = new TransformNode('swordTip', this.scene);
    this.tipNode.parent = this.root;
    this.tipNode.position.y = 1.40;

    // 7. Sillage dynamique de lame lumineuse (Ruban 3D synchronisé sur la lame)
    this.initSlashTrail();

    // Position de repos au côté de Zelya
    this.setRestPose();
  }

  initSlashTrail() {
    const trailMat = new StandardMaterial('mat_sword_trail', this.scene);
    trailMat.diffuseColor = new Color3(1.0, 0.98, 0.65);
    trailMat.emissiveColor = new Color3(1.0, 0.88, 0.28); // Lueur dorée intense rétro
    trailMat.specularColor = new Color3(1.0, 1.0, 1.0);
    trailMat.alpha = 0.95;
    trailMat.backFaceCulling = false;

    // 24 points d'échantillonnage pour un arc de cercle large et ultra-lisse
    this.trailSegments = 24;
    this.basePath = [];
    this.tipPath = [];
    for (let i = 0; i < this.trailSegments; i++) {
      this.basePath.push(new Vector3(0, 0, 0));
      this.tipPath.push(new Vector3(0, 0, 0));
    }

    this.trailMesh = MeshBuilder.CreateRibbon('swordTrail', {
      pathArray: [this.basePath, this.tipPath],
      updatable: true,
      sideOrientation: 2 // Mesh.DOUBLESIDE
    }, this.scene);
    this.trailMesh.material = trailMat;
    this.trailMesh.parent = this.parentNode;
    this.trailMesh.setEnabled(false);
  }

  /**
   * Calcule les coordonnées 3D d'un point sur la lame le long de sa hauteur locale Y.
   * Reproduit fidèlement la rotation Euler Z-X-Y de Babylon.js.
   */
  getSwordPoint(hx, hy, hz, rotX, rotY, rotZ, localY) {
    const x1 = -localY * Math.sin(rotZ);
    const y1 = localY * Math.cos(rotZ);

    const x2 = x1;
    const y2 = y1 * Math.cos(rotX);
    const z2 = y1 * Math.sin(rotX);

    const x3 = x2 * Math.cos(rotY) + z2 * Math.sin(rotY);
    const y3 = y2;
    const z3 = -x2 * Math.sin(rotY) + z2 * Math.cos(rotY);

    return new Vector3(hx + x3, hy + y3, hz + z3);
  }

  getProgress() {
    if (!this.isSlashing) return 0;
    return Math.min(1.0, Math.max(0.0, 1.0 - (this.slashTimer / this.slashDuration)));
  }

  setRestPose() {
    this.root.position.set(0.42, 0.5, 0.15);
    this.root.rotation.set(0.2, 0, -0.2);
  }

  setTorchPose() {
    // Épée brandie haut vers le ciel, avancée devant Zelya pour ne jamais traverser sa tête
    this.root.position.set(0.32, 1.35, 0.55);
    this.root.rotation.set(0.2, 0.15, -0.1);
  }

  startSlash() {
    if (this.isSlashing) return false;
    this.isSlashing = true;
    this.slashTimer = this.slashDuration;
    if (this.trailMesh) {
      this.trailMesh.setEnabled(false);
      this.trailMesh.material.alpha = 0.9;
    }
    return true;
  }

  getTipWorldPosition() {
    return this.tipNode ? this.tipNode.getAbsolutePosition() : this.root.getAbsolutePosition();
  }

  update(dt, isTorchMode) {
    if (this.isSlashing) {
      this.slashTimer -= dt;
      const progress = this.getProgress(); // 0 à 1

      // Paramètres de l'arc de cercle parfait centré sur Zelya
      const z_c = 0.15; // Centre de rotation dans le repère local
      const R_hilt = 0.50; // Rayon constant de la poignée
      const R_base = R_hilt + 0.25; // Rayon intérieur constant du ruban
      const R_tip = R_hilt + 1.35; // Rayon extérieur constant du ruban (cercle parfait)
      const hy = 0.95; // Hauteur constante du plan de coupe horizontal
      const phiStart = 1.85; // +106° à droite
      const phiTotal = 3.70; // 212° de balayage circulaire total

      // --- PHASE 1 : Préparation & Armement fluide (Windup) de 0.0 à 0.10 ---
      if (progress < 0.10) {
        const u = progress / 0.10;
        const w = Math.sin(u * Math.PI * 0.5);

        // Amorce de l'arc de cercle à l'épaule droite
        const startX = isTorchMode ? 0.32 : 0.42;
        const startY = isTorchMode ? 1.35 : 0.50;
        const startZ = isTorchMode ? 0.55 : 0.15;

        const armPoseX = R_hilt * Math.sin(phiStart);
        const armPoseZ = z_c + R_hilt * Math.cos(phiStart);

        this.root.position.set(
          startX + (armPoseX - startX) * w,
          startY + (hy - startY) * w,
          startZ + (armPoseZ - startZ) * w
        );
        this.root.rotation.set(
          (Math.PI / 2) * w + (0.2 * (1 - w)),
          phiStart * w,
          -0.2 * (1 - w)
        );

        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
      }
      // --- PHASE 2 : Arc de cercle parfait (0.10 à 0.62) ---
      else if (progress < 0.62) {
        const u = (progress - 0.10) / 0.52;
        // Accélération explosive (Cubic ease-out percutante)
        const e = 1.0 - Math.pow(1.0 - u, 2.5);

        // Angle de rotation le long du cercle parfait
        const phi = phiStart - phiTotal * e;

        // Position rigoureusement circulaire de la garde
        const hx = R_hilt * Math.sin(phi);
        const hz = z_c + R_hilt * Math.cos(phi);

        // Orientation radiale stricte : la lame pointe exactement le long du rayon du cercle
        const rotX = Math.PI / 2;
        const rotY = phi;
        const rotZ = 0;

        this.root.position.set(hx, hy, hz);
        this.root.rotation.set(rotX, rotY, rotZ);

        // Mise à jour de la traînée lumineuse : anneau circulaire parfait
        for (let i = 0; i < this.trailSegments; i++) {
          const k = i / (this.trailSegments - 1);
          const sampleE = e * k;
          const sPhi = phiStart - phiTotal * sampleE;

          const sinP = Math.sin(sPhi);
          const cosP = Math.cos(sPhi);

          // Points de base et de pointe le long de rayons circulaires parfaits
          this.basePath[i].set(R_base * sinP, hy, z_c + R_base * cosP);
          this.tipPath[i].set(R_tip * sinP, hy, z_c + R_tip * cosP);
        }

        MeshBuilder.CreateRibbon(null, {
          pathArray: [this.basePath, this.tipPath],
          instance: this.trailMesh
        });
        this.trailMesh.material.alpha = 0.95;
        this.trailMesh.setEnabled(true);
      }
      // --- PHASE 3 : Amorti & Retour en garde (Recovery) de 0.62 à 1.0 ---
      else {
        const u = (progress - 0.62) / 0.38;
        const s = Math.sin(u * Math.PI * 0.5);

        // Pose de fin d'arc à gauche
        const endPhi = phiStart - phiTotal;
        const endPoseX = R_hilt * Math.sin(endPhi);
        const endPoseZ = z_c + R_hilt * Math.cos(endPhi);

        const targetX = isTorchMode ? 0.32 : 0.42;
        const targetY = isTorchMode ? 1.35 : 0.50;
        const targetZ = isTorchMode ? 0.55 : 0.15;

        const targetRotX = isTorchMode ? 0.2 : 0.2;
        const targetRotY = isTorchMode ? 0.15 : 0.0;
        const targetRotZ = isTorchMode ? -0.1 : -0.2;

        this.root.position.set(
          endPoseX + (targetX - endPoseX) * s,
          hy + (targetY - hy) * s,
          endPoseZ + (targetZ - endPoseZ) * s
        );
        this.root.rotation.set(
          (Math.PI / 2) + (targetRotX - Math.PI / 2) * s,
          endPhi + (targetRotY - endPhi) * s,
          targetRotZ * s
        );

        // Évanouissement progressif de la traînée lumineuse
        if (this.trailMesh) {
          this.trailMesh.material.alpha = 0.95 * (1.0 - s);
        }
      }

      if (this.slashTimer <= 0) {
        this.isSlashing = false;
        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
        if (isTorchMode) {
          this.setTorchPose();
        } else {
          this.setRestPose();
        }
      }
    } else {
      if (isTorchMode) {
        this.setTorchPose();
      } else {
        this.setRestPose();
      }
    }
  }

  /**
   * Test de collision sectoriel circulaire devant le joueur.
   * Vérifie si une cible est dans l'arc de frappe parfait (~212°, portée 2.2 unités).
   */
  checkHit(playerPos, playerFacingAngle, targetPos, targetRadius = 0.8) {
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const hitRange = 2.2 + targetRadius;
    if (dist > hitRange) return false;

    // Angle vers la cible
    const angleToTarget = Math.atan2(dx, dz);
    let diffAngle = angleToTarget - playerFacingAngle;

    // Normalisation de l'angle entre -PI et +PI
    while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
    while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

    // Arc de cercle parfait de 212° (±106° / 1.85 rad)
    return Math.abs(diffAngle) < 1.85;
  }
}
