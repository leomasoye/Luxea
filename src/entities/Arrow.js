import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * Arrow.js — Projectile flèche tirée par les Squelettes Archers.
 * Conforme à AGENT.md :
 * - Géométrie low-poly lisible (fût en bois, pointe métallique brillante, empennage).
 * - Trajectoire fluide 3D, vitesse lisible et esquivable.
 * - Gestion propre des collisions contre les obstacles de la caverne et contre Zelya.
 * - Nettoyage mémoire propre (dispose) à l'impact ou en fin de vie.
 */
export class Arrow {
  constructor(scene, parentNode, origin, direction, options = {}) {
    this.scene = scene;
    this.parentNode = parentNode;

    this.speed = options.speed || 11.5;
    this.damage = options.damage || 1;
    this.maxLife = options.maxLife || 2.8;
    this.life = this.maxLife;
    this.radius = 0.22;
    this.isAlive = true;

    this.position = origin.clone();
    this.direction = direction.clone().normalize();

    this.root = new TransformNode('arrow_root', this.scene);
    this.root.position.copyFrom(this.position);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    // Orientation 3D de la flèche dans le sens du vol (+Z local = avant)
    const yaw = Math.atan2(this.direction.x, this.direction.z);
    const horiz = Math.hypot(this.direction.x, this.direction.z) || 0.0001;
    const pitch = -Math.atan2(this.direction.y, horiz);
    this.root.rotation.set(pitch, yaw, 0);

    this.initMeshes();
  }

  initMeshes() {
    // Matériaux partagés/légers pour la flèche
    const shaftMat = new StandardMaterial('mat_arrow_shaft', this.scene);
    shaftMat.diffuseColor = new Color3(0.48, 0.32, 0.16);
    shaftMat.specularColor = new Color3(0.05, 0.04, 0.02);
    shaftMat.freeze();

    const tipMat = new StandardMaterial('mat_arrow_tip', this.scene);
    tipMat.diffuseColor = new Color3(0.95, 0.85, 0.45);
    tipMat.emissiveColor = new Color3(0.85, 0.45, 0.12); // Lueur chaude rétro pour une lisibilité parfaite dans le noir
    tipMat.specularColor = new Color3(1.0, 0.9, 0.6);
    tipMat.freeze();

    const featherMat = new StandardMaterial('mat_arrow_feather', this.scene);
    featherMat.diffuseColor = new Color3(0.90, 0.28, 0.22);
    featherMat.emissiveColor = new Color3(0.35, 0.08, 0.06);
    featherMat.specularColor = new Color3(0, 0, 0);
    featherMat.freeze();

    // 1. Fût en bois
    const shaft = MeshBuilder.CreateBox('arrow_shaft', {
      width: 0.06,
      height: 0.06,
      depth: 0.82
    }, this.scene);
    shaft.material = shaftMat;
    shaft.parent = this.root;

    // 2. Pointe de flèche pyramidale / conique
    const tip = MeshBuilder.CreateCylinder('arrow_tip', {
      height: 0.22,
      diameterTop: 0.01,
      diameterBottom: 0.16,
      tessellation: 4
    }, this.scene);
    tip.material = tipMat;
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.48;
    tip.parent = this.root;

    // 3. Empennage en croix (plumes rouges)
    const f1 = MeshBuilder.CreateBox('arrow_f1', { width: 0.20, height: 0.03, depth: 0.20 }, this.scene);
    f1.material = featherMat;
    f1.position.z = -0.34;
    f1.parent = this.root;

    const f2 = MeshBuilder.CreateBox('arrow_f2', { width: 0.03, height: 0.20, depth: 0.20 }, this.scene);
    f2.material = featherMat;
    f2.position.z = -0.34;
    f2.parent = this.root;
  }

  /**
   * Met à jour le vol de la flèche et teste les collisions (murs + joueur).
   */
  update(dt, player, collisionManager) {
    if (!this.isAlive) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.destroy(false);
      return;
    }

    // Avancée par sous-pas pour éviter le tunneling à travers les piliers ou le joueur
    const totalStep = this.speed * dt;
    const subSteps = Math.max(1, Math.ceil(totalStep / 0.25));
    const step = totalStep / subSteps;

    const staticColliders = collisionManager ? collisionManager.staticColliders : null;
    const currentZone = collisionManager ? collisionManager.currentZone : 'cavern';

