import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * CaveBat.js — Chauve-souris de caverne inoffensive en nuée, visible en caméra 3/4.
 * Conforme à AGENT.md :
 * - Vol à hauteur de vue (Y = 2.1 à 3.4 m au-dessus du sol) avec ombre rétro projetée au sol.
 * - Regroupées en petites nuées organiques.
 * - Réaction dynamique : s'effraient et tourbillonnent au loin quand Zelya s'approche
 *   ou brandit son épée en Mode Torche, puis reviennent doucement dans leur nuée.
 * - Zéro collision bloquante, zéro dégât.
 */
export class CaveBat {
  constructor(scene, parentNode, centerX, centerY, centerZ, id = 'bat', options = {}) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = id;

    this.center = new Vector3(centerX, centerY, centerZ);
    this.groundY = options.groundY || 0;
    this.radiusX = options.radiusX || 2.6;
    this.radiusZ = options.radiusZ || 2.0;
    this.bobAmp = options.bobAmp || 0.32;
    this.speed = options.speed || (1.05 + Math.random() * 0.35);
    this.figureEight = options.figureEight !== undefined ? options.figureEight : true;

    // Décalage de formation au sein de la nuée
    this.phaseOffset = options.phaseOffset !== undefined ? options.phaseOffset : Math.random() * Math.PI * 2;
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
    this.offsetZ = options.offsetZ || 0;

    this.time = this.phaseOffset;
    this.flapTime = Math.random() * 10;

    // État de fuite réactive (approche joueur ou Mode Torche)
    this.scatterTimer = 0;
    this.scatterCooldown = 0;
    this.scatterVel = new Vector3(0, 0, 0);
    this.currentPos = new Vector3(centerX + this.offsetX, centerY + this.offsetY, centerZ + this.offsetZ);

    this.root = new TransformNode(`cave_bat_${id}`, this.scene);
    this.root.position.copyFrom(this.currentPos);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    this.wingLRoot = null;
    this.wingRRoot = null;
    this.shadowDisc = null;

