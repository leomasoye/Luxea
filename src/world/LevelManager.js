import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Bush } from '../entities/Bush.js';
import { ThornBush } from '../entities/ThornBush.js';
import { TrainingDummy } from '../entities/TrainingDummy.js';
import { SaveManager } from '../core/SaveManager.js';

/**
 * LevelManager.js — Hub de la Plaine d'Éveil et les 3 Passages.
 * Conforme à GDD.md (Section 2 & 4) :
 * - Chemin 1 (Est) : Arche Ouverte de la Caverne du Gardien (Transition d'obscurité).
 * - Chemin 2 (Ouest) : Grille de bronze verrouillée (Nécessite Clé simple).
 * - Chemin 3 (Nord) : Porte imposante du Boss (Bruits étouffés de Lyo, aura d'ombre).
 * - Panneau interactif au Spawn (Tutoriel commandes).
 * - Buissons tranchables variés et pickups de cœurs.
 * - Buissons épineux hostiles (1/2 cœur de dégâts au contact).
 * - Mannequin d'entraînement en bois avec ressort dynamique (wobble).
 * - Particules d'aura de ténèbres au Nord et poussières dorées dans la plaine.
 */
export class LevelManager {
  constructor(scene, audioManager, saveState) {
    this.scene = scene;
    this.audio = audioManager;
    this.saveState = saveState;

    this.root = new TransformNode('LevelManagerRoot', this.scene);

    // Collections
    this.bushes = [];
    this.thornBushes = [];
    this.pickups = [];

    // Mannequin d'entraînement
    this.trainingDummy = null;

    // Particules
    this.darknessParticles = [];
    this.ambientParticles = [];
    this.caveMistParticles = [];
    this.ambientTime = 0;

    // Points d'intérêt et déclencheurs interactifs
    this.interactables = [];

    // Éléments spécifiques
    this.bossDoorKnockTimer = 2.5; // Déclenche les bruits de Lyo périodiquement

    this.initPassageEast();
    this.initPassageWest();
    this.initPassageNorth();
    this.initSpawnSign();
    this.initBushes();
    this.initThornBushes();
    this.initTrainingDummy();
    this.initBossDoorDarknessAura();
    this.initAmbientParticles();
  }