    for (let s = 0; s < subSteps; s++) {
      this.position.x += this.direction.x * step;
      this.position.y += this.direction.y * step;
      this.position.z += this.direction.z * step;

      // 1. Collision avec le sol ou le plafond
      if (this.position.y < 0.08 || this.position.y > 12.5) {
        this.destroy(true);
        return;
      }

      // 2. Collision avec les obstacles statiques de la caverne (murs, piliers, stalagmites, rochers)
      if (staticColliders) {
        for (let i = 0; i < staticColliders.length; i++) {
          const col = staticColliders[i];
          if (col.zone && col.zone !== currentZone) continue;

          if (this.intersectsCollider(col)) {
            this.destroy(true);
            return;
          }
        }
      }

      // 3. Collision avec le joueur (Zelya)
      if (player) {
        const pPos = player.getPosition();
        const dx = this.position.x - pPos.x;
        const dz = this.position.z - pPos.z;
        const hitDist = this.radius + (player.radius || 0.38);

        // Vérification verticale (hauteur du corps de Zelya : Y à Y + 1.65)
        const dyOk = this.position.y >= pPos.y - 0.1 && this.position.y <= pPos.y + 1.65;

        if (dyOk && (dx * dx + dz * dz) < hitDist * hitDist) {
          // Si Zelya est en roulade d'esquive, la flèche passe au-dessus sans la toucher
          if (player.isDodgeRolling) {
            continue;
          }

          const hitApplied = player.takeDamage(this.damage, {
            x: this.direction.x,
            z: this.direction.z
          });

          // La flèche se brise à l'impact
          this.destroy(true);
          return;
        }
      }
    }

    this.root.position.copyFrom(this.position);
  }

  intersectsCollider(col) {
    // Les parapets bas de la terrasse (Y <= 2.7) ne bloquent pas les flèches tirées au-dessus
    if (col.tag && (col.tag.startsWith('terrace_parapet') || col.tag.startsWith('ramp_curb'))) {
      if (this.position.y > 2.35) return false;
    }

    if (col.type === 'circle') {
      const dx = this.position.x - col.x;
      const dz = this.position.z - col.z;
      const r = this.radius + col.radius * 0.9;
      return (dx * dx + dz * dz) < r * r;
    } else if (col.type === 'box') {
      const cx = Math.max(col.minX, Math.min(col.maxX, this.position.x));
      const cz = Math.max(col.minZ, Math.min(col.maxZ, this.position.z));
      const dx = this.position.x - cx;
      const dz = this.position.z - cz;
      return (dx * dx + dz * dz) < this.radius * this.radius;
    }
    return false;
  }

  /**
   * Détruit la flèche avec de petits éclats d'impact rétro.
   */
  destroy(withSparks = true) {
    if (!this.isAlive) return;
    this.isAlive = false;

    if (withSparks) {
      this.spawnImpactSparks();
    }

    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }

  spawnImpactSparks() {
    const sparkMat = new StandardMaterial('mat_arrow_spark', this.scene);
    sparkMat.diffuseColor = new Color3(1.0, 0.82, 0.35);
    sparkMat.emissiveColor = new Color3(0.95, 0.55, 0.15);
    sparkMat.specularColor = new Color3(0, 0, 0);

    const origin = this.position.clone();
    const count = 5;

    for (let i = 0; i < count; i++) {
      const p = MeshBuilder.CreateBox('arrow_spark', { width: 0.09, height: 0.09, depth: 0.09 }, this.scene);
      p.material = sparkMat;
      p.position.copyFrom(origin);

      const vx = -this.direction.x * 1.6 + (Math.random() - 0.5) * 2.4;
      let vy = 1.2 + Math.random() * 1.6;
      const vz = -this.direction.z * 1.6 + (Math.random() - 0.5) * 2.4;
      let life = 0.26;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        vy -= 8.0 * dt;
        p.position.x += vx * dt;
        p.position.y += vy * dt;
        p.position.z += vz * dt;
        p.rotation.x += 6 * dt;
        p.rotation.y += 5 * dt;
        const s = Math.max(0.01, life / 0.26);
        p.scaling.set(s, s, s);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          p.dispose();
          if (i === count - 1 && sparkMat) sparkMat.dispose();
        }
      });
    }
  }

  dispose() {
    this.isAlive = false;
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
