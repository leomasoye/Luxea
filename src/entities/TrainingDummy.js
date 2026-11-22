import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * TrainingDummy.js — Mannequin d'entraînement en bois interactif.
 * Conforme aux directives :
 * - Placé dans un coin près du spawn pour s'entraîner au maniement de l'épée.
 * - Réagit aux frappes avec une oscillation / bascule naturelle (ressort amorti).
 * - Indestructible (ne peut pas être brisé).
 * - Émet des éclats de bois et de sciure à l'impact.
 */
export class TrainingDummy {
  constructor(scene, position, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.position = position.clone();
    this.radius = 0.65;

    // Racine statique
    this.root = new TransformNode('TrainingDummyRoot', this.scene);
    this.root.position.copyFrom(this.position);

    // Pivot d'oscillation (wobble) au sol pour une inclinaison réaliste
    this.wobblePivot = new TransformNode('DummyWobblePivot', this.scene);
    this.wobblePivot.position.set(0, 0.12, 0);
    this.wobblePivot.parent = this.root;

    // Physique du ressort amorti (Damped Harmonic Oscillator)
    this.tiltX = 0;
    this.tiltZ = 0;
    this.velX = 0;
    this.velZ = 0;
    this.springK = 115.0; // Rigidité du ressort
    this.damping = 9.8;   // Amortissement doux naturel

    this.hitCooldown = 0;

    this.initMesh();
  }

  initMesh() {
    // 1. Matériaux
    const woodMat = new StandardMaterial('mat_dummy_wood', this.scene);
    woodMat.diffuseColor = new Color3(0.44, 0.30, 0.18); // Bois de chêne ancien
    woodMat.specularColor = new Color3(0.05, 0.04, 0.03);

    const baseWoodMat = new StandardMaterial('mat_dummy_base', this.scene);
    baseWoodMat.diffuseColor = new Color3(0.32, 0.22, 0.12);

    const burlapMat = new StandardMaterial('mat_dummy_burlap', this.scene);
    burlapMat.diffuseColor = new Color3(0.72, 0.60, 0.42); // Toile de jute / rembourrage paille
    burlapMat.specularColor = new Color3(0.04, 0.04, 0.02);

    const strawMat = new StandardMaterial('mat_dummy_straw', this.scene);
    strawMat.diffuseColor = new Color3(0.85, 0.72, 0.32); // Bottes de paille aux mains

    const targetRedMat = new StandardMaterial('mat_target_red', this.scene);
    targetRedMat.diffuseColor = new Color3(0.85, 0.15, 0.18);

    const targetWhiteMat = new StandardMaterial('mat_target_white', this.scene);
    targetWhiteMat.diffuseColor = new Color3(0.95, 0.95, 0.90);

    const ropeMat = new StandardMaterial('mat_dummy_rope', this.scene);
    ropeMat.diffuseColor = new Color3(0.28, 0.22, 0.15);

    // Patch de terre battue circulaire sous le mannequin
    const dirtPatchMat = new StandardMaterial('mat_dummy_dirt', this.scene);
    dirtPatchMat.diffuseColor = new Color3(0.50, 0.38, 0.24);
    dirtPatchMat.specularColor = new Color3(0, 0, 0);

    const dirtPatch = MeshBuilder.CreateDisc('dummy_dirt', { radius: 1.25, tessellation: 16 }, this.scene);
    dirtPatch.rotation.x = Math.PI / 2;
    dirtPatch.position.set(0, 0.015, 0);
    dirtPatch.material = dirtPatchMat;
    dirtPatch.parent = this.root;

    // Socle en croix en madriers de bois fermement posé au sol
    const base1 = MeshBuilder.CreateBox('dummy_base_1', { width: 1.35, height: 0.14, depth: 0.26 }, this.scene);
    base1.material = baseWoodMat;
    base1.position.set(0, 0.07, 0);
    base1.parent = this.root;

    const base2 = MeshBuilder.CreateBox('dummy_base_2', { width: 0.26, height: 0.14, depth: 1.35 }, this.scene);
    base2.material = baseWoodMat;
    base2.position.set(0, 0.07, 0);
    base2.parent = this.root;

    // === ÉLÉMENTS ARTICULÉS SUR LE PIVOT (WOBBLE) ===

    // Poteau vertical central
    const pole = MeshBuilder.CreateCylinder('dummy_pole', { height: 1.95, diameter: 0.22 }, this.scene);
    pole.material = woodMat;
    pole.position.set(0, 0.95, 0);
    pole.parent = this.wobblePivot;

    // Torse rembourré de jute
    const torso = MeshBuilder.CreateBox('dummy_torso', { width: 0.68, height: 0.88, depth: 0.46 }, this.scene);
    torso.material = burlapMat;
    torso.position.set(0, 1.10, 0);
    torso.parent = this.wobblePivot;

    // Cordes cerclant le buste
    const ropeTop = MeshBuilder.CreateBox('dummy_rope_t', { width: 0.70, height: 0.06, depth: 0.48 }, this.scene);
    ropeTop.material = ropeMat;
    ropeTop.position.set(0, 1.40, 0);
    ropeTop.parent = this.wobblePivot;

    const ropeBottom = MeshBuilder.CreateBox('dummy_rope_b', { width: 0.70, height: 0.06, depth: 0.48 }, this.scene);
    ropeBottom.material = ropeMat;
    ropeBottom.position.set(0, 0.78, 0);
    ropeBottom.parent = this.wobblePivot;

    // Traverse horizontale (Bras écartés)
    const arms = MeshBuilder.CreateCylinder('dummy_arms', { height: 1.55, diameter: 0.16 }, this.scene);
    arms.material = woodMat;
    arms.rotation.z = Math.PI / 2;
    arms.position.set(0, 1.35, 0);
    arms.parent = this.wobblePivot;

    // Gants / bottes de paille au bout des bras
    const handL = MeshBuilder.CreateSphere('dummy_hand_l', { diameterX: 0.28, diameterY: 0.24, diameterZ: 0.24 }, this.scene);
    handL.material = strawMat;
    handL.position.set(-0.78, 1.35, 0);
    handL.parent = this.wobblePivot;

    const handR = MeshBuilder.CreateSphere('dummy_hand_r', { diameterX: 0.28, diameterY: 0.24, diameterZ: 0.24 }, this.scene);
    handR.material = strawMat;
    handR.position.set(0.78, 1.35, 0);
    handR.parent = this.wobblePivot;

    // Tête en bois sculpté
    const head = MeshBuilder.CreateCylinder('dummy_head', { height: 0.42, diameter: 0.38, tessellation: 8 }, this.scene);
    head.material = woodMat;
    head.position.set(0, 1.76, 0);
    head.parent = this.wobblePivot;

    // Coiffe de paille / Chapeau rustique
    const hat = MeshBuilder.CreateCylinder('dummy_hat', { height: 0.16, diameterTop: 0.15, diameterBottom: 0.58 }, this.scene);
    hat.material = strawMat;
    hat.position.set(0, 1.98, 0);
    hat.parent = this.wobblePivot;

    // Cible peinte sur le plastron (Anneau blanc + Cœur rouge)
    const targetRing = MeshBuilder.CreateDisc('dummy_target_ring', { radius: 0.20, tessellation: 16 }, this.scene);
    targetRing.material = targetWhiteMat;
    targetRing.position.set(0, 1.12, 0.235);
    targetRing.parent = this.wobblePivot;

    const targetBullseye = MeshBuilder.CreateDisc('dummy_target_bullseye', { radius: 0.09, tessellation: 16 }, this.scene);
    targetBullseye.material = targetRedMat;
    targetBullseye.position.set(0, 1.12, 0.238);
    targetBullseye.parent = this.wobblePivot;
  }

