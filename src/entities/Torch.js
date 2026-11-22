import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  PointLight
} from '@babylonjs/core';

/**
 * Torch.js — Brasero antique de caverne.
 * Conforme à AGENT.md & GDD.md :
 * - Piédestal en pierre sculptée & vasque en fer forgé rétro.
 * - État éteint au départ (braises noires).
 * - Allumable avec l'épée (Frappe d'épée ou contact en Mode Torche).
 * - Effet visuel rétro soigné : gerbe d'étincelles à l'allumage, flamme facettée animée,
 *   lueur GlowLayer et PointLight dynamique avec scintillement organique doux.
 * - Hitbox circulaire solide dans le CollisionManager.
 */
export class Torch {
  constructor(scene, parentNode, x, y, z, id = 'torch', options = {}) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = id;

    this.position = new Vector3(x, y, z);
    this.isLit = options.startLit || false;
    this.radius = 0.58; // Rayon de hitbox solide et détection de coup

    this.lightRange = options.lightRange || 22.0;
    this.baseLightIntensity = options.lightIntensity || 4.8;

    this.root = new TransformNode(`torch_root_${id}`, this.scene);
    this.root.position.copyFrom(this.position);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    // Animation de flamme & lueur
    this.flameTime = Math.random() * 10;
    this.igniteAnimTimer = 0;
    this.isIgniting = false;

    // Particules de braises flottantes continues
    this.embers = [];

    // Nœuds graphiques
    this.flameNode = null;
    this.flameOuter = null;
    this.flameInner = null;
    this.pointLight = null;

    this.initMeshes();
    this.initFlame();
    this.initLight();
    this.initEmbers();