  // --- 1. Chemin 1 (Est) : La Caverne du Gardien (Ouvert & Entrée Visuelle) ---
  initPassageEast() {
    // Matériau Pierre de taille pour l'arche
    const archMat = new StandardMaterial('mat_cave_arch', this.scene);
    archMat.diffuseColor = new Color3(0.32, 0.35, 0.42);
    archMat.specularColor = new Color3(0.06, 0.07, 0.08);
    archMat.freeze();

    // Matériau Roche brute environnante
    const roughRockMat = new StandardMaterial('mat_cave_rough_rock', this.scene);
    roughRockMat.diffuseColor = new Color3(0.26, 0.28, 0.33);
    roughRockMat.freeze();

    // 1. Piliers massifs taillés encastrés dans la falaise (brèche z = -0.5 à 4.5)
    // Pilier Sud (z = 0.1)
    const pillarL = MeshBuilder.CreateBox('arch_e_l', { width: 2.2, height: 5.2, depth: 1.6 }, this.scene);
    pillarL.material = archMat;
    pillarL.position.set(24.0, 2.4, 0.1);
    pillarL.parent = this.root;
    pillarL.freezeWorldMatrix();

    // Pilier Nord (z = 3.9)
    const pillarR = MeshBuilder.CreateBox('arch_e_r', { width: 2.2, height: 5.2, depth: 1.6 }, this.scene);
    pillarR.material = archMat;
    pillarR.position.set(24.0, 2.4, 3.9);
    pillarR.parent = this.root;
    pillarR.freezeWorldMatrix();

    // Linteau supérieur reliant les piliers
    const topBeam = MeshBuilder.CreateBox('arch_e_top', { width: 2.4, height: 1.4, depth: 5.4 }, this.scene);
    topBeam.material = archMat;
    topBeam.position.set(24.0, 4.6, 2.0);
    topBeam.parent = this.root;
    topBeam.freezeWorldMatrix();

    // Clé de voûte triangulaire taillée (fronton antique Zelda)
    const keystone = MeshBuilder.CreateCylinder('arch_e_keystone', {
      height: 2.2,
      diameterTop: 0.2,
      diameterBottom: 1.6,
      tessellation: 3
    }, this.scene);
    keystone.material = archMat;
    keystone.rotation.z = Math.PI / 2;
    keystone.rotation.x = Math.PI;
    keystone.position.set(23.7, 5.2, 2.0);
    keystone.parent = this.root;
    keystone.freezeWorldMatrix();

    // 2. Rochers massifs facettés encadrant naturellement la bouche de la caverne
    const boulderL = MeshBuilder.CreateSphere('cave_ent_boulder_l', { diameter: 2.4, segments: 4 }, this.scene);
    boulderL.material = roughRockMat;
    boulderL.scaling.set(1.4, 1.6, 1.2);
    boulderL.position.set(23.2, 1.1, -0.6);
    boulderL.rotation.y = 0.8;
    boulderL.parent = this.root;
    boulderL.freezeWorldMatrix();

    const boulderR = MeshBuilder.CreateSphere('cave_ent_boulder_r', { diameter: 2.4, segments: 4 }, this.scene);
    boulderR.material = roughRockMat;
    boulderR.scaling.set(1.5, 1.7, 1.3);
    boulderR.position.set(23.2, 1.2, 4.6);
    boulderR.rotation.y = 2.1;
    boulderR.parent = this.root;
    boulderR.freezeWorldMatrix();

    // 3. Seuil en dalles rocheuses sombres prolongeant le sentier dans la falaise
    const thresholdMat = new StandardMaterial('mat_cave_threshold', this.scene);
    thresholdMat.diffuseColor = new Color3(0.20, 0.22, 0.28);
    thresholdMat.specularColor = new Color3(0.04, 0.04, 0.05);
    thresholdMat.freeze();

    const threshold = MeshBuilder.CreateGround('cave_threshold_path', { width: 4.5, height: 2.6 }, this.scene);
    threshold.material = thresholdMat;
    threshold.position.set(24.2, 0.02, 2.0);
    threshold.parent = this.root;
    threshold.freezeWorldMatrix();

    // 4. Parois internes du tunnel d'entrée s'enfonçant dans l'obscurité
    const tunnelMat = new StandardMaterial('mat_cave_tunnel_inner', this.scene);
    tunnelMat.diffuseColor = new Color3(0.06, 0.07, 0.09);
    tunnelMat.specularColor = new Color3(0, 0, 0);
    tunnelMat.freeze();

    // Mur interne Nord du tunnel
    const tunWallN = MeshBuilder.CreateBox('cave_tun_wall_n', { width: 3.5, height: 4.8, depth: 1.2 }, this.scene);
    tunWallN.material = tunnelMat;
    tunWallN.position.set(25.8, 2.3, 3.7);
    tunWallN.parent = this.root;
    tunWallN.freezeWorldMatrix();

    // Mur interne Sud du tunnel
    const tunWallS = MeshBuilder.CreateBox('cave_tun_wall_s', { width: 3.5, height: 4.8, depth: 1.2 }, this.scene);
    tunWallS.material = tunnelMat;
    tunWallS.position.set(25.8, 2.3, 0.3);
    tunWallS.parent = this.root;
    tunWallS.freezeWorldMatrix();

    // Plafond du tunnel
    const tunCeil = MeshBuilder.CreateBox('cave_tun_ceil', { width: 3.5, height: 1.2, depth: 3.6 }, this.scene);
    tunCeil.material = tunnelMat;
    tunCeil.position.set(25.8, 4.4, 2.0);
    tunCeil.parent = this.root;
    tunCeil.freezeWorldMatrix();

    // Fond obscur absolu au bout du boyau
    const darkMat = new StandardMaterial('mat_cave_void', this.scene);
    darkMat.diffuseColor = new Color3(0.005, 0.005, 0.01);
    darkMat.emissiveColor = new Color3(0, 0, 0);
    darkMat.specularColor = new Color3(0, 0, 0);
    darkMat.freeze();

    const voidBacking = MeshBuilder.CreateBox('cave_void_back', { width: 1.0, height: 4.4, depth: 2.8 }, this.scene);
    voidBacking.material = darkMat;
    voidBacking.position.set(27.0, 2.1, 2.0);
    voidBacking.parent = this.root;
    voidBacking.freezeWorldMatrix();

    // 5. Particules de brume fraîche s'échappant de la caverne
    const mistMat = new StandardMaterial('mat_cave_mist', this.scene);
    mistMat.diffuseColor = new Color3(0.4, 0.55, 0.7);
    mistMat.emissiveColor = new Color3(0.15, 0.22, 0.35);
    mistMat.specularColor = new Color3(0, 0, 0);
    mistMat.freeze();

    for (let i = 0; i < 9; i++) {
      const mist = MeshBuilder.CreateBox(`cave_mist_${i}`, { width: 0.14, height: 0.14, depth: 0.14 }, this.scene);
      mist.material = mistMat;
      const baseX = 24.0 + Math.random() * 2.2;
      const baseY = 0.4 + Math.random() * 2.2;
      const baseZ = 1.0 + Math.random() * 2.0;
      mist.position.set(baseX, baseY, baseZ);
      mist.parent = this.root;

      this.caveMistParticles.push({
        mesh: mist,
        baseX,
        baseY,
        baseZ,
        speedX: -0.5 - Math.random() * 0.5, // Dérive vers l'extérieur (Ouest)
        speedZ: (Math.random() - 0.5) * 0.25,
        bobSpeed: 1.2 + Math.random() * 1.5,
        seed: Math.random() * Math.PI * 2
      });
    }

    // 6. Stèle ancienne de pierre sculptée sur le bas-côté (X = 21.6, Z = 0.2)
    const steleMat = new StandardMaterial('mat_cave_stele', this.scene);
    steleMat.diffuseColor = new Color3(0.42, 0.44, 0.48);
    steleMat.specularColor = new Color3(0.1, 0.1, 0.12);
    steleMat.freeze();

    const steleBase = MeshBuilder.CreateBox('cave_stele_base', { width: 0.9, height: 0.3, depth: 0.9 }, this.scene);
    steleBase.material = steleMat;
    steleBase.position.set(21.6, 0.15, 0.1);
    steleBase.parent = this.root;
    steleBase.freezeWorldMatrix();

    const stelePillar = MeshBuilder.CreateBox('cave_stele_pillar', { width: 0.6, height: 1.4, depth: 0.4 }, this.scene);
    stelePillar.material = steleMat;
    stelePillar.position.set(21.6, 0.9, 0.1);
    stelePillar.parent = this.root;
    stelePillar.freezeWorldMatrix();
  }

