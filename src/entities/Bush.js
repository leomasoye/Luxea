import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * Bush.js — Buisson tranchable rétro & système de récompense (drops de cœurs).
 * Conforme à AGENT.md & GDD.md :
 * - Géométrie low-poly découpable d'un coup d'épée.
 * - Explosion de particules végétales / débris à la coupe.
 * - Butin : probabilité de faire apparaître un cœur régénérateur.
 */
export class Bush {
  constructor(scene, position, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.isCut = false;

    this.root = new TransformNode('BushNode', this.scene);
    this.root.position.copyFrom(position);

    this.mesh = null;
    this.heartPickup = null;

    this.initMesh();
  }

  initMesh() {
    // Matériau vert feuille rétro
    const bushMat = new StandardMaterial('mat_bush', this.scene);
    bushMat.diffuseColor = new Color3(0.18, 0.68, 0.24);
    bushMat.specularColor = new Color3(0.05, 0.1, 0.05);

    // Corps du buisson (forme dodue low-poly)
    this.mesh = MeshBuilder.CreateSphere('bushMesh', {
      diameterX: 1.35,
      diameterY: 1.05,
      diameterZ: 1.35,
      segments: 6
    }, this.scene);
    this.mesh.material = bushMat;
    this.mesh.position.y = 0.52;
    this.mesh.parent = this.root;
  }

  getPosition() {
    return this.root.position;
  }

  // Découpe le buisson
  cut(spawnHeartCallback) {
    if (this.isCut) return;
    this.isCut = true;

    this.audio.playBushCut();

    // Effet visuel de destruction (petites feuilles qui volent puis disparaissent)
    this.spawnLeafDebris();

    // Disparition du buisson principal
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    // Probabilité d'apparition d'un cœur (40% de chance)
    if (Math.random() < 0.40) {
      this.spawnHeart(spawnHeartCallback);
    }
  }

  spawnLeafDebris() {
    const leafMat = new StandardMaterial('mat_leaf_debris', this.scene);
    leafMat.diffuseColor = new Color3(0.25, 0.85, 0.3);

    for (let i = 0; i < 6; i++) {
      const leaf = MeshBuilder.CreateBox('leafDebris', {
        width: 0.22,
        height: 0.12,
        depth: 0.22
      }, this.scene);
      leaf.material = leafMat;
      leaf.position.set(
        this.root.position.x + (Math.random() - 0.5) * 0.8,
        this.root.position.y + 0.5 + Math.random() * 0.4,
        this.root.position.z + (Math.random() - 0.5) * 0.8
      );

      // Trajectoire éphémère
      const vel = new Vector3(
        (Math.random() - 0.5) * 4,
        2.5 + Math.random() * 2,
        (Math.random() - 0.5) * 4
      );

      let life = 0.4;
      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        leaf.position.addInPlace(vel.scale(dt));
        leaf.rotation.x += 4 * dt;
        leaf.rotation.y += 3 * dt;
        vel.y -= 9.8 * dt; // Gravité

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          leaf.dispose();
        }
      });
    }
  }

  spawnHeart(callback) {
    const heart = new HeartPickup(this.scene, this.root.position.clone(), this.audio);
    if (callback) callback(heart);
  }

  dispose() {
    if (this.mesh) this.mesh.dispose();
    this.root.dispose();
  }
}

/**
 * HeartPickup — Cœur de santé flottant rétro.
 */
export class HeartPickup {
  constructor(scene, position, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.collected = false;

    this.root = new TransformNode('HeartPickupRoot', this.scene);
    this.root.position.copyFrom(position);
    this.root.position.y = 0.6;

    this.animTimer = 0;
    this.mesh = null;

    this.initMesh();
  }

  initMesh() {
    const heartMat = new StandardMaterial('mat_heart_pickup', this.scene);
    heartMat.diffuseColor = new Color3(1.0, 0.15, 0.3);
    heartMat.emissiveColor = new Color3(0.6, 0.05, 0.15);

    // Forme prismatique rétro en diamant / cœur
    this.mesh = MeshBuilder.CreateBox('heartMesh', {
      width: 0.38,
      height: 0.38,
      depth: 0.38
    }, this.scene);
    this.mesh.material = heartMat;
    this.mesh.rotation.y = Math.PI / 4;
    this.mesh.rotation.x = Math.PI / 4;
    this.mesh.parent = this.root;
  }

  getPosition() {
    return this.root.position;
  }

  update(dt, player) {
    if (this.collected) return;

    // Rotation et flottaison périodique
    this.animTimer += dt * 3.5;
    this.root.rotation.y += dt * 2.2;
    this.root.position.y = 0.6 + Math.sin(this.animTimer) * 0.14;

    // Détection de ramassage par Zalya
    const pPos = player.getPosition();
    const dx = pPos.x - this.root.position.x;
    const dz = pPos.z - this.root.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 1.4 * 1.4) {
      this.collected = true;
      player.heal(2); // Rend 1 cœur plein
      this.dispose();
    }
  }

  dispose() {
    if (this.mesh) this.mesh.dispose();
    this.root.dispose();
  }
}
