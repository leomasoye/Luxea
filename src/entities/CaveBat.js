import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * CaveBat.js — Chauve-souris de caverne inoffensive et atmosphérique.
 * Conforme à AGENT.md :
 * - Modèle low-poly rétro (corps sombre, oreilles pointues, yeux ambrés discrets, ailes articulées).
 * - Vol fluide en boucle (trajectoire elliptique / en 8) avec battement d'ailes et inclinaison dans les virages.
 * - Zéro collision bloquante, zéro dégât : purement visuelle et vivante.
 */
export class CaveBat {
  constructor(scene, parentNode, centerX, centerY, centerZ, id = 'bat', options = {}) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = id;

    this.center = new Vector3(centerX, centerY, centerZ);
    this.radiusX = options.radiusX || 3.2;
    this.radiusZ = options.radiusZ || 2.4;
    this.bobAmp = options.bobAmp || 0.45;
    this.speed = options.speed || (0.85 + Math.random() * 0.35);
    this.figureEight = options.figureEight !== undefined ? options.figureEight : true;
    this.time = Math.random() * Math.PI * 2;
    this.flapTime = Math.random() * 10;

    this.root = new TransformNode(`cave_bat_${id}`, this.scene);
    this.root.position.copyFrom(this.center);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    this.wingLRoot = null;
    this.wingRRoot = null;