    if (this.isLit) {
      this.setLitVisuals(true);
    }
  }

  initMeshes() {
    // 1. Matériau Socle en Pierre taillée
    const stoneMat = new StandardMaterial(`mat_torch_stone_${this.id}`, this.scene);
    stoneMat.diffuseColor = new Color3(0.24, 0.27, 0.33);
    stoneMat.specularColor = new Color3(0.04, 0.05, 0.06);
    stoneMat.maxSimultaneousLights = 8;
    stoneMat.freeze();

    // 2. Matériau Vasque en Fer forgé sombre
    const ironMat = new StandardMaterial(`mat_torch_iron_${this.id}`, this.scene);
    ironMat.diffuseColor = new Color3(0.16, 0.17, 0.20);
    ironMat.specularColor = new Color3(0.12, 0.12, 0.14);
    ironMat.maxSimultaneousLights = 8;
    ironMat.freeze();

    // 3. Matériau Braises / Charbon
    this.coalMat = new StandardMaterial(`mat_torch_coal_${this.id}`, this.scene);
    this.coalMat.diffuseColor = new Color3(0.08, 0.08, 0.09);
    this.coalMat.emissiveColor = new Color3(0.0, 0.0, 0.0);
    this.coalMat.specularColor = new Color3(0, 0, 0);

    // A. Piédestal inférieur octogonal
    const base = MeshBuilder.CreateCylinder(`torch_base_${this.id}`, {
      height: 0.65,
      diameter: 0.74,
      tessellation: 8
    }, this.scene);
    base.material = stoneMat;
    base.position.y = 0.325;
    base.parent = this.root;
    base.freezeWorldMatrix();

    // B. Anneau de maintien intermédiaire
    const ring = MeshBuilder.CreateCylinder(`torch_ring_${this.id}`, {
      height: 0.12,
      diameter: 0.82,
      tessellation: 8
    }, this.scene);
    ring.material = ironMat;
    ring.position.y = 0.65;
    ring.parent = this.root;
    ring.freezeWorldMatrix();

    // C. Vasque évasée en fer forgé
    const bowl = MeshBuilder.CreateCylinder(`torch_bowl_${this.id}`, {
      height: 0.38,
      diameterTop: 0.95,
      diameterBottom: 0.52,
      tessellation: 8
    }, this.scene);
    bowl.material = ironMat;
    bowl.position.y = 0.84;
    bowl.parent = this.root;
    bowl.freezeWorldMatrix();

    // D. Foyer de braises intérieures
    const coals = MeshBuilder.CreateCylinder(`torch_coals_${this.id}`, {
      height: 0.08,
      diameter: 0.78,
      tessellation: 8
    }, this.scene);
    coals.material = this.coalMat;
    coals.position.y = 0.94;
    coals.parent = this.root;
    coals.freezeWorldMatrix();
  }

  initFlame() {
    this.flameNode = new TransformNode(`torch_flame_node_${this.id}`, this.scene);
    this.flameNode.position.y = 0.98;
    this.flameNode.parent = this.root;

    // Matériau Flamme Extérieure (Orange éclatant rétro)
    const flameOuterMat = new StandardMaterial(`mat_flame_out_${this.id}`, this.scene);
    flameOuterMat.diffuseColor = new Color3(1.0, 0.68, 0.18);
    flameOuterMat.emissiveColor = new Color3(1.0, 0.58, 0.10);
    flameOuterMat.specularColor = new Color3(0, 0, 0);

    // Matériau Cœur de Flamme (Jaune doré éclatant)
    const flameInnerMat = new StandardMaterial(`mat_flame_in_${this.id}`, this.scene);
    flameInnerMat.diffuseColor = new Color3(1.0, 0.98, 0.70);
    flameInnerMat.emissiveColor = new Color3(1.0, 0.95, 0.55);
    flameInnerMat.specularColor = new Color3(0, 0, 0);

    // A. Flamme externe facettée (cône low-poly)
    this.flameOuter = MeshBuilder.CreateCylinder(`torch_flame_out_${this.id}`, {
      height: 0.88,
      diameterTop: 0.04,
      diameterBottom: 0.54,
      tessellation: 5
    }, this.scene);
    this.flameOuter.material = flameOuterMat;
    this.flameOuter.position.y = 0.44;
    this.flameOuter.parent = this.flameNode;

    // B. Cœur interne incandescent
    this.flameInner = MeshBuilder.CreateCylinder(`torch_flame_in_${this.id}`, {
      height: 0.58,
      diameterTop: 0.02,
      diameterBottom: 0.32,
      tessellation: 4
    }, this.scene);
    this.flameInner.material = flameInnerMat;
    this.flameInner.position.y = 0.30;
    this.flameInner.parent = this.flameNode;

    // Désactivée au départ si non allumée
    this.flameNode.setEnabled(this.isLit);
  }

  initLight() {
    this.pointLight = new PointLight(
      `torch_light_${this.id}`,
      new Vector3(this.position.x, this.position.y + 1.55, this.position.z),
      this.scene
    );
    this.pointLight.diffuse = new Color3(1.0, 0.76, 0.38); // Éclairage puissant et chaleureux du feu
    this.pointLight.specular = new Color3(0.85, 0.55, 0.20);
    this.pointLight.range = this.lightRange;
    this.pointLight.intensity = this.isLit ? this.baseLightIntensity : 0.0;
    this.pointLight.setEnabled(this.isLit);
  }

  initEmbers() {
    const emberMat = new StandardMaterial(`mat_ember_${this.id}`, this.scene);
    emberMat.diffuseColor = new Color3(1.0, 0.7, 0.1);
    emberMat.emissiveColor = new Color3(1.0, 0.5, 0.05);
    emberMat.specularColor = new Color3(0, 0, 0);
    emberMat.freeze();

    // 5 petites étincelles / braises montantes
    for (let i = 0; i < 5; i++) {
      const ember = MeshBuilder.CreateBox(`ember_${this.id}_${i}`, {
        width: 0.07,
        height: 0.07,
        depth: 0.07
      }, this.scene);
      ember.material = emberMat;
      ember.position.set(0, 1.0 + Math.random() * 0.8, 0);
      ember.parent = this.root;
      ember.setEnabled(this.isLit);

      this.embers.push({
        mesh: ember,
        baseY: 1.0,
        height: 0.8 + Math.random() * 0.8,
        progress: Math.random(),
        speed: 0.8 + Math.random() * 0.7,
        driftX: (Math.random() - 0.5) * 0.22,
        driftZ: (Math.random() - 0.5) * 0.22
      });
    }
  }

  setLitVisuals(lit) {
    this.isLit = lit;
    if (this.flameNode) this.flameNode.setEnabled(lit);
    if (this.pointLight) {
      this.pointLight.setEnabled(lit);
      this.pointLight.intensity = lit ? this.baseLightIntensity : 0.0;
    }
    if (this.coalMat) {
      this.coalMat.emissiveColor = lit ? new Color3(0.8, 0.25, 0.05) : new Color3(0, 0, 0);
    }
    this.embers.forEach(e => e.mesh.setEnabled(lit));
  }

  /**
   * Allume le brasero : explosion d'étincelles, jaillissement de la flamme et lumière vive.
   */
  ignite(cameraManager = null, audioManager = null) {
    if (this.isLit) return false;

    this.isLit = true;
    this.isIgniting = true;
    this.igniteAnimTimer = 0.35; // Durée de l'effet d'expansion initiale

    this.setLitVisuals(true);

    // Son de jaillissement
    if (audioManager && typeof audioManager.playTorchIgnite === 'function') {
      audioManager.playTorchIgnite();
    }

    // Légère vibration de feedback
    if (cameraManager) {
      cameraManager.shake(0.08, 0.14);
    }

    // Gerbe d'étincelles explosives
    this.spawnIgniteSparks();

    return true;
  }

  // Particules d'étincelles jaillissant lors du premier coup d'épée
  spawnIgniteSparks() {
    const sparkMat = new StandardMaterial(`mat_sparks_${this.id}`, this.scene);
    sparkMat.diffuseColor = new Color3(1.0, 0.85, 0.3);
    sparkMat.emissiveColor = new Color3(1.0, 0.7, 0.15);
    sparkMat.specularColor = new Color3(1, 1, 1);

    const count = 14;
    for (let i = 0; i < count; i++) {
      const spark = MeshBuilder.CreateBox(`spark_${this.id}_${i}`, {
        width: 0.10,
        height: 0.10,
        depth: 0.10
      }, this.scene);
      spark.material = sparkMat;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speedHoriz = 1.2 + Math.random() * 1.5;
      const vx = Math.cos(angle) * speedHoriz;
      const vz = Math.sin(angle) * speedHoriz;
      let vy = 2.4 + Math.random() * 1.8;

      spark.position.set(this.position.x, this.position.y + 1.05, this.position.z);

      let life = 0.42;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        vy -= 6.5 * dt; // Gravité

        spark.position.x += vx * dt;
        spark.position.y += vy * dt;
        spark.position.z += vz * dt;

        spark.rotation.x += 4 * dt;
        spark.rotation.y += 5 * dt;

        const s = Math.max(0.01, (life / 0.42) * 1.2);
        spark.scaling.set(s, s, s);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          spark.dispose();
          if (i === count - 1 && sparkMat) sparkMat.dispose();
        }
      });
    }
  }

  /**
   * Vérifie si le coup d'épée frappe ce brasero.
   */
  checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager = null, audioManager = null) {
    if (this.isLit) return false;

    const hit = weapon.checkHit(playerPos, playerFacingAngle, this.position, this.radius);
    if (hit) {
      return this.ignite(cameraManager, audioManager);
    }
    return false;
  }

  /**
   * Vérifie si Zelya s'approche avec l'épée brandie en Mode Torche.
   */
  checkProximity(playerPos, isTorchMode, cameraManager = null, audioManager = null) {
    if (this.isLit || !isTorchMode) return false;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    // Contact direct avec l'aura de lumière de l'épée
    if (distSq < 1.45 * 1.45) {
      return this.ignite(cameraManager, audioManager);
    }
    return false;
  }

  /**
   * Enregistre le cylindre solide de collision dans le CollisionManager.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;
    collisionManager.addCircle(this.position.x, this.position.z, this.radius, `torch_${this.id}`, 'cavern');
  }

  /**
   * Animation continue de la flamme et du scintillement de la lumière.
   */
  update(dt) {
    if (!this.isLit) return;

    this.flameTime += dt * 14.0;

    // 1. Rebondissement et jaillissement initial à l'allumage
    if (this.isIgniting) {
      this.igniteAnimTimer -= dt;
      const progress = Math.max(0, this.igniteAnimTimer / 0.35); // 1.0 -> 0.0
      const popScale = 1.0 + Math.sin(progress * Math.PI) * 0.55;
      if (this.flameNode) {
        this.flameNode.scaling.set(popScale, popScale * 1.2, popScale);
      }
      if (this.pointLight) {
        this.pointLight.intensity = this.baseLightIntensity * (1.0 + progress * 0.6);
      }
      if (this.igniteAnimTimer <= 0) {
        this.isIgniting = false;
      }
    } else {
      // 2. Scintillement régulier et respiration organique de la flamme
      const wobbleY = 1.0 + Math.sin(this.flameTime) * 0.12 + Math.sin(this.flameTime * 2.3) * 0.06;
      const wobbleXZ = 1.0 + Math.cos(this.flameTime * 1.7) * 0.08;
      if (this.flameNode) {
        this.flameNode.scaling.set(wobbleXZ, wobbleY, wobbleXZ);
        this.flameNode.rotation.y += dt * 1.5;
      }

      // Scintillement de la lumière projetée sur les murs et le sol
      if (this.pointLight) {
        const flicker = Math.sin(this.flameTime * 1.1) * 0.22 + Math.cos(this.flameTime * 2.5) * 0.14;
        this.pointLight.intensity = Math.max(0.6, this.baseLightIntensity + flicker);
      }
    }

    // 3. Montée douce des étincelles et braises
    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      e.progress += dt * e.speed;
      if (e.progress >= 1.0) {
        e.progress = 0;
        e.driftX = (Math.random() - 0.5) * 0.25;
        e.driftZ = (Math.random() - 0.5) * 0.25;
      }

      e.mesh.position.y = e.baseY + e.progress * e.height;
      e.mesh.position.x = Math.sin(e.progress * Math.PI * 2) * e.driftX;
      e.mesh.position.z = Math.cos(e.progress * Math.PI * 2) * e.driftZ;

      // Fondu de taille en montant
      const scale = Math.sin(e.progress * Math.PI) * 1.0;
      e.mesh.scaling.set(scale, scale, scale);
    }
  }

  dispose() {
    if (this.pointLight) {
      this.pointLight.dispose();
      this.pointLight = null;
    }
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
