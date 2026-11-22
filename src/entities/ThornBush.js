import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * ThornBush.js — Buisson épineux hostile & obstacle de ronces.
 * Conforme aux directives :
 * - Visuellement distinct des buissons normaux (ronces sombres, teintes pourpres/bordeaux, épines aiguisées).
 * - Inflige 1 dégât (1/2 cœur) au joueur s'il s'approche sans le couper.
 * - Peut être tranché à l'épée avec projection d'éclats de ronces sèches.
 * - Réinitialisable lors d'un respawn du joueur.
 */
export class ThornBush {
  constructor(scene, position, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.position = position.clone();
    this.isCut = false;
    this.radius = 0.80;
    this.damageCooldown = 0;

    this.root = new TransformNode('ThornBushNode', this.scene);
    this.root.position.copyFrom(this.position);

    this.meshes = [];
    this.initMesh();
  }

  initMesh() {
    // 1. Matériau de l'écorce épineuse sombre (ronces des ténèbres)
    const barkMat = new StandardMaterial('mat_thorn_bark', this.scene);
    barkMat.diffuseColor = new Color3(0.24, 0.18, 0.16); // Brun foncé ardoise
    barkMat.specularColor = new Color3(0.08, 0.04, 0.04);

    // 2. Matériau des épines et aiguilles tranchantes (bordeaux pourpre menaçant)
    const thornMat = new StandardMaterial('mat_thorn_spikes', this.scene);
    thornMat.diffuseColor = new Color3(0.72, 0.14, 0.22);
    thornMat.emissiveColor = new Color3(0.32, 0.04, 0.08); // Faible éclat venimeux rétro
    thornMat.specularColor = new Color3(0.9, 0.4, 0.4);

    // 3. Corps central noueux du buisson de ronces (sphère basse subdivision anguleuse)
    const core = MeshBuilder.CreateSphere('thorn_core', {
      diameterX: 1.30,
      diameterY: 1.05,
      diameterZ: 1.30,
      segments: 5
    }, this.scene);
    core.material = barkMat;
    core.position.y = 0.52;
    core.parent = this.root;
    this.meshes.push(core);

    // 4. Couronne de sarments et branches entrelacées
    const branchMat = new StandardMaterial('mat_thorn_branch', this.scene);
    branchMat.diffuseColor = new Color3(0.18, 0.13, 0.12);

    const ring = MeshBuilder.CreateTorus('thorn_ring', {
      diameter: 1.25,
      thickness: 0.16,
      tessellation: 8
    }, this.scene);
    ring.material = branchMat;
    ring.position.y = 0.48;
    ring.rotation.x = 0.25;
    ring.parent = this.root;
    this.meshes.push(ring);

    // 5. Épines coniques agressives réparties tout autour du buisson
    const thornOffsets = [
      // Épines supérieures
      { pos: new Vector3(0.35, 0.95, 0.20), rot: new Vector3(-0.4, 0.3, 0.6), scale: 1.1 },
      { pos: new Vector3(-0.35, 0.90, -0.25), rot: new Vector3(0.4, -0.5, -0.6), scale: 1.0 },
      { pos: new Vector3(0.0, 1.05, 0.0), rot: new Vector3(0, 0, 0), scale: 1.2 },

      // Épines latérales (hauteur de frappe du joueur)
      { pos: new Vector3(0.65, 0.55, 0.0), rot: new Vector3(0, 0, -1.3), scale: 1.15 },
      { pos: new Vector3(-0.65, 0.55, 0.0), rot: new Vector3(0, 0, 1.3), scale: 1.15 },
      { pos: new Vector3(0.0, 0.55, 0.65), rot: new Vector3(1.3, 0, 0), scale: 1.15 },
      { pos: new Vector3(0.0, 0.55, -0.65), rot: new Vector3(-1.3, 0, 0), scale: 1.15 },

      // Épines diagonales
      { pos: new Vector3(0.45, 0.45, 0.45), rot: new Vector3(0.8, 0.8, -0.8), scale: 0.95 },
      { pos: new Vector3(-0.45, 0.45, 0.45), rot: new Vector3(0.8, -0.8, 0.8), scale: 0.95 },
      { pos: new Vector3(0.45, 0.45, -0.45), rot: new Vector3(-0.8, 0.8, -0.8), scale: 0.95 },
      { pos: new Vector3(-0.45, 0.45, -0.45), rot: new Vector3(-0.8, -0.8, 0.8), scale: 0.95 }
    ];

    thornOffsets.forEach((t, idx) => {
      const spike = MeshBuilder.CreateCylinder(`thorn_spike_${idx}`, {
        height: 0.42 * t.scale,
        diameterTop: 0,
        diameterBottom: 0.18 * t.scale,
        tessellation: 4 // Aspect taillé / pyramide effilée
      }, this.scene);
      spike.material = thornMat;
      spike.position.copyFrom(t.pos);
      spike.rotation.copyFrom(t.rot);
      spike.parent = this.root;
      this.meshes.push(spike);
    });
  }