  // --- 2. Chemin 2 (Ouest) : Le Sanctuaire des Ruines (Verrouillé) ---
  initPassageWest() {
    const ruinMat = new StandardMaterial('mat_ruins_arch', this.scene);
    ruinMat.diffuseColor = new Color3(0.48, 0.42, 0.38);
    ruinMat.freeze();

    // Colonnes antiques encastrées dans la brèche de la falaise (z = -0.5 à 4.5)
    const colL = MeshBuilder.CreateCylinder('ruin_col_l', { height: 4.8, diameter: 1.4, tessellation: 8 }, this.scene);
    colL.material = ruinMat;
    colL.position.set(-24.0, 2.25, 0.3);
    colL.parent = this.root;
    colL.freezeWorldMatrix();

    const colR = MeshBuilder.CreateCylinder('ruin_col_r', { height: 4.8, diameter: 1.4, tessellation: 8 }, this.scene);
    colR.material = ruinMat;
    colR.position.set(-24.0, 2.25, 3.7);
    colR.parent = this.root;
    colR.freezeWorldMatrix();

    // Fronton / Linteau antique en pierre reliant les colonnes
    const lintel = MeshBuilder.CreateBox('ruin_arch_top', { width: 2.2, height: 1.3, depth: 5.0 }, this.scene);
    lintel.material = ruinMat;
    lintel.position.set(-24.0, 4.4, 2.0);
    lintel.parent = this.root;
    lintel.freezeWorldMatrix();

    // Grille de bronze scellée (ajustée précisément entre les colonnes)
    const gateMat = new StandardMaterial('mat_bronze_gate', this.scene);
    gateMat.diffuseColor = new Color3(0.55, 0.38, 0.18);
    gateMat.specularColor = new Color3(0.6, 0.4, 0.2);

    const gate = MeshBuilder.CreateBox('west_gate', { width: 0.28, height: 3.8, depth: 3.2 }, this.scene);
    gate.material = gateMat;
    gate.position.set(-24.0, 1.9, 2.0);
    gate.parent = this.root;
    this.westGateMesh = gate;
    this.westGateMesh.setEnabled(!this.saveState.westGateOpen);

    // Couloir boisé et brume émeraude derrière la grille Ouest (invite vers la Forêt Sacrée)
    const forestTunMat = new StandardMaterial('mat_west_forest_tun', this.scene);
    forestTunMat.diffuseColor = new Color3(0.08, 0.24, 0.14);
    forestTunMat.specularColor = new Color3(0, 0, 0);
    forestTunMat.freeze();

    const forestGlowMat = new StandardMaterial('mat_west_forest_glow', this.scene);
    forestGlowMat.diffuseColor = new Color3(0.24, 0.62, 0.38);
    forestGlowMat.emissiveColor = new Color3(0.14, 0.42, 0.26);
    forestGlowMat.specularColor = new Color3(0, 0, 0);
    forestGlowMat.freeze();

    const westThreshold = MeshBuilder.CreateGround('west_threshold_path', { width: 4.5, height: 2.8 }, this.scene);
    westThreshold.material = forestTunMat;
    westThreshold.position.set(-25.2, 0.02, 2.0);
    westThreshold.parent = this.root;
    westThreshold.freezeWorldMatrix();

    const westTunN = MeshBuilder.CreateBox('west_tun_wall_n', { width: 3.5, height: 4.8, depth: 1.2 }, this.scene);
    westTunN.material = forestTunMat;
    westTunN.position.set(-25.8, 2.3, 3.7);
    westTunN.parent = this.root;
    westTunN.freezeWorldMatrix();

    const westTunS = MeshBuilder.CreateBox('west_tun_wall_s', { width: 3.5, height: 4.8, depth: 1.2 }, this.scene);
    westTunS.material = forestTunMat;
    westTunS.position.set(-25.8, 2.3, 0.3);
    westTunS.parent = this.root;
    westTunS.freezeWorldMatrix();

    const westTunCeil = MeshBuilder.CreateBox('west_tun_ceil', { width: 3.5, height: 1.2, depth: 3.6 }, this.scene);
    westTunCeil.material = forestTunMat;
    westTunCeil.position.set(-25.8, 4.4, 2.0);
    westTunCeil.parent = this.root;
    westTunCeil.freezeWorldMatrix();

    const westPortalBack = MeshBuilder.CreateBox('west_forest_back', { width: 0.8, height: 4.4, depth: 2.8 }, this.scene);
    westPortalBack.material = forestGlowMat;
    westPortalBack.position.set(-27.0, 2.1, 2.0);
    westPortalBack.parent = this.root;
    westPortalBack.freezeWorldMatrix();

    // Déverrouillage de la grille Ouest avec la Clé simple trouvée dans la Caverne
    this.interactables.push({
      id: 'west_sanctuary',
      position: new Vector3(-21.8, 1.2, 2.0),
      radius: 2.2,
      isAvailable: () => !!this.saveState.simpleKey && !this.saveState.westGateOpen,
      promptText: "[E] Ouvrir la grille",
      onInteract: () => {
        if (!this.saveState.simpleKey || this.saveState.westGateOpen) return;
        this.saveState.westGateOpen = true;
        SaveManager.save(this.saveState);
        if (this.westGateMesh) {
          this.westGateMesh.setEnabled(false);
        }
      }
    });
  }

