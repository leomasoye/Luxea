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
  constructor(scene, parentNode, handSocket = null) {
    this.scene = scene;
    this.parentNode = parentNode;

    this.root = new TransformNode('WeaponRoot', this.scene);
    if (handSocket) {
      this.root.parent = handSocket;
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.parent = parentNode;
      this.setRestPose();
    }

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

  attachToHand(handSocket) {
    if (!handSocket) return;
    this.root.parent = handSocket;
    this.root.position.set(0, -0.15, 0);
    this.root.rotation.set(0, 0, 0);
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

    // 2. Poignée (centrée au creux de la main)
    const handle = MeshBuilder.CreateCylinder('swordHandle', {
      height: 0.35,
      diameter: 0.08
    }, this.scene);
    handle.material = goldMat;
    handle.parent = this.root;
    handle.position.y = 0.15;

    // 3. Garde (repose juste au-dessus des phalanges)
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

  getProgress() {
    if (!this.isSlashing) return 0;
    return Math.min(1.0, Math.max(0.0, 1.0 - (this.slashTimer / this.slashDuration)));
  }

  setRestPose() {
    if (this.root.parent !== this.parentNode) {
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.position.set(0.42, 0.5, 0.15);
      this.root.rotation.set(0.2, 0, -0.2);
    }
  }

  setTorchPose() {
    if (this.root.parent !== this.parentNode) {
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.position.set(0.32, 1.35, 0.55);
      this.root.rotation.set(0.2, 0.15, -0.1);
    }
  }

  startSlash() {
    if (this.isSlashing) return false;
    this.isSlashing = true;
    this.slashTimer = this.slashDuration;
    if (this.trailMesh) {
      this.trailMesh.setEnabled(false);
      this.trailMesh.material.alpha = 0.95;
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

      // Paramètres de l'arc de balayage du ruban lumineux doré
      const z_c = 0.15;
      const R_base = 0.45;
      const R_tip = 1.45;
      const hy = 0.90;
      const phiStart = 1.65; // +95° droite
      const phiTotal = 3.30; // 190° balayage circulaire total

      // --- PHASE 1 : Préparation & Armement (0.0 à 0.12) ---
      if (progress < 0.12) {
        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
      }
      // --- PHASE 2 : Balayage circulaire tranchant (0.12 à 0.62) ---
      else if (progress < 0.62) {
        const u = (progress - 0.12) / 0.50;
        const e = 1.0 - Math.pow(1.0 - u, 2.4);

        // Mise à jour du ruban d'or fendant l'air
        for (let i = 0; i < this.trailSegments; i++) {
          const k = i / (this.trailSegments - 1);
          const sampleE = e * k;
          const sPhi = phiStart - phiTotal * sampleE;

          const sinP = Math.sin(sPhi);
          const cosP = Math.cos(sPhi);

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
      // --- PHASE 3 : Amorti & Retour en garde (0.62 à 1.0) ---
      else {
        const u = (progress - 0.62) / 0.38;
        const s = Math.sin(u * Math.PI * 0.5);

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
      }
    }
  }

  /**
   * Test de collision sectoriel circulaire devant le joueur.
   * Vérifie si une cible est dans l'arc de frappe (190°, portée 2.2 unités).
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

    // Arc de frappe de 190° (±95° / 1.66 rad)
    return Math.abs(diffAngle) < 1.70;
  }
}
