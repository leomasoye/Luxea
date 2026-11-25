import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * BreakableRock.js — Amas de pierres fissurées cassables en 2 coups d'épée.
 * Conforme à AGENT.md :
 * - Dissimule un interrupteur secret au sol dans la Caverne du Gardien.
 * - Fissures subtilement lumineuses (encore plus visibles en Mode Torche) pour guider le joueur.
 * - Feedback d'impact (secousse, éclats de pierre) et destruction complète au 2e coup.
 */
export class BreakableRock {
  constructor(scene, parentNode, x, y, z, id = 'breakable_rock', onBroken = null) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = id;
    this.onBroken = onBroken;

    this.position = new Vector3(x, y, z);
    this.radius = 1.05;
    this.health = 2;
    this.isBroken = false;
    this.hitCooldown = 0;
    this.shakeTimer = 0;

    this.root = new TransformNode(`breakable_rock_${id}`, this.scene);
    this.root.position.copyFrom(this.position);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    this.visualNode = new TransformNode(`breakable_rock_vis_${id}`, this.scene);
    this.visualNode.parent = this.root;

    this.initMeshes();
  }

  initMeshes() {
    this.rockMat = new StandardMaterial(`mat_brok_rock_${this.id}`, this.scene);
    this.rockMat.diffuseColor = new Color3(0.32, 0.30, 0.28);
    this.rockMat.specularColor = new Color3(0.06, 0.06, 0.05);
    this.rockMat.maxSimultaneousLights = 8;

    // Fissures dorées/lumineuses pour indiquer discrètement que le rocher est fragilisé
    this.crackMat = new StandardMaterial(`mat_brok_crack_${this.id}`, this.scene);
    this.crackMat.diffuseColor = new Color3(0.95, 0.80, 0.30);
    this.crackMat.emissiveColor = new Color3(0.30, 0.24, 0.08);
    this.crackMat.specularColor = new Color3(0, 0, 0);

    // Rocher principal facetté
    const mainRock = MeshBuilder.CreateSphere(`br_main_${this.id}`, { diameter: 1.75, segments: 3 }, this.scene);
    mainRock.material = this.rockMat;
    mainRock.scaling.set(1.15, 0.85, 1.05);
    mainRock.position.set(0, 0.62, 0);
    mainRock.parent = this.visualNode;

    // Rochers secondaires
    const sub1 = MeshBuilder.CreateSphere(`br_sub1_${this.id}`, { diameter: 1.0, segments: 3 }, this.scene);
    sub1.material = this.rockMat;
    sub1.position.set(-0.62, 0.36, 0.32);
    sub1.parent = this.visualNode;

    const sub2 = MeshBuilder.CreateSphere(`br_sub2_${this.id}`, { diameter: 0.9, segments: 3 }, this.scene);
    sub2.material = this.rockMat;
    sub2.position.set(0.58, 0.34, -0.25);
    sub2.parent = this.visualNode;

    // Fissures croisées visibles sur le dessus
    const crack1 = MeshBuilder.CreateBox(`br_crack1_${this.id}`, { width: 1.15, height: 0.06, depth: 0.08 }, this.scene);
    crack1.material = this.crackMat;
    crack1.position.set(0, 1.18, 0.12);
    crack1.rotation.y = 0.45;
    crack1.parent = this.visualNode;

    const crack2 = MeshBuilder.CreateBox(`br_crack2_${this.id}`, { width: 0.85, height: 0.06, depth: 0.07 }, this.scene);
    crack2.material = this.crackMat;
    crack2.position.set(0.10, 1.15, -0.08);
    crack2.rotation.y = -0.80;
    crack2.parent = this.visualNode;
  }

  getCollider() {
    if (this.isBroken) return null;
    return {
      type: 'circle',
      x: this.position.x,
      z: this.position.z,
      radius: this.radius,
      tag: `breakable_rock_${this.id}`,
      zone: 'cavern'
    };
  }

  checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager = null) {
    if (this.isBroken || this.hitCooldown > 0) return false;
    if (Math.abs(playerPos.y - this.position.y) > 1.2) return false;

    const hit = weapon.checkHit(playerPos, playerFacingAngle, this.position, this.radius);
    if (!hit) return false;

    this.health -= 1;
    this.hitCooldown = 0.30;
    this.shakeTimer = 0.22;

    if (cameraManager) {
      cameraManager.shake(0.16, 0.16);
    }

    this.spawnDebris(this.health <= 0 ? 12 : 5);

    if (this.health <= 0) {
      this.isBroken = true;
      this.root.setEnabled(false);
      if (typeof this.onBroken === 'function') {
        this.onBroken();
      }
    } else {
      // Au 1er coup, les fissures brillent davantage pour confirmer que le rocher va céder
      this.crackMat.emissiveColor.set(0.85, 0.65, 0.18);
      this.visualNode.scaling.set(0.92, 0.90, 0.92);
    }

    return true;
  }

  spawnDebris(count) {
    const debrisMat = new StandardMaterial(`mat_rock_debris_${this.id}`, this.scene);
    debrisMat.diffuseColor = new Color3(0.35, 0.33, 0.30);
    debrisMat.specularColor = new Color3(0, 0, 0);

    for (let i = 0; i < count; i++) {
      const chunk = MeshBuilder.CreateBox('rock_chunk', {
        width: 0.16 + Math.random() * 0.14,
        height: 0.14 + Math.random() * 0.12,
        depth: 0.16 + Math.random() * 0.14
      }, this.scene);
      chunk.material = debrisMat;
      chunk.position.set(
        this.position.x + (Math.random() - 0.5) * 0.9,
        this.position.y + 0.4 + Math.random() * 0.6,
        this.position.z + (Math.random() - 0.5) * 0.9
      );

      const angle = Math.random() * Math.PI * 2;
      const spd = 1.8 + Math.random() * 2.5;
      const vx = Math.cos(angle) * spd;
      let vy = 2.4 + Math.random() * 2.2;
      const vz = Math.sin(angle) * spd;
      let life = 0.55;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        vy -= 10.5 * dt;
        chunk.position.x += vx * dt;
        chunk.position.y = Math.max(this.position.y + 0.06, chunk.position.y + vy * dt);
        chunk.position.z += vz * dt;
        chunk.rotation.x += 5 * dt;
        chunk.rotation.y += 6 * dt;

        const s = Math.max(0.01, life / 0.55);
        chunk.scaling.set(s, s, s);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          chunk.dispose();
          if (i === count - 1 && debrisMat) debrisMat.dispose();
        }
      });
    }
  }

  update(dt, player = null) {
    if (this.isBroken) return;

    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.visualNode.position.x = (Math.random() - 0.5) * 0.14;
      this.visualNode.position.z = (Math.random() - 0.5) * 0.14;
      if (this.shakeTimer <= 0) {
        this.visualNode.position.set(0, 0, 0);
      }
    }

    // Résonance subtile des fissures quand Zelya approche en Mode Torche
    if (player && this.health === 2) {
      const pPos = player.getPosition();
      const distSq = (pPos.x - this.position.x) ** 2 + (pPos.z - this.position.z) ** 2;
      if (player.isTorchMode && distSq < 7.0 * 7.0) {
        this.crackMat.emissiveColor.set(0.75, 0.62, 0.22);
      } else {
        this.crackMat.emissiveColor.set(0.28, 0.22, 0.08);
      }
    }
  }

  dispose() {
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