  // --- 3. Chemin 3 (Nord) : La Porte du Boss & Bruits de Lyo ---
  initPassageNorth() {
    const portalMat = new StandardMaterial('mat_boss_portal', this.scene);
    portalMat.diffuseColor = new Color3(0.28, 0.25, 0.35);
    portalMat.freeze();

    // Piliers monolithiques massifs bordant la brèche (x = -3.5 à 3.5)
    const postL = MeshBuilder.CreateBox('boss_p_l', { width: 1.8, height: 6.2, depth: 3.2 }, this.scene);
    postL.material = portalMat;
    postL.position.set(-2.8, 3.0, 23.8);
    postL.parent = this.root;
    postL.freezeWorldMatrix();

    const postR = MeshBuilder.CreateBox('boss_p_r', { width: 1.8, height: 6.2, depth: 3.2 }, this.scene);
    postR.material = portalMat;
    postR.position.set(2.8, 3.0, 23.8);
    postR.parent = this.root;
    postR.freezeWorldMatrix();

    // Grand linteau sommital reliant les piliers et les falaises
    const topLintel = MeshBuilder.CreateBox('boss_p_top', { width: 7.6, height: 1.8, depth: 3.4 }, this.scene);
    topLintel.material = portalMat;
    topLintel.position.set(0, 5.8, 23.8);
    topLintel.parent = this.root;
    topLintel.freezeWorldMatrix();

    // Fond mural sombre arrière empêchant de voir le vide derrière la porte (hauteur adaptée aux murs prison)
    const backWall = MeshBuilder.CreateBox('boss_back_wall', { width: 5.6, height: 12.0, depth: 1.2 }, this.scene);
    backWall.material = portalMat;
    backWall.position.set(0, 6.0, 25.2);
    backWall.parent = this.root;
    backWall.freezeWorldMatrix();

    // Battant de la porte massive en fer sombre (parfaitement intégré dans le portail)
    const ironDoorMat = new StandardMaterial('mat_boss_door_iron', this.scene);
    ironDoorMat.diffuseColor = new Color3(0.18, 0.16, 0.22);
    ironDoorMat.specularColor = new Color3(0.3, 0.3, 0.4);

    const doorMesh = MeshBuilder.CreateBox('boss_door_mesh', { width: 4.2, height: 5.0, depth: 0.6 }, this.scene);
    doorMesh.material = ironDoorMat;
    doorMesh.position.set(0, 2.5, 24.2);
    doorMesh.parent = this.root;

    // Serrure du Boss ornée d'un crâne / orbe violet
    const lockMat = new StandardMaterial('mat_boss_lock', this.scene);
    lockMat.diffuseColor = new Color3(0.85, 0.7, 0.15);
    lockMat.emissiveColor = new Color3(0.4, 0.1, 0.4); // Aura de ténèbres

    const lockMesh = MeshBuilder.CreateSphere('boss_lock_orb', { diameter: 0.75 }, this.scene);
    lockMesh.material = lockMat;
    lockMesh.position.set(0, 2.5, 23.8);
    lockMesh.parent = this.root;
  }