  getPosition() {
    return this.root.position;
  }

  // Vérifie si le joueur entre en collision avec les épines
  checkPlayerContact(player, dt) {
    if (this.isCut) return;

    if (this.damageCooldown > 0) {
      this.damageCooldown -= dt;
      return;
    }

    // Si le joueur est en pleine roulade, il esquive les épines avec style !
    if (player.isDodgeRolling) return;

    const pPos = player.getPosition();
    const dx = pPos.x - this.root.position.x;
    const dz = pPos.z - this.root.position.z;
    const distSq = dx * dx + dz * dz;
    const contactThreshold = this.radius + player.radius * 0.70;

    if (distSq < contactThreshold * contactThreshold) {
      const dist = Math.sqrt(distSq) || 0.001;
      const knockbackDir = new Vector3(dx / dist, 0, dz / dist);

      // Inflige 1 dégât (soit exactement 1/2 cœur dans le système 6 PV = 3 cœurs)
      const hit = player.takeDamage(1, knockbackDir);
      if (hit) {
        this.damageCooldown = 1.1; // Cooldown de 1.1s pour laisser le temps au recul de s'effectuer proprement
      }
    }
  }

  // Tranche le buisson épineux à l'épée
  cut() {
    if (this.isCut) return;
    this.isCut = true;

    if (this.audio) {
      this.audio.playBushCut();
    }

    // Explosion de débris de ronces sèches et d'épines rouges
    this.spawnThornDebris();

    // Suppression visuelle du buisson
    this.clearMeshes();
  }

  spawnThornDebris() {
    const debrisMat = new StandardMaterial('mat_thorn_debris', this.scene);
    debrisMat.diffuseColor = new Color3(0.55, 0.16, 0.18);

    for (let i = 0; i < 8; i++) {
      const splinter = MeshBuilder.CreateBox('thorn_splinter', {
        width: 0.20,
        height: 0.08,
        depth: 0.12
      }, this.scene);
      splinter.material = debrisMat;
      splinter.position.set(
        this.root.position.x + (Math.random() - 0.5) * 0.9,
        0.5 + Math.random() * 0.4,
        this.root.position.z + (Math.random() - 0.5) * 0.9
      );

      const vel = new Vector3(
        (Math.random() - 0.5) * 4.5,
        2.2 + Math.random() * 2.2,
        (Math.random() - 0.5) * 4.5
      );

      let life = 0.42;
      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        splinter.position.addInPlace(vel.scale(dt));
        splinter.rotation.x += 5 * dt;
        splinter.rotation.y += 4 * dt;
        vel.y -= 10.5 * dt;

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          splinter.dispose();
        }
      });
    }
  }

  clearMeshes() {
    this.meshes.forEach(m => {
      if (m) m.dispose();
    });
    this.meshes = [];
  }

  reset() {
    if (this.isCut) {
      this.clearMeshes();
      this.isCut = false;
      this.damageCooldown = 0;
      this.initMesh();
    }
  }

  dispose() {
    this.clearMeshes();
    this.root.dispose();
  }
}