    this.initMeshes();
  }

  initMeshes() {
    const bodyMat = new StandardMaterial(`mat_bat_body_${this.id}`, this.scene);
    bodyMat.diffuseColor = new Color3(0.14, 0.11, 0.18);
    bodyMat.specularColor = new Color3(0.05, 0.04, 0.08);
    bodyMat.maxSimultaneousLights = 8;
    bodyMat.freeze();

    const wingMat = new StandardMaterial(`mat_bat_wing_${this.id}`, this.scene);
    wingMat.diffuseColor = new Color3(0.20, 0.15, 0.25);
    wingMat.specularColor = new Color3(0.04, 0.03, 0.06);
    wingMat.maxSimultaneousLights = 8;
    wingMat.freeze();

    const eyeMat = new StandardMaterial(`mat_bat_eye_${this.id}`, this.scene);
    eyeMat.diffuseColor = new Color3(1.0, 0.72, 0.20);
    eyeMat.emissiveColor = new Color3(0.95, 0.55, 0.10);
    eyeMat.specularColor = new Color3(0, 0, 0);
    eyeMat.freeze();

    // 1. Corps compact
    const body = MeshBuilder.CreateBox(`bat_body_${this.id}`, {
      width: 0.22,
      height: 0.18,
      depth: 0.34
    }, this.scene);
    body.material = bodyMat;
    body.parent = this.root;

    // 2. Tête + oreilles pointues
    const head = MeshBuilder.CreateBox(`bat_head_${this.id}`, {
      width: 0.18,
      height: 0.16,
      depth: 0.18
    }, this.scene);
    head.material = bodyMat;
    head.position.set(0, 0.04, 0.20);
    head.parent = this.root;

    const earL = MeshBuilder.CreateCylinder(`bat_ear_l_${this.id}`, {
      height: 0.14,
      diameterTop: 0.01,
      diameterBottom: 0.08,
      tessellation: 4
    }, this.scene);
    earL.material = bodyMat;
    earL.position.set(-0.06, 0.13, 0.02);
    earL.rotation.z = 0.25;
    earL.parent = head;

    const earR = MeshBuilder.CreateCylinder(`bat_ear_r_${this.id}`, {
      height: 0.14,
      diameterTop: 0.01,
      diameterBottom: 0.08,
      tessellation: 4
    }, this.scene);
    earR.material = bodyMat;
    earR.position.set(0.06, 0.13, 0.02);
    earR.rotation.z = -0.25;
    earR.parent = head;

    // 3. Petits yeux ambrés visibles dans la pénombre
    const eyeL = MeshBuilder.CreateBox(`bat_eye_l_${this.id}`, { width: 0.04, height: 0.04, depth: 0.03 }, this.scene);
    eyeL.material = eyeMat;
    eyeL.position.set(-0.05, 0.02, 0.09);
    eyeL.parent = head;

    const eyeR = MeshBuilder.CreateBox(`bat_eye_r_${this.id}`, { width: 0.04, height: 0.04, depth: 0.03 }, this.scene);
    eyeR.material = eyeMat;
    eyeR.position.set(0.05, 0.02, 0.09);
    eyeR.parent = head;

    // 4. Aile gauche articulée (2 segments anguleux rétro)
    this.wingLRoot = new TransformNode(`bat_wing_l_root_${this.id}`, this.scene);
    this.wingLRoot.position.set(-0.10, 0.02, 0.02);
    this.wingLRoot.parent = this.root;

    const wingLInner = MeshBuilder.CreateBox(`bat_wing_l_in_${this.id}`, {
      width: 0.34,
      height: 0.03,
      depth: 0.28
    }, this.scene);
    wingLInner.material = wingMat;
    wingLInner.position.set(-0.17, 0, -0.02);
    wingLInner.parent = this.wingLRoot;

    const wingLOuter = MeshBuilder.CreateBox(`bat_wing_l_out_${this.id}`, {
      width: 0.28,
      height: 0.025,
      depth: 0.20
    }, this.scene);
    wingLOuter.material = wingMat;
    wingLOuter.position.set(-0.44, -0.02, -0.06);
    wingLOuter.rotation.y = 0.22;
    wingLOuter.parent = this.wingLRoot;

    // 5. Aile droite articulée
    this.wingRRoot = new TransformNode(`bat_wing_r_root_${this.id}`, this.scene);
    this.wingRRoot.position.set(0.10, 0.02, 0.02);
    this.wingRRoot.parent = this.root;

    const wingRInner = MeshBuilder.CreateBox(`bat_wing_r_in_${this.id}`, {
      width: 0.34,
      height: 0.03,
      depth: 0.28
    }, this.scene);
    wingRInner.material = wingMat;
    wingRInner.position.set(0.17, 0, -0.02);
    wingRInner.parent = this.wingRRoot;

    const wingROuter = MeshBuilder.CreateBox(`bat_wing_r_out_${this.id}`, {
      width: 0.28,
      height: 0.025,
      depth: 0.20
    }, this.scene);
    wingROuter.material = wingMat;
    wingROuter.position.set(0.44, -0.02, -0.06);
    wingROuter.rotation.y = -0.22;
    wingROuter.parent = this.wingRRoot;
  }

  update(dt) {
    this.time += dt * this.speed;
    this.flapTime += dt * 16.0;

    const prevX = this.root.position.x;
    const prevZ = this.root.position.z;

    let nx, ny, nz;
    if (this.figureEight) {
      nx = this.center.x + Math.sin(this.time) * this.radiusX;
      nz = this.center.z + Math.sin(this.time * 2.0) * 0.5 * this.radiusZ;
      ny = this.center.y + Math.sin(this.time * 3.0) * this.bobAmp;
    } else {
      nx = this.center.x + Math.cos(this.time) * this.radiusX;
      nz = this.center.z + Math.sin(this.time) * this.radiusZ;
      ny = this.center.y + Math.sin(this.time * 2.3) * this.bobAmp;
    }

    this.root.position.set(nx, ny, nz);

    // Orientation dans le sens du vol + léger roulis dans les virages
    const dx = nx - prevX;
    const dz = nz - prevZ;
    if (dx * dx + dz * dz > 0.000001) {
      const targetYaw = Math.atan2(dx, dz);
      this.root.rotation.y = targetYaw;
    }

    // Battement d'ailes dynamique
    const flapAngle = Math.sin(this.flapTime) * 0.85;
    if (this.wingLRoot) this.wingLRoot.rotation.z = -flapAngle;
    if (this.wingRRoot) this.wingRRoot.rotation.z = flapAngle;
  }

  dispose() {
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
