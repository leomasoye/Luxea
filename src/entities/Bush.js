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
  constructor(scene, position, audioManager, options = {}) {
    this.scene = scene;
    this.audio = audioManager;
    this.position = position.clone();
    this.isCut = false;

    // Options de variation (taille, forme, couleur, multi-lobes)
    this.scale = options.scale !== undefined ? options.scale : 1.0;
    this.scaleX = options.scaleX !== undefined ? options.scaleX : 1.0;
    this.scaleY = options.scaleY !== undefined ? options.scaleY : 1.0;
    this.scaleZ = options.scaleZ !== undefined ? options.scaleZ : 1.0;
    this.colorVariant = options.colorVariant || 0;
    this.multiLobe = !!options.multiLobe;

    this.radius = 0.75 * this.scale * Math.max(this.scaleX, this.scaleZ);

    this.root = new TransformNode('BushNode', this.scene);
    this.root.position.copyFrom(this.position);

    this.meshes = [];
    this.heartPickup = null;

    this.initMesh();
  }

  initMesh() {
    // Variations de nuances de vert rétro
    const greenVariants = [
      new Color3(0.18, 0.68, 0.24), // Vert émeraude standard
      new Color3(0.24, 0.74, 0.28), // Vert prairie frais
      new Color3(0.14, 0.58, 0.20), // Vert mousse forêt dense
      new Color3(0.26, 0.64, 0.18)  // Vert olive champêtre
    ];
    const diffuse = greenVariants[this.colorVariant % greenVariants.length];

    const bushMat = new StandardMaterial(`mat_bush_${this.colorVariant}`, this.scene);
    bushMat.diffuseColor = diffuse;
    bushMat.specularColor = new Color3(0.04, 0.08, 0.04);

    // Corps principal du buisson avec étirement spécifique
    const mainDiamX = 1.35 * this.scale * this.scaleX;
    const mainDiamY = 1.05 * this.scale * this.scaleY;
    const mainDiamZ = 1.35 * this.scale * this.scaleZ;

    const mainMesh = MeshBuilder.CreateSphere('bushMainMesh', {
      diameterX: mainDiamX,
      diameterY: mainDiamY,
      diameterZ: mainDiamZ,
      segments: 6
    }, this.scene);
    mainMesh.material = bushMat;
    mainMesh.position.y = (mainDiamY / 2);
    mainMesh.parent = this.root;
    this.meshes.push(mainMesh);

    // Clump multi-lobes asymétrique (petits lobes feuillus secondaires)
    if (this.multiLobe) {
      const lobe1 = MeshBuilder.CreateSphere('bushLobe1', {
        diameterX: mainDiamX * 0.68,
        diameterY: mainDiamY * 0.75,
        diameterZ: mainDiamZ * 0.68,
        segments: 5
      }, this.scene);
      lobe1.material = bushMat;
      lobe1.position.set(mainDiamX * 0.32, mainDiamY * 0.38, -mainDiamZ * 0.20);
      lobe1.parent = this.root;
      this.meshes.push(lobe1);

      const lobe2 = MeshBuilder.CreateSphere('bushLobe2', {
        diameterX: mainDiamX * 0.55,
        diameterY: mainDiamY * 0.65,
        diameterZ: mainDiamZ * 0.55,
        segments: 5
      }, this.scene);
      lobe2.material = bushMat;
      lobe2.position.set(-mainDiamX * 0.30, mainDiamY * 0.32, mainDiamZ * 0.25);
      lobe2.parent = this.root;
      this.meshes.push(lobe2);
    }
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

    // Disparition des maillages du buisson
    this.clearMeshes();

    // Probabilité d'apparition d'un cœur (40% de chance)
    if (Math.random() < 0.40) {
      this.spawnHeart(spawnHeartCallback);
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
      this.initMesh();
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
 * HeartPickup — Cœur de santé 3D flottant avec pulsation "battement de cœur" et ombre au sol.
 */
export class HeartPickup {
  constructor(scene, position, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.collected = false;

    this.root = new TransformNode('HeartPickupRoot', this.scene);
    this.root.position.copyFrom(position);

    this.animTimer = Math.random() * Math.PI; // Déphasage aléatoire si plusieurs cœurs
    this.meshes = [];
    this.shadowMesh = null;
    this.heartContainer = null;

    this.initMesh();
  }

  initMesh() {
    // Nœud conteneur pour le cœur (permet la rotation, flottement et pulsation)
    this.heartContainer = new TransformNode('HeartContainer', this.scene);
    this.heartContainer.parent = this.root;
    this.heartContainer.position.y = 0.55;

    // Matériau rouge rubis étincelant avec émission dans le noir (sans point blanc)
    const heartMat = new StandardMaterial('mat_heart_pickup', this.scene);
    heartMat.diffuseColor = new Color3(1.0, 0.12, 0.28);
    heartMat.emissiveColor = new Color3(0.72, 0.08, 0.22);
    heartMat.specularColor = new Color3(0.12, 0.02, 0.04);
    heartMat.specularPower = 16;

    // Modélisation paramétrique mathématique d'un cœur 3D véritable, lisse et galbé
    // x(t) = sin^3(t)
    // y(t) = (13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)) / 16
    // Zéro cube, zéro angle droit : une fente centrale, deux lobes galbés et une pointe inférieure effilée
    const numSlices = 7;
    const pointsPerSlice = 28;
    const paths = [];

    for (let s = 0; s < numSlices; s++) {
      const v = s / (numSlices - 1);
      const zNorm = (v - 0.5) * 2; // -1 à +1
      const rad = Math.sqrt(Math.max(0.001, 1 - zNorm * zNorm));
      const z = zNorm * 0.09;

      const path = [];
      for (let i = 0; i < pointsPerSlice; i++) {
        const t = (i / pointsPerSlice) * Math.PI * 2;
        const sinT = Math.sin(t);
        const x = Math.pow(sinT, 3);
        const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;

        // Échelle proportionnée : largeur ~0.38, hauteur ~0.35, épaisseur ~0.18
        const px = x * 0.19 * rad;
        const py = (y + 0.35) * 0.19 * rad;
        path.push(new Vector3(px, py, z));
      }
      path.push(path[0].clone()); // Ferme la tranche
      paths.push(path);
    }

    const heartMesh = MeshBuilder.CreateRibbon('heart_smooth_mesh', {
      pathArray: paths,
      closeArray: false,
      closePath: false,
      sideOrientation: 2 // Mesh.DOUBLESIDE
    }, this.scene);
    heartMesh.material = heartMat;
    heartMesh.parent = this.heartContainer;
    this.meshes.push(heartMesh);

    // Ombre portée au sol
    const shadowMat = new StandardMaterial('mat_heart_shadow', this.scene);
    shadowMat.diffuseColor = new Color3(0, 0, 0);
    shadowMat.specularColor = new Color3(0, 0, 0);
    shadowMat.alpha = 0.45;

    this.shadowMesh = MeshBuilder.CreateDisc('heart_shadow', {
      radius: 0.25,
      tessellation: 16
    }, this.scene);
    this.shadowMesh.rotation.x = Math.PI / 2;
    this.shadowMesh.position.set(this.root.position.x, 0.03, this.root.position.z);
    this.shadowMesh.material = shadowMat;
  }

  getPosition() {
    return this.root.position;
  }

  update(dt, player) {
    if (this.collected) return;

    // Animation temporelle
    this.animTimer += dt * 3.2;

    // 1. Rotation lente et majestueuse
    this.heartContainer.rotation.y += dt * 2.5;

    // 2. Flottaison verticale sinusoïdale
    this.heartContainer.position.y = 0.55 + Math.sin(this.animTimer) * 0.12;

    // 3. Pulsation "battement de cœur" (double-thump type Zelda)
    const beatPhase = (this.animTimer * 1.35) % (Math.PI * 2);
    let pulseScale = 1.0;
    if (beatPhase < 0.5) {
      pulseScale += Math.sin((beatPhase / 0.5) * Math.PI) * 0.16;
    } else if (beatPhase > 0.7 && beatPhase < 1.2) {
      pulseScale += Math.sin(((beatPhase - 0.7) / 0.5) * Math.PI) * 0.10;
    }
    this.heartContainer.scaling.set(pulseScale, pulseScale, pulseScale);

    // 4. Respiration de l'ombre au sol synchronisée avec l'altitude
    if (this.shadowMesh) {
      const shadowFactor = 1.0 - (this.heartContainer.position.y - 0.43) * 0.45;
      this.shadowMesh.scaling.set(shadowFactor, shadowFactor, shadowFactor);
    }

    // 5. Détection de ramassage par Zelya
    const pPos = player.getPosition();
    const dx = pPos.x - this.root.position.x;
    const dz = pPos.z - this.root.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 1.3 * 1.3) {
      this.collected = true;
      player.heal(2); // Rend 1 cœur plein (2 demi-cœurs)
      this.dispose();
    }
  }

  dispose() {
    // Nettoyage de tous les maillages et matériaux du cœur
    this.meshes.forEach(m => {
      if (m.material) m.material.dispose();
      m.dispose();
    });
    this.meshes = [];

    if (this.shadowMesh) {
      if (this.shadowMesh.material) this.shadowMesh.material.dispose();
      this.shadowMesh.dispose();
      this.shadowMesh = null;
    }

    if (this.heartContainer) {
      this.heartContainer.dispose();
      this.heartContainer = null;
    }

    this.root.dispose();
  }
}