    this.initMeshes();
  }

  initMeshes() {
    const bodyMat = new StandardMaterial(`mat_bat_body_${this.id}`, this.scene);
    bodyMat.diffuseColor = new Color3(0.18, 0.14, 0.24);
    bodyMat.specularColor = new Color3(0.06, 0.05, 0.10);
    bodyMat.maxSimultaneousLights = 8;
    bodyMat.freeze();

    const wingMat = new StandardMaterial(`mat_bat_wing_${this.id}`, this.scene);
    wingMat.diffuseColor = new Color3(0.26, 0.20, 0.34);
    wingMat.specularColor = new Color3(0.05, 0.04, 0.08);
    wingMat.maxSimultaneousLights = 8;
    wingMat.freeze();

    const eyeMat = new StandardMaterial(`mat_bat_eye_${this.id}`, this.scene);
    eyeMat.diffuseColor = new Color3(1.0, 0.78, 0.25);
    eyeMat.emissiveColor = new Color3(1.0, 0.62, 0.14);
    eyeMat.specularColor = new Color3(0, 0, 0);
    eyeMat.freeze();

    // 1. Corps compact (légèrement agrandi pour une excellente lisibilité 3/4)
    const body = MeshBuilder.CreateBox(`bat_body_${this.id}`, {
      width: 0.26,
      height: 0.20,
      depth: 0.38
    }, this.scene);
    body.material = bodyMat;
    body.parent = this.root;

    // 2. Tête + oreilles pointues
    const head = MeshBuilder.CreateBox(`bat_head_${this.id}`, {
      width: 0.20,
      height: 0.18,
      depth: 0.20
    }, this.scene);
    head.material = bodyMat;
    head.position.set(0, 0.04, 0.22);
    head.parent = this.root;

    const earL = MeshBuilder.CreateCylinder(`bat_ear_l_${this.id}`, {
      height: 0.16,
      diameterTop: 0.01,
      diameterBottom: 0.09,
      tessellation: 4
    }, this.scene);
    earL.material = bodyMat;
    earL.position.set(-0.07, 0.14, 0.02);
    earL.rotation.z = 0.25;
    earL.parent = head;

    const earR = MeshBuilder.CreateCylinder(`bat_ear_r_${this.id}`, {
      height: 0.16,
      diameterTop: 0.01,
      diameterBottom: 0.09,
      tessellation: 4
    }, this.scene);
    earR.material = bodyMat;
    earR.position.set(0.07, 0.14, 0.02);
    earR.rotation.z = -0.25;
    earR.parent = head;

    // 3. Petits yeux ambrés lumineux
    const eyeL = MeshBuilder.CreateBox(`bat_eye_l_${this.id}`, { width: 0.045, height: 0.045, depth: 0.03 }, this.scene);
    eyeL.material = eyeMat;
    eyeL.position.set(-0.055, 0.02, 0.10);
    eyeL.parent = head;

    const eyeR = MeshBuilder.CreateBox(`bat_eye_r_${this.id}`, { width: 0.045, height: 0.045, depth: 0.03 }, this.scene);
    eyeR.material = eyeMat;
    eyeR.position.set(0.055, 0.02, 0.10);
    eyeR.parent = head;

    // 4. Aile gauche articulée
    this.wingLRoot = new TransformNode(`bat_wing_l_root_${this.id}`, this.scene);
    this.wingLRoot.position.set(-0.12, 0.02, 0.02);
    this.wingLRoot.parent = this.root;

    const wingLInner = MeshBuilder.CreateBox(`bat_wing_l_in_${this.id}`, {
      width: 0.38,
      height: 0.03,
      depth: 0.30
    }, this.scene);
    wingLInner.material = wingMat;
    wingLInner.position.set(-0.19, 0, -0.02);
    wingLInner.parent = this.wingLRoot;

    const wingLOuter = MeshBuilder.CreateBox(`bat_wing_l_out_${this.id}`, {
      width: 0.32,
      height: 0.025,
      depth: 0.22
    }, this.scene);
    wingLOuter.material = wingMat;
    wingLOuter.position.set(-0.48, -0.02, -0.06);
    wingLOuter.rotation.y = 0.22;
    wingLOuter.parent = this.wingLRoot;

    // 5. Aile droite articulée
    this.wingRRoot = new TransformNode(`bat_wing_r_root_${this.id}`, this.scene);
    this.wingRRoot.position.set(0.12, 0.02, 0.02);
    this.wingRRoot.parent = this.root;

    const wingRInner = MeshBuilder.CreateBox(`bat_wing_r_in_${this.id}`, {
      width: 0.38,
      height: 0.03,
      depth: 0.30
    }, this.scene);
    wingRInner.material = wingMat;
    wingRInner.position.set(0.19, 0, -0.02);
    wingRInner.parent = this.wingRRoot;

    const wingROuter = MeshBuilder.CreateBox(`bat_wing_r_out_${this.id}`, {
      width: 0.32,
      height: 0.025,
      depth: 0.22
    }, this.scene);
    wingROuter.material = wingMat;
    wingROuter.position.set(0.48, -0.02, -0.06);
    wingROuter.rotation.y = -0.22;
    wingROuter.parent = this.wingRRoot;

    // 6. Ombre rétro discrète projetée au sol (aide à lire la hauteur en vue 3/4)
    const shadowMat = new StandardMaterial(`mat_bat_shadow_${this.id}`, this.scene);
    shadowMat.diffuseColor = new Color3(0, 0, 0);
    shadowMat.alpha = 0.28;
    shadowMat.freeze();

    this.shadowDisc = MeshBuilder.CreateDisc(`bat_shadow_${this.id}`, {
      radius: 0.34,
      tessellation: 10
    }, this.scene);
    this.shadowDisc.rotation.x = Math.PI / 2;
    this.shadowDisc.material = shadowMat;
    if (this.parentNode) {
      this.shadowDisc.parent = this.parentNode;
    }
    this.shadowDisc.position.set(this.currentPos.x, this.groundY + 0.03, this.currentPos.z);
  }

  getOrbitTarget() {
    let tx, ty, tz;
    if (this.figureEight) {
      tx = this.center.x + this.offsetX + Math.sin(this.time) * this.radiusX;
      tz = this.center.z + this.offsetZ + Math.sin(this.time * 2.0) * 0.55 * this.radiusZ;
      ty = this.center.y + this.offsetY + Math.sin(this.time * 3.0) * this.bobAmp;
    } else {
      tx = this.center.x + this.offsetX + Math.cos(this.time) * this.radiusX;
      tz = this.center.z + this.offsetZ + Math.sin(this.time) * this.radiusZ;
      ty = this.center.y + this.offsetY + Math.sin(this.time * 2.4) * this.bobAmp;
    }
    return { x: tx, y: ty, z: tz };
  }

  update(dt, player = null) {
    this.time += dt * this.speed;
    if (this.scatterCooldown > 0) this.scatterCooldown -= dt;

    // Détection de proximité de Zelya ou de la Lumière de l'Épée (Mode Torche)
    if (player && this.scatterTimer <= 0 && this.scatterCooldown <= 0) {
      const pPos = player.getPosition();
      const dx = this.currentPos.x - pPos.x;
      const dz = this.currentPos.z - pPos.z;
      const distSq = dx * dx + dz * dz;
      const triggerRange = player.isTorchMode ? 8.2 : 4.8;

      if (distSq < triggerRange * triggerRange) {
        const dist = Math.sqrt(distSq) || 1.0;
        // Envol paniqué en arc au-dessus et à l'écart de Zelya
        const swirlAngle = (Math.random() - 0.5) * 1.1;
        const cosA = Math.cos(swirlAngle);
        const sinA = Math.sin(swirlAngle);
        const dirX = (dx / dist) * cosA - (dz / dist) * sinA;
        const dirZ = (dx / dist) * sinA + (dz / dist) * cosA;

        this.scatterVel.set(dirX * 6.5, 1.3 + Math.random() * 0.8, dirZ * 6.5);
        this.scatterTimer = 1.6 + Math.random() * 0.7;
        this.scatterCooldown = 4.2 + Math.random() * 1.8;
      }
    }

    const prevX = this.currentPos.x;
    const prevZ = this.currentPos.z;

    if (this.scatterTimer > 0) {
      // Phase d'envol effrayé
      this.scatterTimer -= dt;
      this.flapTime += dt * 26.0; // Battement d'ailes rapide !

      const decay = Math.max(0.15, this.scatterTimer / 2.0);
      this.currentPos.x += this.scatterVel.x * decay * dt;
      this.currentPos.z += this.scatterVel.z * decay * dt;
      this.currentPos.y = Math.min(this.groundY + 4.4, this.currentPos.y + this.scatterVel.y * decay * dt);
    } else {
      // Retour fluide et vol en nuée autour du point d'ancrage
      this.flapTime += dt * 16.5;
      const target = this.getOrbitTarget();
      const lerp = Math.min(1.0, dt * 3.2);
      this.currentPos.x += (target.x - this.currentPos.x) * lerp;
      this.currentPos.y += (target.y - this.currentPos.y) * lerp;
      this.currentPos.z += (target.z - this.currentPos.z) * lerp;
    }

    this.root.position.copyFrom(this.currentPos);

    // Mise à jour de l'ombre au sol
    if (this.shadowDisc) {
      this.shadowDisc.position.set(this.currentPos.x, this.groundY + 0.03, this.currentPos.z);
      const heightAboveGround = Math.max(0.5, this.currentPos.y - this.groundY);
      const shadowScale = Math.max(0.45, 1.15 - heightAboveGround * 0.16);
      this.shadowDisc.scaling.set(shadowScale, shadowScale, 1);
    }

    // Orientation dans le sens du vol
    const dx = this.currentPos.x - prevX;
    const dz = this.currentPos.z - prevZ;
    if (dx * dx + dz * dz > 0.000001) {
      this.root.rotation.y = Math.atan2(dx, dz);
    }

    // Battement d'ailes
    const flapAngle = Math.sin(this.flapTime) * 0.90;
    if (this.wingLRoot) this.wingLRoot.rotation.z = -flapAngle;
    if (this.wingRRoot) this.wingRRoot.rotation.z = flapAngle;
  }

  dispose() {
    if (this.shadowDisc) {
      this.shadowDisc.dispose();
      this.shadowDisc = null;
    }
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