  // --- 4. Panneau en Bois Interactif au Spawn ---
  initSpawnSign() {
    const signWoodMat = new StandardMaterial('mat_sign_wood', this.scene);
    signWoodMat.diffuseColor = new Color3(0.52, 0.35, 0.20);
    signWoodMat.freeze();

    // Poteau
    const post = MeshBuilder.CreateCylinder('sign_post', { height: 1.4, diameter: 0.18 }, this.scene);
    post.material = signWoodMat;
    post.position.set(2.4, 0.7, -3.2);
    post.parent = this.root;
    post.freezeWorldMatrix();

    // Planche écrite
    const board = MeshBuilder.CreateBox('sign_board', { width: 1.1, height: 0.7, depth: 0.12 }, this.scene);
    board.material = signWoodMat;
    board.position.set(2.4, 1.35, -3.2);
    board.rotation.y = -0.25;
    board.parent = this.root;
    board.freezeWorldMatrix();
  }

  // --- 5. Buissons tranchables diversifiés (tailles, formes, couleurs et lobes variés) ---
  initBushes() {
    const bushConfigs = [
      { pos: new Vector3(-3, 0, -2), scale: 1.0, scaleY: 1.0, colorVariant: 0, multiLobe: true },
      { pos: new Vector3(-5.2, 0, -2.8), scale: 0.8, scaleY: 0.9, colorVariant: 1, multiLobe: false },
      { pos: new Vector3(4, 0, -1), scale: 1.15, scaleY: 0.9, scaleX: 1.2, colorVariant: 2, multiLobe: true },
      { pos: new Vector3(5.8, 0, -2.5), scale: 0.75, scaleY: 1.1, colorVariant: 0, multiLobe: false },
      { pos: new Vector3(-7, 0, 4), scale: 1.25, scaleY: 1.0, scaleZ: 1.2, colorVariant: 1, multiLobe: true },
      { pos: new Vector3(-8.8, 0, 5.2), scale: 0.85, scaleY: 0.85, colorVariant: 3, multiLobe: false },
      { pos: new Vector3(7, 0, 4.5), scale: 1.1, scaleY: 1.15, colorVariant: 0, multiLobe: true },
      { pos: new Vector3(8.8, 0, 6), scale: 0.8, scaleY: 0.8, colorVariant: 2, multiLobe: false },
      { pos: new Vector3(-2, 0, 8), scale: 0.9, scaleY: 1.1, colorVariant: 1, multiLobe: false },
      { pos: new Vector3(2, 0, 9), scale: 1.2, scaleY: 0.95, scaleX: 1.15, colorVariant: 3, multiLobe: true },
      { pos: new Vector3(-4, 0, 14), scale: 1.1, scaleY: 1.05, colorVariant: 0, multiLobe: true },
      { pos: new Vector3(4, 0, 15), scale: 0.85, scaleY: 1.2, colorVariant: 1, multiLobe: false }
    ];

    bushConfigs.forEach(cfg => {
      const bush = new Bush(this.scene, cfg.pos, this.audio, cfg);
      this.bushes.push(bush);
    });
  }

