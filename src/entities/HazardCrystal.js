import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * HazardCrystal.js — Cristal corrompu rouge-braise infligeant des dégâts au contact.
 * Conforme à AGENT.md :
 * - Silhouette et teinte rouge/braise pulsative immédiatement distinctes des cristaux décoratifs.
 * - Inflige 1 demi-cœur + recul (knockback) au contact de Zelya.
 * - Respecte l'invulnérabilité et la roulade d'esquive (K).
 */
export class HazardCrystal {
  constructor(scene, parentNode, x, y, z, id = 'hazard_crystal', scale = 1.0) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = id;
    this.scale = scale;

    this.position = new Vector3(x, y, z);
    this.radius = 0.68 * scale;
    this.pulseTime = Math.random() * Math.PI * 2;

    this.root = new TransformNode(`hazard_crystal_${id}`, this.scene);
    this.root.position.copyFrom(this.position);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    this.initMeshes();
  }

  initMeshes() {
    this.mat = new StandardMaterial(`mat_hazard_crystal_${this.id}`, this.scene);
    this.mat.diffuseColor = new Color3(0.95, 0.16, 0.14);
    this.mat.emissiveColor = new Color3(0.75, 0.08, 0.06);
    this.mat.specularColor = new Color3(1.0, 0.5, 0.4);
    this.mat.maxSimultaneousLights = 8;

    const baseMat = new StandardMaterial(`mat_hazard_base_${this.id}`, this.scene);
    baseMat.diffuseColor = new Color3(0.18, 0.10, 0.12);
    baseMat.specularColor = new Color3(0.04, 0.02, 0.02);
    baseMat.maxSimultaneousLights = 8;
    baseMat.freeze();

    // Socle rocheux noirci
    const base = MeshBuilder.CreateCylinder(`hc_base_${this.id}`, {
      height: 0.24 * this.scale,
      diameterTop: 0.95 * this.scale,
      diameterBottom: 1.25 * this.scale,
      tessellation: 6
    }, this.scene);
    base.material = baseMat;
    base.position.y = 0.12 * this.scale;
    base.parent = this.root;
    base.freezeWorldMatrix();

    // 4 pointes acérées rouges inclinées
    const spikes = [
      { ox: 0, oz: 0, h: 1.65, r: 0.28, rx: 0.05, rz: -0.05 },
      { ox: 0.26, oz: 0.14, h: 1.15, r: 0.20, rx: 0.30, rz: -0.35 },
      { ox: -0.24, oz: 0.18, h: 1.05, r: 0.19, rx: -0.25, rz: 0.32 },
      { ox: 0.04, oz: -0.26, h: 0.95, r: 0.18, rx: -0.36, rz: -0.10 }
    ];

    spikes.forEach((sp, idx) => {
      const mesh = MeshBuilder.CreateCylinder(`hc_spike_${this.id}_${idx}`, {
        height: sp.h * this.scale,
        diameterTop: 0.02,
        diameterBottom: sp.r * 2.0 * this.scale,
        tessellation: 5
      }, this.scene);
      mesh.material = this.mat;
      mesh.position.set(sp.ox * this.scale, (sp.h * this.scale) * 0.45, sp.oz * this.scale);
      mesh.rotation.x = sp.rx;
      mesh.rotation.z = sp.rz;
      mesh.parent = this.root;
      mesh.freezeWorldMatrix();
    });
  }

  /**
   * Animation de pulsation dangereuse + détection de contact avec Zelya.
   */
  update(dt, player) {
    this.pulseTime += dt * 4.5;
    const pulse = 0.55 + Math.sin(this.pulseTime) * 0.30;
    this.mat.emissiveColor.set(0.85 * pulse, 0.09 * pulse, 0.06 * pulse);

    if (!player) return;

    const pPos = player.getPosition();
    if (Math.abs(pPos.y - this.position.y) > 1.2) return;

    const dx = pPos.x - this.position.x;
    const dz = pPos.z - this.position.z;
    const hitRadius = this.radius + (player.radius || 0.38);

    if (dx * dx + dz * dz < hitRadius * hitRadius) {
      const dist = Math.hypot(dx, dz) || 1.0;
      player.takeDamage(1, { x: dx / dist, z: dz / dist });
    }
  }

  dispose() {
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