  getPosition() {
    return this.root.position;
  }

  // Vérifie si le coup d'épée touche le mannequin
  checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager = null) {
    if (this.hitCooldown > 0) return false;

    const hit = weapon.checkHit(playerPos, playerFacingAngle, this.root.position, this.radius);
    if (!hit) return false;

    this.hitCooldown = 0.20;

    // Calcul du vecteur d'impact depuis le joueur vers le mannequin
    const dx = this.root.position.x - playerPos.x;
    const dz = this.root.position.z - playerPos.z;
    const dist = Math.hypot(dx, dz) || 1.0;
    const nx = dx / dist;
    const nz = dz / dist;

    // Impulsion angulaire proportionnelle à l'impact
    // Une force vers +Z incline l'axe X vers l'avant (+X)
    // Une force vers +X incline l'axe Z vers la gauche (-Z)
    const impactForce = 8.8;
    this.velX += nz * impactForce;
    this.velZ += -nx * impactForce;

    // Effet de secousse de caméra léger
    if (cameraManager) {
      cameraManager.shake(0.22, 0.15);
    }

    // Particules de sciure et copeaux de bois
    this.spawnHitParticles(nx, nz);

    return true;
  }

  spawnHitParticles(nx, nz) {
    const chipMat = new StandardMaterial('mat_wood_chips', this.scene);
    chipMat.diffuseColor = new Color3(0.78, 0.62, 0.38);

    const origin = this.root.position.clone();
    origin.y += 1.15;

    for (let i = 0; i < 7; i++) {
      const chip = MeshBuilder.CreateBox('wood_chip', {
        width: 0.12,
        height: 0.10,
        depth: 0.08
      }, this.scene);
      chip.material = chipMat;
      chip.position.set(
        origin.x + (Math.random() - 0.5) * 0.3,
        origin.y + (Math.random() - 0.5) * 0.4,
        origin.z + (Math.random() - 0.5) * 0.3
      );

      const vel = new Vector3(
        nx * 2.2 + (Math.random() - 0.5) * 2.5,
        1.8 + Math.random() * 2.0,
        nz * 2.2 + (Math.random() - 0.5) * 2.5
      );

      let life = 0.38;
      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        chip.position.addInPlace(vel.scale(dt));
        chip.rotation.x += 6 * dt;
        chip.rotation.y += 5 * dt;
        vel.y -= 10.0 * dt;

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          chip.dispose();
        }
      });
    }
  }

  update(dt) {
    if (this.hitCooldown > 0) {
      this.hitCooldown -= dt;
    }

    // Intégration du ressort amorti
    const accX = -this.springK * this.tiltX - this.damping * this.velX;
    const accZ = -this.springK * this.tiltZ - this.damping * this.velZ;

    this.velX += accX * dt;
    this.velZ += accZ * dt;

    this.tiltX += this.velX * dt;
    this.tiltZ += this.velZ * dt;

    // Plafonnement d'angle maximum pour éviter toute distorsion anormale
    const maxTilt = 0.45; // ~26 degrés
    this.tiltX = Math.max(-maxTilt, Math.min(maxTilt, this.tiltX));
    this.tiltZ = Math.max(-maxTilt, Math.min(maxTilt, this.tiltZ));

    // Application au pivot d'oscillation
    this.wobblePivot.rotation.x = this.tiltX;
    this.wobblePivot.rotation.z = this.tiltZ;
  }
}
