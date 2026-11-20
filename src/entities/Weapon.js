import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * Weapon.js — Épée courte de Zalya & mécanique de la Frappe Lumineuse.
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
    this.slashArcMesh = null;
    this.tipNode = null;

    this.isSlashing = false;
    this.slashTimer = 0;
    this.slashDuration = 0.22; // Durée de l'animation d'attaque (secondes)

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
      height: 0.95,
      depth: 0.05
    }, this.scene);
    this.bladeMesh.material = steelMat;
    this.bladeMesh.parent = this.root;
    this.bladeMesh.position.y = 0.88;

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
    this.tipNode.position.y = 1.35;

    // 7. Arc de cercle tranchant visuel (Slash Arc semi-transparent)
    this.initSlashArc();

    // Position de repos au côté de Zalya
    this.setRestPose();
  }

  initSlashArc() {
    const slashMat = new StandardMaterial('mat_slash_arc', this.scene);
    slashMat.diffuseColor = new Color3(1.0, 0.95, 0.6);
    slashMat.emissiveColor = new Color3(1.0, 0.85, 0.3);
    slashMat.alpha = 0.75;
    slashMat.backFaceCulling = false;

    // Disque partiel représentant le sillage tranchant lumineux
    this.slashArcMesh = MeshBuilder.CreateDisc('slashArc', {
      radius: 1.8,
      tessellation: 24,
      arc: 0.55 // ~100 degrés d'arc
    }, this.scene);
    this.slashArcMesh.material = slashMat;
    this.slashArcMesh.parent = this.parentNode;
    this.slashArcMesh.rotation.x = Math.PI / 2;
    this.slashArcMesh.position.y = 0.6;
    this.slashArcMesh.position.z = 0.4;
    this.slashArcMesh.setEnabled(false);
  }

  setRestPose() {
    this.root.position.set(0.42, 0.5, 0.15);
    this.root.rotation.set(0.2, 0, -0.2);
  }

  setTorchPose() {
    // Épée brandie haut vers le ciel
    this.root.position.set(0.2, 1.25, 0.2);
    this.root.rotation.set(-0.3, 0, 0.1);
  }

  startSlash() {
    if (this.isSlashing) return false;
    this.isSlashing = true;
    this.slashTimer = this.slashDuration;
    if (this.slashArcMesh) {
      this.slashArcMesh.setEnabled(true);
      this.slashArcMesh.rotation.z = -Math.PI / 1.8;
    }
    return true;
  }

  getTipWorldPosition() {
    return this.tipNode ? this.tipNode.getAbsolutePosition() : this.root.getAbsolutePosition();
  }

  update(dt, isTorchMode) {
    if (this.isSlashing) {
      this.slashTimer -= dt;
      const progress = 1 - (this.slashTimer / this.slashDuration); // 0 à 1

      // Mouvement de balayage horizontal rapide (~180°)
      const startAngle = Math.PI * 0.45;
      const endAngle = -Math.PI * 0.55;
      const currentAngle = startAngle + (endAngle - startAngle) * progress;

      this.root.position.set(
        Math.cos(currentAngle) * 0.9,
        0.65,
        Math.sin(currentAngle) * 0.9 + 0.3
      );
      this.root.rotation.set(Math.PI / 2.2, -currentAngle, 0);

      if (this.slashArcMesh) {
        this.slashArcMesh.rotation.y = -currentAngle * 0.5;
        this.slashArcMesh.material.alpha = (1 - progress) * 0.85;
      }

      if (this.slashTimer <= 0) {
        this.isSlashing = false;
        if (this.slashArcMesh) {
          this.slashArcMesh.setEnabled(false);
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
   * Test de collision sectoriel devant le joueur.
   * Vérifie si une position cible est dans le cône de frappe (~180°, portée 2.3 unités).
   */
  checkHit(playerPos, playerFacingAngle, targetPos, targetRadius = 0.8) {
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const hitRange = 2.3 + targetRadius;
    if (dist > hitRange) return false;

    // Angle vers la cible
    const angleToTarget = Math.atan2(dx, dz);
    let diffAngle = angleToTarget - playerFacingAngle;

    // Normalisation de l'angle entre -PI et +PI
    while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
    while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

    // Couvre un arc généreux d'environ 150° (±75° devant le joueur)
    return Math.abs(diffAngle) < (Math.PI * 0.55);
  }
}