  // --- 6. Buissons épineux hostiles (1/2 cœur de dégâts au contact) ---
  initThornBushes() {
    const thornPositions = [
      new Vector3(-8.0, 0, 8.5), // À l'Ouest, sur un tertre rocheux dégagé
      new Vector3(6.8, 0, -4.0)  // Au Sud-Est, dans une zone d'herbe ouverte et aérée
    ];

    thornPositions.forEach(pos => {
      const tb = new ThornBush(this.scene, pos, this.audio);
      this.thornBushes.push(tb);
    });
  }

  // --- 7. Mannequin d'entraînement en bois (Wobble naturel au coup) ---
  initTrainingDummy() {
    // Placé plus loin du spawn, dans une clairière d'entraînement dédiée au Sud-Ouest
    this.trainingDummy = new TrainingDummy(this.scene, new Vector3(-10.5, 0, -8.5), this.audio);
  }

  // --- 8. Aura de ténèbres au Nord (Particules sombres/violettes autour de la Porte de Gallen) ---
  initBossDoorDarknessAura() {
    const darkMat = new StandardMaterial('mat_boss_aura_particle', this.scene);
    darkMat.diffuseColor = new Color3(0.10, 0.02, 0.14);
    darkMat.emissiveColor = new Color3(0.60, 0.08, 0.75); // Lueur violette/pourpre palpitante
    darkMat.specularColor = new Color3(0.6, 0.2, 0.7);
    darkMat.alpha = 0.85;
    darkMat.freeze();

    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = MeshBuilder.CreateBox(`boss_dark_p_${i}`, {
        width: 0.18 + (i % 3) * 0.04,
        height: 0.18 + (i % 3) * 0.04,
        depth: 0.18 + (i % 3) * 0.04
      }, this.scene);
      p.material = darkMat;

      // Répartis autour du portail du Boss
      const u = i / count;
      const angle = u * Math.PI * 2;
      const baseX = Math.sin(angle) * 2.8 + (Math.random() - 0.5) * 0.8;
      const baseY = 0.8 + Math.random() * 5.2;
      const baseZ = 23.8 + (Math.random() - 0.5) * 0.9;

      p.position.set(baseX, baseY, baseZ);
      p.parent = this.root;

      this.darknessParticles.push({
        mesh: p,
        baseX,
        baseY,
        baseZ,
        speedY: 0.40 + Math.random() * 0.50,
        orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8),
        orbitRadius: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: 1.5 + Math.random() * 2.5
      });
    }
  }

  // --- 9. Particules d'ambiance (Lucioles / Poussières dorées dans la plaine) ---
  initAmbientParticles() {
    const fireflyMat = new StandardMaterial('mat_firefly_particle', this.scene);
    fireflyMat.diffuseColor = new Color3(1.0, 0.95, 0.65);
    fireflyMat.emissiveColor = new Color3(0.95, 0.82, 0.25); // Poussière dorée / luciole chaleureuse
    fireflyMat.specularColor = new Color3(1, 1, 1);
    fireflyMat.alpha = 0.88;
    fireflyMat.freeze();

    const count = 38;
    for (let i = 0; i < count; i++) {
      const p = MeshBuilder.CreateBox(`ambient_firefly_${i}`, {
        width: 0.13,
        height: 0.13,
        depth: 0.13
      }, this.scene);
      p.material = fireflyMat;

      // Répartis dans toute la plaine d'éveil
      const x = (Math.random() - 0.5) * 42;
      const y = 0.6 + Math.random() * 2.8;
      const z = (Math.random() - 0.5) * 38;

      p.position.set(x, y, z);
      p.parent = this.root;

      this.ambientParticles.push({
        mesh: p,
        seed: Math.random() * 100,
        driftSpeedX: (Math.random() - 0.5) * 0.35,
        driftSpeedZ: (Math.random() - 0.5) * 0.35,
        bobSpeed: 0.8 + Math.random() * 1.2,
        bobAmp: 0.18 + Math.random() * 0.16,
        baseY: y
      });
    }
  }

  // Vérifie les coups d'épée contre les buissons, les ronces et le mannequin d'entraînement
  checkSwordHits(playerPos, playerFacingAngle, weapon, cameraManager = null) {
    // 1. Buissons tranchables
    this.bushes.forEach(bush => {
      if (!bush.isCut) {
        const hit = weapon.checkHit(playerPos, playerFacingAngle, bush.getPosition(), bush.radius, weapon.isRollSlashing);
        if (hit) {
          bush.cut(heartPickup => {
            this.pickups.push(heartPickup);
          });
        }
      }
    });

    // 2. Buissons épineux
    this.thornBushes.forEach(thornBush => {
      if (!thornBush.isCut) {
        const hit = weapon.checkHit(playerPos, playerFacingAngle, thornBush.getPosition(), thornBush.radius, weapon.isRollSlashing);
        if (hit) {
          thornBush.cut();
        }
      }
    });

    // 3. Mannequin d'entraînement en bois (wobble + sciure + shake)
    if (this.trainingDummy) {
      this.trainingDummy.checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager);
    }
  }

  // Trouve l'élément interactif le plus proche du joueur (avec validation de distance et d'orientation)
  getNearestInteractable(playerPos, playerFacingAngle = null) {
    let nearest = null;
    let minDist = Infinity;

    this.interactables.forEach(item => {
      if (typeof item.isAvailable === 'function' && !item.isAvailable()) return;
      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= item.radius && dist < minDist) {
        // Si un angle de regard est fourni, vérifier que Zelya regarde globalement vers l'objet (exclut le dos)
        if (playerFacingAngle !== null && playerFacingAngle !== undefined && dist > 0.1) {
          const forwardX = Math.sin(playerFacingAngle);
          const forwardZ = Math.cos(playerFacingAngle);
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const dot = forwardX * dirX + forwardZ * dirZ;
          // dot < -0.2 signifie que le joueur tourne complètement le dos à l'objet
          if (dot < -0.2) {
            return;
          }
        }
        minDist = dist;
        nearest = {
          ...item,
          promptText: typeof item.getPromptText === 'function' ? item.getPromptText() : item.promptText
        };
      }
    });

    return nearest;
  }

  update(dt, player) {
    // 1. Mise à jour des pickups de cœurs actifs
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.collected) {
        this.pickups.splice(i, 1);
      } else {
        p.update(dt, player);
      }
    }

    // 2. Bruits périodiques de Lyo derrière la porte du Boss (immersion narrative)
    this.bossDoorKnockTimer -= dt;
    if (this.bossDoorKnockTimer <= 0) {
      this.bossDoorKnockTimer = 6.0 + Math.random() * 4.0; // Toutes les 6 à 10 secondes
      const pPos = player.getPosition();
      // On ne joue le son que si Zelya est dans la moitié Nord de la plaine (distance de proximité)
      const distToDoor = Vector3.Distance(pPos, new Vector3(0, 1, 23.5));
      if (distToDoor < 18) {
        this.audio.playDoorKnock();
      }
    }

    // 3. Mannequin d'entraînement (physique de ressort)
    if (this.trainingDummy) {
      this.trainingDummy.update(dt);
    }

    // 4. Buissons épineux (dégâts au contact si non tranchés)
    this.thornBushes.forEach(tb => {
      tb.checkPlayerContact(player, dt);
    });

    // 5. Particules d'aura de ténèbres au Nord (autour de la Porte de Gallen)
    this.darknessParticles.forEach(p => {
      p.baseY += p.speedY * dt;
      if (p.baseY > 6.2) {
        p.baseY = 0.8;
      }
      p.phase += p.orbitSpeed * dt;
      const offsetX = Math.cos(p.phase) * p.orbitRadius;
      const offsetZ = Math.sin(p.phase) * (p.orbitRadius * 0.6);

      p.mesh.position.x = p.baseX + offsetX;
      p.mesh.position.y = p.baseY;
      p.mesh.position.z = p.baseZ + offsetZ;

      p.mesh.rotation.y += p.rotSpeed * dt;
      p.mesh.rotation.x += p.rotSpeed * 0.7 * dt;

      // Pulsation rétro d'échelle
      const s = 0.85 + 0.35 * Math.sin(p.phase * 2);
      p.mesh.scaling.set(s, s, s);
    });

    // 6. Particules d'ambiance (Lucioles / Poussières dorées dans la plaine)
    this.ambientTime += dt;
    this.ambientParticles.forEach(p => {
      p.mesh.position.x += p.driftSpeedX * dt;
      p.mesh.position.z += p.driftSpeedZ * dt;

      // Respiration verticale douce
      p.mesh.position.y = p.baseY + Math.sin(this.ambientTime * p.bobSpeed + p.seed) * p.bobAmp;

      // Recyclage des bornes de la plaine
      if (p.mesh.position.x > 22) p.mesh.position.x = -22;
      if (p.mesh.position.x < -22) p.mesh.position.x = 22;
      if (p.mesh.position.z > 22) p.mesh.position.z = -20;
      if (p.mesh.position.z < -20) p.mesh.position.z = 22;

      p.mesh.rotation.y += dt * 1.5;
      const twinkle = 0.8 + 0.3 * Math.sin(this.ambientTime * 3.5 + p.seed);
      p.mesh.scaling.set(twinkle, twinkle, twinkle);
    });

    // 7. Particules de brume froide s'échappant de la Caverne
    this.caveMistParticles.forEach(p => {
      p.mesh.position.x += p.speedX * dt;
      p.mesh.position.z += p.speedZ * dt;
      p.mesh.position.y = p.baseY + Math.sin(this.ambientTime * p.bobSpeed + p.seed) * 0.15;

      // Recyclage vers le fond du tunnel
      if (p.mesh.position.x < 22.8) {
        p.mesh.position.x = 26.2;
        p.mesh.position.z = 1.0 + Math.random() * 2.0;
      }
      p.mesh.rotation.y += dt * 0.8;
    });
  }

  /**
   * Enregistre les hitboxes du panneau, des portes/grilles, du mannequin et des buissons dans le CollisionManager.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Panneau en bois au spawn
    collisionManager.addCircle(2.4, -3.2, 0.45, 'spawn_sign');

    // 2. Portes & Passages
    // Grille de bronze scellée (Ouest) & colonnes (la grille elle-même est gérée dynamiquement)
    collisionManager.addBox(-25.2, -22.8, -0.6, 1.1, 'west_col_l');
    collisionManager.addBox(-25.2, -22.8, 2.9, 4.6, 'west_col_r');

    // Porte imposante du Boss (Nord) & monolithes
    collisionManager.addBox(-2.0, 2.0, 23.6, 24.8, 'boss_door');
    collisionManager.addBox(-3.8, -1.8, 22.2, 25.4, 'boss_post_l');
    collisionManager.addBox(1.8, 3.8, 22.2, 25.4, 'boss_post_r');

    // Arche et tunnel d'entrée de la Caverne (Est)
    // Passage ouvert et libre au centre entre z = 0.9 et z = 3.1
    collisionManager.addBox(22.8, 26.5, -0.8, 0.9, 'east_pillar_l');
    collisionManager.addBox(22.8, 26.5, 3.1, 4.8, 'east_pillar_r');
    // Stèle sculptée sur le côté Sud de l'entrée
    collisionManager.addCircle(21.6, 0.1, 0.45, 'east_stele');

    // 3. Mannequin d'entraînement (solide)
    if (this.trainingDummy) {
      collisionManager.addCircle(
        this.trainingDummy.root.position.x,
        this.trainingDummy.root.position.z,
        0.52,
        'training_dummy'
      );
    }

    // 4. Buissons tranchables, ronces & grille Ouest (actifs uniquement tant que non détruits / non ouverts)
    collisionManager.addDynamicSource(() => {
      const colliders = [];
      if (!this.saveState.westGateOpen) {
        colliders.push({
          type: 'box',
          minX: -24.4,
          maxX: -23.6,
          minZ: 0.6,
          maxZ: 3.4,
          tag: 'west_gate'
        });
      }
      this.bushes.forEach(b => {
        if (!b.isCut) {
          colliders.push({
            type: 'circle',
            x: b.root.position.x,
            z: b.root.position.z,
            radius: b.radius * 0.9,
            tag: 'bush'
          });
        }
      });
      this.thornBushes.forEach(tb => {
        if (!tb.isCut) {
          colliders.push({
            type: 'circle',
            x: tb.root.position.x,
            z: tb.root.position.z,
            radius: tb.radius * 0.85,
            tag: 'thorn_bush'
          });
        }
      });
      return colliders;
    });
  }

  syncGates() {
    if (this.westGateMesh) {
      this.westGateMesh.setEnabled(!this.saveState.westGateOpen);
    }
  }

  /**
   * Réinitialise les buissons, ronces et pickups (appelé lors d'un respawn ou reset).
   */
  reset() {
    this.syncGates();
    this.bushes.forEach(b => b.reset());
    this.thornBushes.forEach(tb => tb.reset());
    this.pickups.forEach(p => p.dispose());
    this.pickups = [];
  }
}

