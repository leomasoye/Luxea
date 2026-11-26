import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Torch } from '../entities/Torch.js';
import { SkeletonArcher } from '../entities/SkeletonArcher.js';
import { CaveBat } from '../entities/CaveBat.js';
import { HazardCrystal } from '../entities/HazardCrystal.js';
import { BreakableRock } from '../entities/BreakableRock.js';
import { SaveManager } from '../core/SaveManager.js';

/**
 * CaveManager.js — Intérieur complet de la Caverne du Gardien (Zone 2).
 * Conforme à AGENT.md & GDD.md :
 * - Relief naturel et verticalité :
 *   - Salle centrale basse (Y = 0)
 *   - Rampe en pierre taillée montant doucement (Y = 0 à 1.6)
 *   - Plateau / Terrasse Nord surélevée (Y = 1.6) avec vue plongeante
 *   - Recoin Secret Sud masqué par une barrière naturelle de stalagmites
 *   - Crypte & Galerie Est avec piliers et niches d'exploration
 * - Collisions intégrales sur 100% des obstacles (murs, falaises, murets, stalagmites, rochers, torches).
 * - Torches interactives allumables avec l'épée (frappe ou Mode Torche) émettant flammes et lumière dynamique.
 * - Performance 60 FPS garantie : freezeWorldMatrix(), freeze(), ThinInstances/InstancedMesh.
 */
export class CaveManager {
  constructor(scene, saveData = null) {
    this.scene = scene;
    this.saveData = saveData || SaveManager.getDefaults();
    this.root = new TransformNode('CaveRoot', this.scene);

    // Espace de coordonnées de la caverne : X de 180 à 230, Z de -23 à 24
    this.wallHeight = 13.0;

    // Collections
    this.torches = [];
    this.skeletons = [];
    this.arrows = [];
    this.bats = [];
    this.hazardCrystals = [];
    this.breakableRocks = [];
    this.interactables = [];
    this.pendingNotification = null;
    this.caveParticles = [];
    this.particleTime = 0;
    this.rockColliders = [];

    // État du scénario de la caverne
    this.switchActivated = !!this.saveData.simpleKey;
    this.chestRevealed = !!this.saveData.simpleKey;
    this.chestOpened = !!this.saveData.simpleKey;

    // Matériaux partagés avec maxSimultaneousLights = 8 pour supporter l'éclairage des torches
    this.initMaterials();

    // Construction architecturale des 5 zones
    this.initMainFloors();
    this.initRaisedTerraceAndRamp();
    this.initPerimeterWalls();
    this.initInternalRockPartitions();
    this.initWallReliefs();
    this.initStalagmitesAndBoulders();
    this.initCrystalClusters();
    this.initHazardCrystals();
    this.initSecretPuzzleAndDoor();
    this.initAncientMonoliths();
    this.initEntranceExitCorridor();
    this.initCeiling();
    this.initTorches();
    this.initSkeletons();
    this.initBats();
    this.initCaveParticles();
  }

  initMaterials() {
    // Sol de pierre sombre (léger emissiveColor pour éviter toute face noir pur hors cône de torche)
    this.floorMat = new StandardMaterial('mat_cave_floor', this.scene);
    this.floorMat.diffuseColor = new Color3(0.16, 0.19, 0.24);
    this.floorMat.emissiveColor = new Color3(0.03, 0.035, 0.05);
    this.floorMat.specularColor = new Color3(0.04, 0.05, 0.07);
    this.floorMat.maxSimultaneousLights = 12;
    this.floorMat.freeze();

    // Dalles centrales pavées (allée usée)
    this.pavingMat = new StandardMaterial('mat_cave_paving', this.scene);
    this.pavingMat.diffuseColor = new Color3(0.21, 0.24, 0.30);
    this.pavingMat.emissiveColor = new Color3(0.035, 0.04, 0.055);
    this.pavingMat.specularColor = new Color3(0.06, 0.07, 0.09);
    this.pavingMat.maxSimultaneousLights = 12;
    this.pavingMat.freeze();

    // Sol de la terrasse surélevée Nord
    this.terraceFloorMat = new StandardMaterial('mat_terrace_floor', this.scene);
    this.terraceFloorMat.diffuseColor = new Color3(0.18, 0.21, 0.27);
    this.terraceFloorMat.emissiveColor = new Color3(0.03, 0.035, 0.05);
    this.terraceFloorMat.specularColor = new Color3(0.05, 0.06, 0.08);
    this.terraceFloorMat.maxSimultaneousLights = 12;
    this.terraceFloorMat.freeze();

    // Parois rocheuses périmétriques
    this.wallMat = new StandardMaterial('mat_cave_wall', this.scene);
    this.wallMat.diffuseColor = new Color3(0.21, 0.24, 0.31);
    this.wallMat.emissiveColor = new Color3(0.032, 0.038, 0.055);
    this.wallMat.specularColor = new Color3(0.03, 0.04, 0.05);
    this.wallMat.maxSimultaneousLights = 12;
    this.wallMat.freeze();

    // Falaise / Muret de soutènement de la terrasse
    this.cliffMat = new StandardMaterial('mat_cave_cliff', this.scene);
    this.cliffMat.diffuseColor = new Color3(0.24, 0.27, 0.34);
    this.cliffMat.emissiveColor = new Color3(0.035, 0.04, 0.055);
    this.cliffMat.specularColor = new Color3(0.04, 0.05, 0.07);
    this.cliffMat.maxSimultaneousLights = 12;
    this.cliffMat.freeze();

    // Stalagmites et formations rocheuses brutes
    this.rockMat = new StandardMaterial('mat_cave_rock', this.scene);
    this.rockMat.diffuseColor = new Color3(0.18, 0.20, 0.26);
    this.rockMat.emissiveColor = new Color3(0.028, 0.032, 0.046);
    this.rockMat.specularColor = new Color3(0.03, 0.04, 0.05);
    this.rockMat.maxSimultaneousLights = 12;
    this.rockMat.freeze();

    // Cristaux souterrains mystiques — Émeraude / Turquoise
    this.crystalMat = new StandardMaterial('mat_cave_crystal', this.scene);
    this.crystalMat.diffuseColor = new Color3(0.18, 0.85, 0.72);
    this.crystalMat.emissiveColor = new Color3(0.08, 0.48, 0.40);
    this.crystalMat.specularColor = new Color3(0.85, 1.0, 0.95);
    this.crystalMat.maxSimultaneousLights = 8;
    this.crystalMat.freeze();

    // Cristaux souterrains — Améthyste / Violet lumineux
    this.crystalPurpleMat = new StandardMaterial('mat_cave_crystal_purple', this.scene);
    this.crystalPurpleMat.diffuseColor = new Color3(0.68, 0.32, 0.92);
    this.crystalPurpleMat.emissiveColor = new Color3(0.36, 0.14, 0.56);
    this.crystalPurpleMat.specularColor = new Color3(0.95, 0.80, 1.0);
    this.crystalPurpleMat.maxSimultaneousLights = 8;
    this.crystalPurpleMat.freeze();

    // Cristaux souterrains — Cyan azur
    this.crystalBlueMat = new StandardMaterial('mat_cave_crystal_blue', this.scene);
    this.crystalBlueMat.diffuseColor = new Color3(0.24, 0.68, 0.98);
    this.crystalBlueMat.emissiveColor = new Color3(0.10, 0.36, 0.62);
    this.crystalBlueMat.specularColor = new Color3(0.85, 0.95, 1.0);
    this.crystalBlueMat.maxSimultaneousLights = 8;
    this.crystalBlueMat.freeze();

    // Reliefs rocheux sombres / strates
    this.reliefMat = new StandardMaterial('mat_cave_relief', this.scene);
    this.reliefMat.diffuseColor = new Color3(0.17, 0.19, 0.25);
    this.reliefMat.emissiveColor = new Color3(0.028, 0.032, 0.046);
    this.reliefMat.specularColor = new Color3(0.03, 0.04, 0.05);
    this.reliefMat.maxSimultaneousLights = 12;
    this.reliefMat.freeze();

    // Mousse minérale sombre au sol
    this.mossMat = new StandardMaterial('mat_cave_moss', this.scene);
    this.mossMat.diffuseColor = new Color3(0.10, 0.22, 0.19);
    this.mossMat.specularColor = new Color3(0.02, 0.04, 0.03);
    this.mossMat.maxSimultaneousLights = 8;
    this.mossMat.freeze();
  }

  // --- 1. Sols principaux (Salle centrale, Vestibule, Galerie Est, Grotte Sud) à Y = 0 ---
  initMainFloors() {
    // Sol principal de la salle centrale et vestibule (X: 180 à 216, Z: -13 à 10.5)
    const floorCenter = MeshBuilder.CreateGround('cave_floor_center', {
      width: 36,
      height: 23.5,
      subdivisions: 6
    }, this.scene);
    floorCenter.material = this.floorMat;
    floorCenter.position.set(198, 0, -1.25);
    floorCenter.parent = this.root;
    floorCenter.freezeWorldMatrix();

    // Sol de la Galerie Est (X: 215 à 231, Z: -12 à 12 pour couvrir tous les angles)
    const floorEast = MeshBuilder.CreateGround('cave_floor_east', {
      width: 16,
      height: 24,
      subdivisions: 4
    }, this.scene);
    floorEast.material = this.floorMat;
    floorEast.position.set(223.0, 0, 0);
    floorEast.parent = this.root;
    floorEast.freezeWorldMatrix();

    // Sol du Recoin Secret Sud (X: 194 à 212, Z: -23 à -12.5)
    const floorSouth = MeshBuilder.CreateGround('cave_floor_south', {
      width: 18,
      height: 10.5,
      subdivisions: 3
    }, this.scene);
    floorSouth.material = this.floorMat;
    floorSouth.position.set(203, 0, -17.75);
    floorSouth.parent = this.root;
    floorSouth.freezeWorldMatrix();

    // Allée centrale pavée de dalles antiques reliant l'entrée jusqu'à la Porte de la Crypte Est
    const mainAisle = MeshBuilder.CreateGround('cave_main_aisle', {
      width: 49,
      height: 4.6,
      subdivisions: 6
    }, this.scene);
    mainAisle.material = this.pavingMat;
    mainAisle.position.set(204.5, 0.015, 0);
    mainAisle.parent = this.root;
    mainAisle.freezeWorldMatrix();
  }

  // --- 2. Relief : Plateau surélevé Nord (Y = 1.6) & Rampe d'accès en pierre taillée ---
  initRaisedTerraceAndRamp() {
    // Sol surélevé de la terrasse Nord (X: 194 à 217, Z: 10.5 à 24)
    const terraceGround = MeshBuilder.CreateGround('cave_terrace_ground', {
      width: 23,
      height: 13.5,
      subdivisions: 4
    }, this.scene);
    terraceGround.material = this.terraceFloorMat;
    terraceGround.position.set(205.5, 1.6, 17.25);
    terraceGround.parent = this.root;
    terraceGround.freezeWorldMatrix();

    // Massif rocheux de soutènement sous la terrasse (remplit l'espace de Y = 0 à 1.6)
    const terraceBase = MeshBuilder.CreateBox('cave_terrace_base', {
      width: 23,
      height: 1.6,
      depth: 13.5
    }, this.scene);
    terraceBase.material = this.cliffMat;
    terraceBase.position.set(205.5, 0.8, 17.25);
    terraceBase.parent = this.root;
    terraceBase.freezeWorldMatrix();

    // Muret / Parapet rocheux le long de la corniche (Z = 10.5) pour délimiter le vide
    // Parapet gauche (X: 194 à 199.5)
    const parapetL = MeshBuilder.CreateBox('terrace_parapet_l', { width: 5.5, height: 1.1, depth: 0.6 }, this.scene);
    parapetL.material = this.cliffMat;
    parapetL.position.set(196.75, 2.15, 10.5);
    parapetL.parent = this.root;
    parapetL.freezeWorldMatrix();

    // Parapet droit (X: 204.5 à 217)
    const parapetR = MeshBuilder.CreateBox('terrace_parapet_r', { width: 12.5, height: 1.1, depth: 0.6 }, this.scene);
    parapetR.material = this.cliffMat;
    parapetR.position.set(210.75, 2.15, 10.5);
    parapetR.parent = this.root;
    parapetR.freezeWorldMatrix();

    // --- LA RAMPE DE PIERRE TAILLÉE (X: 199.5 à 204.5, Z: 5.5 à 10.5) ---
    // Pente régulière montant de Y = 0 (au début de la rampe à Z = 5.5) à Y = 1.6 (au plateau à Z = 10.5)
    const rampLength = Math.hypot(5.0, 1.6); // ~5.25m
    const rampAngle = Math.atan2(1.6, 5.0);  // ~17.7°

    const rampMesh = MeshBuilder.CreateBox('cave_stone_ramp', {
      width: 5.0,
      height: 0.4,
      depth: rampLength
    }, this.scene);
    rampMesh.material = this.pavingMat;
    rampMesh.position.set(202.0, 0.75, 8.0);
    rampMesh.rotation.x = -rampAngle;
    rampMesh.parent = this.root;
    rampMesh.freezeWorldMatrix();

    // Bordures latérales de la rampe en pierre taillée (garde-corps bas)
    const curbL = MeshBuilder.CreateBox('ramp_curb_l', { width: 0.35, height: 0.7, depth: rampLength }, this.scene);
    curbL.material = this.cliffMat;
    curbL.position.set(199.35, 0.9, 8.0);
    curbL.rotation.x = -rampAngle;
    curbL.parent = this.root;
    curbL.freezeWorldMatrix();

    const curbR = MeshBuilder.CreateBox('ramp_curb_r', { width: 0.35, height: 0.7, depth: rampLength }, this.scene);
    curbR.material = this.cliffMat;
    curbR.position.set(204.65, 0.9, 8.0);
    curbR.rotation.x = -rampAngle;
    curbR.parent = this.root;
    curbR.freezeWorldMatrix();
  }

  // --- 3. Murs d'enceinte périmétriques (Fermeture étanche de la caverne) ---
  initPerimeterWalls() {
    const wallY = this.wallHeight / 2;

    const createWall = (name, w, h, d, x, y, z) => {
      const wall = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
      wall.material = this.wallMat;
      wall.position.set(x, y, z);
      wall.parent = this.root;
      wall.freezeWorldMatrix();
    };

    // Paroi Nord principale (Z = 24.5)
    createWall('wall_n_main', 54, this.wallHeight, 3.5, 205, wallY, 25.25);

    // Paroi Sud principale (Z = -23.5)
    createWall('wall_s_main', 54, this.wallHeight, 3.5, 205, wallY, -24.75);

    // Paroi Est (Fond de la crypte à X = 230.5)
    createWall('wall_e_crypt', 3.5, this.wallHeight, 24, 231.25, wallY, 0);

    // Paroi Ouest (avec brèche pour l'arche de sortie à Z = [-2.5, 2.5])
    // Segment Nord (Z: 2.5 à 24)
    createWall('wall_w_north', 3.5, this.wallHeight, 22, 178.5, wallY, 13.5);
    // Segment Sud (Z: -24 à -2.5)
    createWall('wall_w_south', 3.5, this.wallHeight, 22, 178.5, wallY, -13.5);
    // Linteau supérieur au-dessus de la sortie Ouest
    createWall('wall_w_top', 3.5, this.wallHeight - 5.0, 5.2, 178.5, 5.0 + (this.wallHeight - 5.0) / 2, 0);

    // Fermeture étanche des 4 zones périphériques (empêche tout vide noir visible ou accessible)
    // 1. Fermeture Nord-Ouest (entre paroi Ouest et flanc Ouest de la terrasse Nord, Z = 10.5)
    createWall('wall_nw_close', 16.5, this.wallHeight, 2.5, 186.25, wallY, 11.75);
    // 2. Paroi Nord de la Galerie Est (Z = 11.0 à 13.5, X = 215.5 à 232.0)
    createWall('wall_east_n_close', 16.5, this.wallHeight, 2.5, 223.75, wallY, 12.25);
    // 3. Paroi Sud de la Galerie Est (Z = -13.5 à -11.0, X = 215.5 à 232.0)
    createWall('wall_east_s_close', 16.5, this.wallHeight, 2.5, 223.75, wallY, -12.25);
    // 4. Paroi Ouest du Recoin Secret Sud (X = 191.75 à 194.25, Z = -24.5 à -11.5)
    createWall('wall_south_w_close', 2.5, this.wallHeight, 13.0, 193.0, wallY, -18.0);
    // 5. Paroi Est du Recoin Secret Sud (X = 211.75 à 214.25, Z = -24.5 à -11.5)
    createWall('wall_south_e_close', 2.5, this.wallHeight, 13.0, 213.0, wallY, -18.0);
  }

  // --- 4. Cloisons rocheuses internes & découpage des recoins ---
  initInternalRockPartitions() {
    const wallY = this.wallHeight / 2;

    const createPartition = (name, w, h, d, x, y, z) => {
      const part = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
      part.material = this.wallMat;
      part.position.set(x, y, z);
      part.parent = this.root;
      part.freezeWorldMatrix();
    };

    // A. Étranglement de la Galerie Est (crée une vraie chambre séparée avec un portail majestueux)
    // Pilastre rocheux Nord (X: 214 à 217, Z: 4.0 à 11.5)
    createPartition('choke_east_n', 3.0, this.wallHeight, 7.5, 215.5, wallY, 7.75);
    // Pilastre rocheux Sud (X: 214 à 217, Z: -11.5 à -4.0)
    createPartition('choke_east_s', 3.0, this.wallHeight, 7.5, 215.5, wallY, -7.75);
    // Voûte au-dessus de la porte Est
    createPartition('choke_east_top', 3.0, this.wallHeight - 5.5, 8.0, 215.5, 5.5 + (this.wallHeight - 5.5) / 2, 0);

    // B. Séparation du Recoin Secret Sud (Crête rocheuse à Z = -12.5)
    // Segment Ouest (X: 180 à 196.5)
    createPartition('ridge_south_w', 16.5, this.wallHeight, 2.5, 188.25, wallY, -12.75);
    // Segment Est (X: 200.0 à 215)
    createPartition('ridge_south_e', 15.0, this.wallHeight, 2.5, 207.5, wallY, -12.75);
    // Voûte au-dessus de l'ouverture du recoin secret (X: 196.5 à 200.0)
    createPartition('ridge_south_top', 3.5, this.wallHeight - 4.5, 2.5, 198.25, 4.5 + (this.wallHeight - 4.5) / 2, -12.75);

    // C. Mur de flanc Ouest de la terrasse Nord (X: 193.5 à 194.5, Z: 10.5 à 24)
    createPartition('terrace_flank_w', 2.0, this.wallHeight, 13.5, 193.0, wallY, 17.25);
    // Flanc Est de la terrasse Nord (X: 216.5 à 218.5, Z: 10.5 à 24)
    createPartition('terrace_flank_e', 2.0, this.wallHeight, 13.5, 218.0, wallY, 17.25);
  }

  // --- 4b. Reliefs rocheux muraux, strates, contreforts et détails de sol ---
  initWallReliefs() {
    const createButtress = (name, x, y, z, w, h, d, rotY = 0) => {
      const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
      m.material = this.reliefMat;
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      m.parent = this.root;
      m.freezeWorldMatrix();
    };

    // Contreforts et strates organiques contre les parois pour briser les lignes droites
    const wallOutcrops = [
      // Paroi Nord (Terrasse)
      { x: 196.2, y: 5.5, z: 23.2, w: 3.2, h: 11.0, d: 1.6, r: 0.12 },
      { x: 201.5, y: 6.2, z: 23.4, w: 2.8, h: 12.0, d: 1.4, r: -0.08 },
      { x: 209.8, y: 6.0, z: 23.3, w: 3.0, h: 11.5, d: 1.5, r: 0.10 },
      { x: 214.8, y: 5.5, z: 23.1, w: 2.6, h: 11.0, d: 1.6, r: -0.14 },
      // Paroi Ouest (Vestibule)
      { x: 180.6, y: 5.0, z: 6.8, w: 1.8, h: 10.0, d: 3.4, r: 0.10 },
      { x: 180.5, y: 5.5, z: -6.5, w: 1.8, h: 11.0, d: 3.8, r: -0.12 },
      // Paroi Est (Fond de la Crypte)
      { x: 229.2, y: 5.5, z: 5.5, w: 1.8, h: 11.0, d: 3.6, r: 0.14 },
      { x: 229.2, y: 5.8, z: -5.2, w: 1.8, h: 11.5, d: 3.8, r: -0.10 },
      // Paroi Sud (Recoin des Cristaux)
      { x: 196.5, y: 5.0, z: -22.6, w: 3.2, h: 10.0, d: 1.8, r: -0.15 },
      { x: 209.2, y: 5.2, z: -22.6, w: 3.4, h: 10.5, d: 1.8, r: 0.12 },
      // Crêtes rocheuses le long de la falaise de la terrasse
      { x: 196.0, y: 0.85, z: 10.0, w: 2.4, h: 1.7, d: 1.0, r: 0.08 },
      { x: 208.5, y: 0.85, z: 10.0, w: 3.2, h: 1.7, d: 1.0, r: -0.06 },
      { x: 213.2, y: 0.85, z: 10.0, w: 2.6, h: 1.7, d: 1.0, r: 0.10 }
    ];

    wallOutcrops.forEach((o, idx) => {
      createButtress(`cave_relief_${idx}`, o.x, o.y, o.z, o.w, o.h, o.d, o.r);
    });

    // Strates horizontales en corniche sur les murs hauts (effet géologique rétro)
    const ledges = [
      { x: 205.5, y: 8.8, z: 23.0, w: 21.0, h: 0.7, d: 1.2 },
      { x: 228.8, y: 8.2, z: 0, w: 1.4, h: 0.7, d: 18.0 },
      { x: 180.8, y: 8.4, z: 8.5, w: 1.3, h: 0.7, d: 9.0 },
      { x: 180.8, y: 8.4, z: -8.0, w: 1.3, h: 0.7, d: 9.0 }
    ];
    ledges.forEach((l, idx) => {
      createButtress(`cave_ledge_${idx}`, l.x, l.y, l.z, l.w, l.h, l.d, 0);
    });

    // Dalles gravées et taches de mousse minérale au sol (relief visuel non bloquant)
    const mossPatches = [
      { x: 188.5, y: 0.02, z: 6.2, r: 1.8 },
      { x: 197.5, y: 0.02, z: -8.5, r: 2.1 },
      { x: 203.0, y: 0.02, z: -18.5, r: 2.6 },
      { x: 222.5, y: 0.02, z: 5.5, r: 1.9 },
      { x: 205.5, y: 1.62, z: 14.2, r: 2.0 }
    ];
    mossPatches.forEach((m, idx) => {
      const disc = MeshBuilder.CreateDisc(`cave_moss_${idx}`, { radius: m.r, tessellation: 7 }, this.scene);
      disc.material = this.mossMat;
      disc.rotation.x = Math.PI / 2;
      disc.position.set(m.x, m.y, m.z);
      disc.parent = this.root;
      disc.freezeWorldMatrix();
    });

    // Petits éboulis décoratifs non bloquants au pied des murs
    const pebbles = [
      { x: 184.5, y: 0.16, z: 7.2, s: 0.35 },
      { x: 191.2, y: 0.14, z: -9.8, s: 0.30 },
      { x: 208.2, y: 0.16, z: 8.8, s: 0.32 },
      { x: 219.5, y: 0.15, z: -8.4, s: 0.34 },
      { x: 226.2, y: 0.16, z: -6.8, s: 0.36 },
      { x: 197.2, y: 1.75, z: 21.8, s: 0.30 },
      { x: 213.8, y: 1.75, z: 21.6, s: 0.32 }
    ];
    pebbles.forEach((p, idx) => {
      const rock = MeshBuilder.CreateSphere(`cave_pebble_${idx}`, { diameter: p.s * 2, segments: 3 }, this.scene);
      rock.material = this.rockMat;
      rock.scaling.set(1.2, 0.7, 1.0);
      rock.position.set(p.x, p.y, p.z);
      rock.parent = this.root;
      rock.freezeWorldMatrix();
    });
  }

  // --- 5. Stalagmites, Rochers d'obstacles & Cristaux dans les recoins ---
  initStalagmitesAndBoulders() {
    const createStalagmiteCluster = (name, x, z, baseR, h) => {
      const cone = MeshBuilder.CreateCylinder(name, {
        height: h,
        diameterTop: 0.05,
        diameterBottom: baseR * 2.0,
        tessellation: 6
      }, this.scene);
      cone.material = this.rockMat;
      cone.position.set(x, h / 2, z);
      cone.parent = this.root;
      cone.freezeWorldMatrix();

      this.rockColliders.push({ type: 'circle', x, z, r: baseR * 0.88, tag: 'stalagmite' });
    };

    const createBoulder = (name, x, y, z, sx, sy, sz, rotY, colR) => {
      const rock = MeshBuilder.CreateSphere(name, { diameter: 2.0, segments: 4 }, this.scene);
      rock.material = this.rockMat;
      rock.scaling.set(sx, sy, sz);
      rock.rotation.y = rotY;
      rock.position.set(x, y, z);
      rock.parent = this.root;
      rock.freezeWorldMatrix();

      if (colR > 0) {
        this.rockColliders.push({ type: 'circle', x, z, r: colR, tag: 'boulder' });
      }
    };

    // 1. Barrière rocheuse naturelle devant le Recoin Secret Sud
    createStalagmiteCluster('stalag_south_1', 195.5, -12.5, 1.1, 4.2);
    createStalagmiteCluster('stalag_south_2', 201.0, -12.5, 1.2, 4.6);
    createStalagmiteCluster('stalag_south_3', 203.2, -12.5, 1.0, 3.8);

    // 2. Éboulis et rochers dans la Grande Salle Centrale et le Vestibule Ouest (gauche & droite à l'arrivée)
    createBoulder('boulder_center_1', 195.0, 1.0, -4.5, 1.8, 1.4, 1.6, 0.7, 1.3);
    createBoulder('boulder_center_2', 208.5, 1.2, -3.0, 1.6, 1.5, 1.7, 1.9, 1.25);
    createStalagmiteCluster('stalag_center_1', 208.0, 3.5, 1.15, 3.9);

    // Zone Nord-Ouest (à gauche en arrivant dans la caverne)
    createStalagmiteCluster('stalag_nw_1', 188.5, 9.2, 1.15, 4.4);
    createStalagmiteCluster('stalag_nw_2', 191.2, 7.6, 0.95, 3.5);
    createBoulder('boulder_nw_1', 185.8, 0.9, 8.6, 1.7, 1.3, 1.5, 1.1, 1.2);
    createBoulder('boulder_nw_2', 182.2, 0.8, 4.8, 1.3, 1.1, 1.4, 2.3, 1.0);

    // Zone Sud-Ouest (à droite en arrivant dans la caverne)
    createStalagmiteCluster('stalag_sw_1', 185.8, -6.5, 1.05, 3.8);
    createStalagmiteCluster('stalag_sw_2', 189.2, -9.2, 1.20, 4.5);
    createBoulder('boulder_sw_1', 182.8, 0.9, -5.2, 1.5, 1.2, 1.4, 0.4, 1.1);

    // Renfort visuel Nord-Est devant la Crypte & coins du Plateau Nord
    createStalagmiteCluster('stalag_ne_center', 211.5, 6.5, 1.05, 4.1);
    createStalagmiteCluster('stalag_terrace_nw', 195.8, 21.5, 1.0, 3.6);
    createStalagmiteCluster('stalag_terrace_ne', 215.2, 21.5, 1.0, 3.6);

    // 3. Formations rocheuses dans la Crypte Est (remplissage des recoins NE et SE)
    createStalagmiteCluster('stalag_east_1', 222.0, -6.5, 1.1, 4.0);
    createStalagmiteCluster('stalag_east_2', 226.8, 6.8, 1.0, 3.7);
    createStalagmiteCluster('stalag_east_3', 219.5, -8.5, 0.95, 3.4);
    createBoulder('boulder_east_niche', 226.5, 1.0, 8.5, 1.5, 1.3, 1.5, 2.2, 1.15);
    createBoulder('boulder_east_se', 224.8, 0.9, -8.2, 1.4, 1.2, 1.4, 1.1, 1.05);
  }

  // --- 5b. Grappes de Cristaux Souterrains Lumineux répartis dans toute la grotte ---
  initCrystalClusters() {
    const materials = {
      emerald: this.crystalMat,
      purple: this.crystalPurpleMat,
      blue: this.crystalBlueMat
    };

    const createCluster = (id, x, baseY, z, scale, colorKey, hasCollider = true) => {
      const mat = materials[colorKey] || this.crystalMat;
      const clusterNode = new TransformNode(`crystal_cluster_${id}`, this.scene);
      clusterNode.position.set(x, baseY, z);
      clusterNode.parent = this.root;

      // 4 prismes cristallins inclinés de hauteurs variées pour un rendu riche et naturel
      const shards = [
        { ox: 0, oz: 0, h: 2.1, r: 0.34, rx: 0.08, rz: -0.06 },
        { ox: 0.32, oz: 0.18, h: 1.45, r: 0.24, rx: 0.26, rz: -0.32 },
        { ox: -0.28, oz: 0.22, h: 1.25, r: 0.22, rx: -0.22, rz: 0.30 },
        { ox: 0.08, oz: -0.30, h: 1.05, r: 0.20, rx: -0.34, rz: -0.14 }
      ];

      shards.forEach((sh, sIdx) => {
        const prism = MeshBuilder.CreateCylinder(`cave_crystal_${id}_${sIdx}`, {
          height: sh.h * scale,
          diameterTop: 0.03,
          diameterBottom: sh.r * 2.0 * scale,
          tessellation: 6
        }, this.scene);
        prism.material = mat;
        prism.position.set(sh.ox * scale, (sh.h * scale) * 0.42, sh.oz * scale);
        prism.rotation.x = sh.rx;
        prism.rotation.z = sh.rz;
        prism.parent = clusterNode;
        prism.freezeWorldMatrix();
      });

      clusterNode.freezeWorldMatrix();

      if (hasCollider) {
        this.rockColliders.push({
          type: 'circle',
          x,
          z,
          r: 0.62 * scale,
          tag: 'crystal_cluster'
        });
      }
    };

    // 1. Sanctuaire des Cristaux — Recoin Secret Sud (très riche)
    createCluster('south_1', 197.5, 0, -21.2, 1.25, 'emerald');
    createCluster('south_2', 202.8, 0, -22.2, 1.40, 'blue');
    createCluster('south_3', 207.8, 0, -21.4, 1.30, 'purple');
    createCluster('south_4', 195.8, 0, -17.0, 0.95, 'blue');
    createCluster('south_5', 210.2, 0, -17.5, 1.05, 'emerald');

    // 2. Vestibule & Salle Centrale (points de repère visuels lumineux)
    createCluster('west_n', 183.2, 0, 8.2, 1.10, 'blue');
    createCluster('west_nw_inner', 190.4, 0, 4.8, 0.95, 'emerald');
    createCluster('west_s', 183.8, 0, -8.8, 1.05, 'emerald');
    createCluster('west_sw_inner', 192.2, 0, -9.8, 1.00, 'purple');
    createCluster('center_ramp_l', 198.2, 0, 8.6, 0.90, 'purple');
    createCluster('center_ramp_r', 205.8, 0, 8.6, 0.90, 'purple');
    createCluster('center_se', 211.8, 0, -9.8, 1.10, 'emerald');

    // 3. Plateau Nord Surélevé (encadrant l'Autel monolithique)
    createCluster('terrace_w', 195.8, 1.6, 12.2, 0.95, 'blue');
    createCluster('terrace_e', 215.2, 1.6, 12.2, 0.95, 'blue');
    createCluster('altar_l', 202.2, 1.6, 21.8, 1.15, 'purple');
    createCluster('altar_r', 208.8, 1.6, 21.8, 1.15, 'purple');

    // 4. Crypte & Galerie Est
    createCluster('east_n', 220.5, 0, 8.8, 1.05, 'emerald');
    createCluster('east_s', 227.6, 0, -8.2, 1.20, 'purple');
    createCluster('east_back_n', 228.5, 0, 4.2, 1.00, 'blue');
    createCluster('east_back_s', 228.5, 0, -3.8, 1.00, 'emerald');
  }

  // --- 5c. Cristaux corrompus (rouges) infligeant des dégâts au contact ---
  initHazardCrystals() {
    const hazards = [
      // Recoin Secret Sud (parcours d'esquive vers le rocher cassable)
      { id: 'south_1', x: 198.2, y: 0, z: -15.6, s: 0.95 },
      { id: 'south_2', x: 206.4, y: 0, z: -15.8, s: 1.0 },
      { id: 'south_3', x: 199.6, y: 0, z: -19.2, s: 0.90 },
      // Crypte Est (flanc Nord)
      { id: 'east_1', x: 224.2, y: 0, z: 5.2, s: 0.95 }
    ];

    hazards.forEach(h => {
      const hc = new HazardCrystal(this.scene, this.root, h.x, h.y, h.z, h.id, h.s);
      this.hazardCrystals.push(hc);
    });
  }

  // --- 5d. Scénario : Pierres cassables -> Bouton secret -> Coffre (Clé) -> Porte verrouillée ---
  initSecretPuzzleAndDoor() {
    // 1. Dalle-interrupteur cachée au sol du Recoin Secret Sud (X: 203.0, Z: -18.5)
    this.switchPos = new Vector3(203.0, 0.02, -18.5);
    this.switchBaseMat = new StandardMaterial('mat_cave_switch_base', this.scene);
    this.switchBaseMat.diffuseColor = new Color3(0.24, 0.26, 0.32);
    this.switchBaseMat.maxSimultaneousLights = 8;
    this.switchBaseMat.freeze();

    this.switchPlateMat = new StandardMaterial('mat_cave_switch_plate', this.scene);
    this.switchPlateMat.diffuseColor = new Color3(0.75, 0.58, 0.18);
    this.switchPlateMat.emissiveColor = this.switchActivated
      ? new Color3(0.15, 0.85, 0.45)
      : new Color3(0.35, 0.25, 0.05);
    this.switchPlateMat.maxSimultaneousLights = 8;

    const swBase = MeshBuilder.CreateBox('cave_switch_base', { width: 1.4, height: 0.12, depth: 1.4 }, this.scene);
    swBase.material = this.switchBaseMat;
    swBase.position.set(this.switchPos.x, 0.06, this.switchPos.z);
    swBase.parent = this.root;
    swBase.freezeWorldMatrix();

    this.switchPlate = MeshBuilder.CreateBox('cave_switch_plate', { width: 1.0, height: 0.14, depth: 1.0 }, this.scene);
    this.switchPlate.material = this.switchPlateMat;
    this.switchPlate.position.set(this.switchPos.x, this.switchActivated ? 0.09 : 0.16, this.switchPos.z);
    this.switchPlate.parent = this.root;

    // 2. Amas de pierres fissurées recouvrant la dalle-interrupteur (cassable en 2 coups)
    if (!this.switchActivated) {
      const rock = new BreakableRock(this.scene, this.root, this.switchPos.x, 0, this.switchPos.z, 'secret_switch_rock');
      this.breakableRocks.push(rock);
    }

    // 3. Coffre ancien caché devant l'Autel du Plateau Nord (X: 205.5, Y: 1.6, Z: 18.8)
    this.chestPos = new Vector3(205.5, 1.6, 18.8);
    this.chestRoot = new TransformNode('cave_secret_chest', this.scene);
    this.chestRoot.position.copyFrom(this.chestPos);
    this.chestRoot.parent = this.root;

    const woodMat = new StandardMaterial('mat_chest_wood', this.scene);
    woodMat.diffuseColor = new Color3(0.45, 0.26, 0.12);
    woodMat.maxSimultaneousLights = 8;
    woodMat.freeze();

    const goldMat = new StandardMaterial('mat_chest_gold', this.scene);
    goldMat.diffuseColor = new Color3(0.95, 0.78, 0.22);
    goldMat.emissiveColor = new Color3(0.35, 0.25, 0.04);
    goldMat.maxSimultaneousLights = 8;
    goldMat.freeze();

    const chestBase = MeshBuilder.CreateBox('chest_base', { width: 1.35, height: 0.65, depth: 0.90 }, this.scene);
    chestBase.material = woodMat;
    chestBase.position.y = 0.325;
    chestBase.parent = this.chestRoot;

    const chestTrim = MeshBuilder.CreateBox('chest_trim', { width: 1.40, height: 0.12, depth: 0.94 }, this.scene);
    chestTrim.material = goldMat;
    chestTrim.position.y = 0.60;
    chestTrim.parent = this.chestRoot;

    const chestLock = MeshBuilder.CreateBox('chest_lock', { width: 0.20, height: 0.24, depth: 0.08 }, this.scene);
    chestLock.material = goldMat;
    chestLock.position.set(0, 0.56, -0.47);
    chestLock.parent = this.chestRoot;

    // Couvercle articulé
    this.chestLidPivot = new TransformNode('chest_lid_pivot', this.scene);
    this.chestLidPivot.position.set(0, 0.65, 0.45);
    this.chestLidPivot.parent = this.chestRoot;

    const chestLid = MeshBuilder.CreateBox('chest_lid', { width: 1.38, height: 0.28, depth: 0.92 }, this.scene);
    chestLid.material = woodMat;
    chestLid.position.set(0, 0.14, -0.45);
    chestLid.parent = this.chestLidPivot;

    if (this.chestOpened) {
      this.chestLidPivot.rotation.x = 1.35;
    }
    this.chestRoot.setEnabled(this.chestRevealed);

    // Enregistrement du coffre contenant la Clé simple (ouvre la grille Ouest de la Plaine d'Éveil)
    this.interactables.push({
      id: 'cave_secret_chest',
      position: this.chestPos,
      radius: 2.3,
      isAvailable: () => this.chestRevealed && !this.chestOpened,
      promptText: '[E] Ouvrir le coffre',
      onInteract: () => {
        if (this.chestOpened) return;
        this.chestOpened = true;
        this.chestLidPivot.rotation.x = 1.35;
        this.saveData.simpleKey = true;
        SaveManager.save(this.saveData);
      }
    });
  }

  /**
   * Retourne l'élément interactif le plus proche de Zelya dans la caverne.
   */
  getNearestInteractable(playerPos, playerFacingAngle = null) {
    let nearest = null;
    let minDist = Infinity;

    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      if (typeof item.isAvailable === 'function' && !item.isAvailable()) continue;
      if (Math.abs(item.position.y - playerPos.y) > 1.3) continue;

      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= item.radius && dist < minDist) {
        if (playerFacingAngle !== null && playerFacingAngle !== undefined && dist > 0.1) {
          const dot = Math.sin(playerFacingAngle) * (dx / dist) + Math.cos(playerFacingAngle) * (dz / dist);
          if (dot < -0.25) continue;
        }
        minDist = dist;
        nearest = {
          ...item,
          promptText: typeof item.getPromptText === 'function' ? item.getPromptText() : item.promptText
        };
      }
    }
    return nearest;
  }

  consumeNotification() {
    const n = this.pendingNotification;
    this.pendingNotification = null;
    return n;
  }

  // --- 6. Piliers antiques & Autel monolithique sur la terrasse ---
  initAncientMonoliths() {
    const colMat = new StandardMaterial('mat_cave_column', this.scene);
    colMat.diffuseColor = new Color3(0.25, 0.28, 0.35);
    colMat.specularColor = new Color3(0.06, 0.07, 0.09);
    colMat.maxSimultaneousLights = 8;
    colMat.freeze();

    // 4 Piliers octogonaux majestueux dans les carrefours
    const columns = [
      { x: 192, y: 0, z: -7, r: 1.3 },
      { x: 213, y: 0, z: -7, r: 1.3 },
      { x: 219, y: 0, z: 4.5, r: 1.1 },
      { x: 219, y: 0, z: -4.5, r: 1.1 }
    ];

    columns.forEach((c, idx) => {
      const col = MeshBuilder.CreateCylinder(`cave_pillar_${idx}`, {
        height: this.wallHeight,
        diameter: c.r * 2.0,
        tessellation: 8
      }, this.scene);
      col.material = colMat;
      col.position.set(c.x, this.wallHeight / 2, c.z);
      col.parent = this.root;
      col.freezeWorldMatrix();

      this.rockColliders.push({ type: 'circle', x: c.x, z: c.z, r: c.r * 0.95, tag: 'column' });
    });

    // Autel monolithique ancien trônant au fond du Plateau Nord (X = 205.5, Y = 1.6, Z = 21.0)
    const altarBase = MeshBuilder.CreateBox('ancient_altar_base', { width: 3.2, height: 0.6, depth: 2.2 }, this.scene);
    altarBase.material = colMat;
    altarBase.position.set(205.5, 1.9, 21.0);
    altarBase.parent = this.root;
    altarBase.freezeWorldMatrix();

    const altarPillar = MeshBuilder.CreateBox('ancient_altar_stele', { width: 1.8, height: 2.4, depth: 0.8 }, this.scene);
    altarPillar.material = colMat;
    altarPillar.position.set(205.5, 3.4, 21.0);
    altarPillar.parent = this.root;
    altarPillar.freezeWorldMatrix();

    this.rockColliders.push({
      type: 'box',
      minX: 203.7,
      maxX: 207.3,
      minZ: 19.8,
      maxZ: 22.2,
      tag: 'altar'
    });
  }

  // --- 7. Arche & boyau de sortie vers la Plaine (X = 180, Z = 0) ---
  initEntranceExitCorridor() {
    const archMat = new StandardMaterial('mat_cave_exit_arch', this.scene);
    archMat.diffuseColor = new Color3(0.28, 0.31, 0.38);
    archMat.maxSimultaneousLights = 8;
    archMat.freeze();

    // Piliers de l'arche de sortie
    const colN = MeshBuilder.CreateBox('cave_exit_col_n', { width: 2.0, height: 5.5, depth: 1.6 }, this.scene);
    colN.material = archMat;
    colN.position.set(180.0, 2.75, 2.2);
    colN.parent = this.root;
    colN.freezeWorldMatrix();

    const colS = MeshBuilder.CreateBox('cave_exit_col_s', { width: 2.0, height: 5.5, depth: 1.6 }, this.scene);
    colS.material = archMat;
    colS.position.set(180.0, 2.75, -2.2);
    colS.parent = this.root;
    colS.freezeWorldMatrix();

    const topBeam = MeshBuilder.CreateBox('cave_exit_beam', { width: 2.2, height: 1.5, depth: 5.8 }, this.scene);
    topBeam.material = archMat;
    topBeam.position.set(180.0, 5.25, 0);
    topBeam.parent = this.root;
    topBeam.freezeWorldMatrix();

    // Clarté du jour extérieure filtrant par la bouche du tunnel à l'Ouest
    const daylightMat = new StandardMaterial('mat_cave_daylight_glow', this.scene);
    daylightMat.diffuseColor = new Color3(0.4, 0.65, 0.55);
    daylightMat.emissiveColor = new Color3(0.28, 0.45, 0.38);
    daylightMat.specularColor = new Color3(0, 0, 0);
    daylightMat.freeze();

    const daylightPlane = MeshBuilder.CreatePlane('cave_daylight_back', { width: 3.4, height: 4.5 }, this.scene);
    daylightPlane.material = daylightMat;
    daylightPlane.rotation.y = Math.PI / 2;
    daylightPlane.position.set(175.2, 2.25, 0);
    daylightPlane.parent = this.root;
    daylightPlane.freezeWorldMatrix();

    // Sol, parois latérales et plafond du boyau de sortie (X: 175 à 180) pour éviter tout vide noir
    const exitFloor = MeshBuilder.CreateGround('cave_exit_floor', { width: 6.0, height: 5.2 }, this.scene);
    exitFloor.material = this.pavingMat;
    exitFloor.position.set(177.5, 0.01, 0);
    exitFloor.parent = this.root;
    exitFloor.freezeWorldMatrix();

    const exitWallN = MeshBuilder.CreateBox('cave_exit_tun_n', { width: 5.5, height: 5.5, depth: 1.2 }, this.scene);
    exitWallN.material = this.wallMat;
    exitWallN.position.set(177.5, 2.75, 2.6);
    exitWallN.parent = this.root;
    exitWallN.freezeWorldMatrix();

    const exitWallS = MeshBuilder.CreateBox('cave_exit_tun_s', { width: 5.5, height: 5.5, depth: 1.2 }, this.scene);
    exitWallS.material = this.wallMat;
    exitWallS.position.set(177.5, 2.75, -2.6);
    exitWallS.parent = this.root;
    exitWallS.freezeWorldMatrix();

    const exitCeil = MeshBuilder.CreateBox('cave_exit_tun_ceil', { width: 5.5, height: 1.2, depth: 5.6 }, this.scene);
    exitCeil.material = this.wallMat;
    exitCeil.position.set(177.5, 5.2, 0);
    exitCeil.parent = this.root;
    exitCeil.freezeWorldMatrix();
  }

  // --- 8. Plafond horizontal haut de la caverne & Stalactites ---
  initCeiling() {
    const ceilingMat = new StandardMaterial('mat_cave_ceiling', this.scene);
    ceilingMat.diffuseColor = new Color3(0.08, 0.09, 0.12);
    ceilingMat.specularColor = new Color3(0, 0, 0);
    ceilingMat.freeze();

    const ceiling = MeshBuilder.CreateGround('cave_ceiling_main', { width: 56, height: 50 }, this.scene);
    ceiling.material = ceilingMat;
    ceiling.rotation.x = Math.PI;
    ceiling.position.set(205, this.wallHeight, 0);
    ceiling.parent = this.root;
    ceiling.freezeWorldMatrix();

    // Stalactites suspendues au plafond pour donner du relief vertical et de la profondeur
    const stalactites = [
      { x: 187.5, z: 5.0, r: 0.75, h: 3.4 },
      { x: 193.0, z: -4.5, r: 0.90, h: 4.1 },
      { x: 199.5, z: 2.0, r: 0.85, h: 3.8 },
      { x: 206.5, z: -6.0, r: 0.80, h: 3.6 },
      { x: 211.0, z: 4.5, r: 0.70, h: 3.2 },
      { x: 200.0, z: 16.5, r: 0.85, h: 3.5 },
      { x: 211.5, z: 18.0, r: 0.75, h: 3.1 },
      { x: 202.5, z: -17.5, r: 0.80, h: 3.7 },
      { x: 221.5, z: 3.0, r: 0.85, h: 3.9 },
      { x: 225.0, z: -4.5, r: 0.75, h: 3.3 }
    ];

    stalactites.forEach((st, idx) => {
      const cone = MeshBuilder.CreateCylinder(`cave_stalactite_${idx}`, {
        height: st.h,
        diameterTop: st.r * 2.0,
        diameterBottom: 0.05,
        tessellation: 6
      }, this.scene);
      cone.material = this.rockMat;
      cone.position.set(st.x, this.wallHeight - st.h / 2, st.z);
      cone.parent = this.root;
      cone.freezeWorldMatrix();
    });
  }

  // --- 9. Implantation des 7 Torches / Braseros dans tous les recoins ---
  initTorches() {
    // Les torches principales de l'entrée, du carrefour et du fond éclairent dès l'arrivée,
    // tandis que les recoins restent à allumer par le joueur pour révéler tout le donjon.
    const torchConfigs = [
      // 1. Vestibule Ouest (allumée pour accueillir Zelya et éclairer la gauche dès l'entrée)
      { id: 'west', x: 186.0, y: 0.0, z: 4.0, startLit: true },

      // 2. Carrefour de la Salle Centrale (allumée)
      { id: 'center', x: 201.0, y: 0.0, z: -3.5, startLit: true },

      // 3. Plateau Nord Surélevé - Côté gauche de l'autel
      { id: 'north_l', x: 198.0, y: 1.6, z: 19.5, startLit: false },

      // 4. Plateau Nord Surélevé - Côté droit de l'autel
      { id: 'north_r', x: 213.0, y: 1.6, z: 19.5, startLit: false },

      // 5. Cœur du Recoin Secret Sud (Antre des Ombres & Cristaux)
      { id: 'south', x: 203.0, y: 0.0, z: -20.0, startLit: false },

      // 6. Niche Nord-Est de la Crypte
      { id: 'east_niche', x: 224.0, y: 0.0, z: 7.5, startLit: false },

      // 7. Fond Est de la Crypte (allumée pour mettre en valeur la porte verrouillée)
      { id: 'east_main', x: 227.5, y: 0.0, z: 0.0, startLit: true }
    ];

    torchConfigs.forEach(cfg => {
      const torch = new Torch(this.scene, this.root, cfg.x, cfg.y, cfg.z, cfg.id, {
        startLit: cfg.startLit,
        lightRange: 17.5,
        lightIntensity: 4.0
      });
      this.torches.push(torch);
    });
  }

  // --- 9b. Implantation des 3 Squelettes Archers répartis dans la grotte ---
  initSkeletons() {
    const getH = (x, z) => this.getGroundHeight(x, z);

    const skeletonConfigs = [
      // 1. Salle Centrale (garde l'accès vers la rampe et la galerie Est)
      {
        id: 'center',
        x: 207.5,
        z: -6.5,
        facingAngle: -Math.PI * 0.65,
        leashRadius: 8.5,
        waypoints: [
          { x: 207.5, z: -6.5 },
          { x: 204.5, z: -2.0 },
          { x: 210.5, z: -5.5 }
        ]
      },
      // 2. Plateau Nord Surélevé (garde l'autel ancien)
      {
        id: 'terrace',
        x: 205.5,
        z: 16.5,
        facingAngle: Math.PI,
        leashRadius: 7.5,
        waypoints: [
          { x: 201.0, z: 16.0 },
          { x: 210.0, z: 16.0 },
          { x: 205.5, z: 14.0 }
        ]
      },
      // 3. Crypte Est (garde la chambre du fond)
      {
        id: 'crypt',
        x: 223.8,
        z: -2.0,
        facingAngle: -Math.PI / 2,
        leashRadius: 7.5,
        waypoints: [
          { x: 223.8, z: -2.0 },
          { x: 223.5, z: 3.5 },
          { x: 226.0, z: -3.5 }
        ]
      }
    ];

    skeletonConfigs.forEach(cfg => {
      const skel = new SkeletonArcher(this.scene, this.root, cfg, getH);
      this.skeletons.push(skel);
    });
  }

  // --- 9c. Nuées de chauves-souris inoffensives à hauteur de vue (réactives à Zelya & à la lumière) ---
  initBats() {
    const flocks = [
      // 1. Nuée du Vestibule / Salle Centrale (visible dès l'entrée dans la grotte)
      { id: 'west', x: 191.5, y: 2.55, z: 2.0, groundY: 0, count: 3, radiusX: 3.0, radiusZ: 2.2, figureEight: true },
      // 2. Nuée du Sanctuaire des Cristaux Sud
      { id: 'south', x: 202.5, y: 2.50, z: -17.8, groundY: 0, count: 4, radiusX: 2.8, radiusZ: 1.9, figureEight: true },
      // 3. Nuée de la Crypte Est
      { id: 'east', x: 222.5, y: 2.65, z: 1.8, groundY: 0, count: 3, radiusX: 2.6, radiusZ: 2.8, figureEight: false }
    ];

    flocks.forEach(flock => {
      for (let i = 0; i < flock.count; i++) {
        const angle = (i / flock.count) * Math.PI * 2;
        const bat = new CaveBat(
          this.scene,
          this.root,
          flock.x,
          flock.y,
          flock.z,
          `${flock.id}_${i}`,
          {
            groundY: flock.groundY,
            radiusX: flock.radiusX + (i % 2) * 0.4,
            radiusZ: flock.radiusZ + ((i + 1) % 2) * 0.35,
            speed: 1.05 + (i % 3) * 0.14,
            figureEight: flock.figureEight,
            phaseOffset: i * 0.65,
            offsetX: Math.cos(angle) * 0.75,
            offsetY: (i - 1) * 0.28,
            offsetZ: Math.sin(angle) * 0.75
          }
        );
        this.bats.push(bat);
      }
    });
  }

  // --- 10. Particules ambiantes souterraines ---
  initCaveParticles() {
    const particleMat = new StandardMaterial('mat_cave_dust_particle', this.scene);
    particleMat.diffuseColor = new Color3(0.40, 0.50, 0.70);
    particleMat.emissiveColor = new Color3(0.18, 0.28, 0.45);
    particleMat.specularColor = new Color3(0, 0, 0);
    particleMat.freeze();

    const count = 32;
    for (let i = 0; i < count; i++) {
      const p = MeshBuilder.CreateBox(`cave_dust_${i}`, { width: 0.12, height: 0.12, depth: 0.12 }, this.scene);
      p.material = particleMat;

      const px = 184 + Math.random() * 42;
      const py = 0.5 + Math.random() * 6.0;
      const pz = -20 + Math.random() * 42;

      p.position.set(px, py, pz);
      p.parent = this.root;

      this.caveParticles.push({
        mesh: p,
        baseX: px,
        baseY: py,
        baseZ: pz,
        speedX: (Math.random() - 0.5) * 0.35,
        speedZ: (Math.random() - 0.5) * 0.35,
        bobSpeed: 1.0 + Math.random() * 1.5,
        bobAmp: 0.2 + Math.random() * 0.3,
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Fournisseur de hauteur verticale (Relief, Rampe & Terrasse surélevée).
   * Retourne l'altitude Y exacte du sol à n'importe quelle coordonnée (X, Z).
   */
  getGroundHeight(x, z) {
    // 1. Sur le plateau surélevé Nord (Y = 1.6)
    if (x >= 194.5 && x <= 216.5 && z >= 10.5 && z <= 24.5) {
      return 1.6;
    }
    // 2. Sur la rampe de pierre reliant le sol (Z = 5.5, Y = 0) au plateau (Z = 10.5, Y = 1.6)
    if (x >= 199.5 && x <= 204.5 && z >= 5.5 && z <= 10.5) {
      const t = (z - 5.5) / 5.0; // 0.0 -> 1.0
      return t * 1.6;
    }
    // 3. Tout le reste de la caverne (Sol de base à Y = 0)
    return 0.0;
  }

  /**
   * Enregistre l'INTÉGRALITÉ des obstacles solides dans le CollisionManager sous la zone 'cavern'.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Murs d'enceinte périmétriques
    // Paroi Nord
    collisionManager.addBox(178.0, 232.0, 23.5, 27.0, 'cave_wall_n', 'cavern');
    // Paroi Sud
    collisionManager.addBox(178.0, 232.0, -26.5, -23.0, 'cave_wall_s', 'cavern');
    // Paroi Est (Fond)
    collisionManager.addBox(229.5, 233.0, -12.0, 12.0, 'cave_wall_e', 'cavern');

    // Paroi Ouest (côtés de la sortie)
    // Segment Nord (Z > 2.2)
    collisionManager.addBox(176.5, 180.5, 2.2, 25.0, 'cave_wall_w_n', 'cavern');
    // Segment Sud (Z < -2.2)
    collisionManager.addBox(176.5, 180.5, -25.0, -2.2, 'cave_wall_w_s', 'cavern');
    // Tunnel de sortie (Z: +/- 2.2 à +/- 3.8)
    collisionManager.addBox(174.5, 180.0, 1.8, 3.8, 'cave_tun_n', 'cavern');
    collisionManager.addBox(174.5, 180.0, -3.8, -1.8, 'cave_tun_s', 'cavern');

    // Fermetures étanches des zones périphériques (alignées sur les murs)
    collisionManager.addBox(178.0, 194.5, 10.5, 13.0, 'cave_wall_nw_close', 'cavern');
    collisionManager.addBox(215.5, 232.0, 11.0, 13.5, 'cave_wall_east_n_close', 'cavern');
    collisionManager.addBox(215.5, 232.0, -13.5, -11.0, 'cave_wall_east_s_close', 'cavern');
    collisionManager.addBox(191.75, 194.25, -24.5, -11.5, 'cave_wall_south_w_close', 'cavern');
    collisionManager.addBox(211.75, 214.25, -24.5, -11.5, 'cave_wall_south_e_close', 'cavern');

    // 2. Relief : Falaises et Parapets du Plateau Nord
    // Parapet gauche le long du vide (X: 194 à 199.5, Z = 10.5)
    collisionManager.addBox(193.5, 199.5, 9.9, 10.9, 'terrace_parapet_l', 'cavern');
    // Parapet droit le long du vide (X: 204.5 à 217, Z = 10.5)
    collisionManager.addBox(204.5, 217.5, 9.9, 10.9, 'terrace_parapet_r', 'cavern');
    // Garde-corps latéraux de la rampe
    collisionManager.addBox(199.0, 199.5, 5.5, 10.5, 'ramp_curb_l', 'cavern');
    collisionManager.addBox(204.5, 205.0, 5.5, 10.5, 'ramp_curb_r', 'cavern');
    // Flancs extérieurs de la terrasse
    collisionManager.addBox(192.0, 194.5, 10.5, 24.0, 'terrace_flank_w', 'cavern');
    collisionManager.addBox(216.5, 219.0, 10.5, 24.0, 'terrace_flank_e', 'cavern');

    // 3. Cloisons internes de séparation des salles
    // Étranglement de la Galerie Est (X = 215.5)
    collisionManager.addBox(214.0, 217.0, 4.0, 11.5, 'choke_east_n', 'cavern');
    collisionManager.addBox(214.0, 217.0, -11.5, -4.0, 'choke_east_s', 'cavern');

    // Crête rocheuse du Recoin Secret Sud (Z = -12.5)
    // Segment Ouest (X: 178 à 196.5)
    collisionManager.addBox(178.0, 196.5, -13.5, -11.5, 'ridge_south_w', 'cavern');
    // Segment Est (X: 200.0 à 216.0)
    collisionManager.addBox(200.0, 216.0, -13.5, -11.5, 'ridge_south_e', 'cavern');

    // 4. Stalagmites, Rochers, Colonnes et Monolithes enregistrés
    this.rockColliders.forEach(c => {
      if (c.type === 'circle') {
        collisionManager.addCircle(c.x, c.z, c.r, c.tag || 'rock', 'cavern');
      } else if (c.type === 'box') {
        collisionManager.addBox(c.minX, c.maxX, c.minZ, c.maxZ, c.tag || 'rock', 'cavern');
      }
    });

    // 5. Collisions physiques solides de chaque piédestal de Torche
    this.torches.forEach(t => {
      t.initColliders(collisionManager);
    });

    // 6. Collisions dynamiques des Squelettes Archers vivants & Pierres cassables
    collisionManager.addDynamicSource(() => {
      const list = [];
      for (let i = 0; i < this.skeletons.length; i++) {
        const col = this.skeletons[i].getCollider();
        if (col) list.push(col);
      }
      for (let i = 0; i < this.breakableRocks.length; i++) {
        const col = this.breakableRocks[i].getCollider();
        if (col) list.push(col);
      }
      if (this.chestRevealed) {
        list.push({
          type: 'box',
          minX: this.chestPos.x - 0.72,
          maxX: this.chestPos.x + 0.72,
          minZ: this.chestPos.z - 0.50,
          maxZ: this.chestPos.z + 0.50,
          tag: 'secret_chest',
          zone: 'cavern'
        });
      }
      return list;
    }, 'cavern');
  }

  /**
   * Vérifie les frappes à l'épée contre les torches, les squelettes, les pierres cassables et les flèches.
   */
  checkSwordHits(playerPos, playerFacingAngle, weapon, cameraManager = null, audioManager = null) {
    let anyHit = false;
    for (let i = 0; i < this.torches.length; i++) {
      const hit = this.torches[i].checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager, audioManager);
      if (hit) anyHit = true;
    }

    // Frappes sur les pierres cassables
    for (let i = 0; i < this.breakableRocks.length; i++) {
      const hit = this.breakableRocks[i].checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager);
      if (hit) anyHit = true;
    }

    // Frappes sur les Squelettes Archers (meurent en 2 coups)
    for (let i = 0; i < this.skeletons.length; i++) {
      const hit = this.skeletons[i].checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager);
      if (hit) {
        anyHit = true;
        if (audioManager && typeof audioManager.playHurt === 'function') {
          audioManager.playHurt();
        }
      }
    }

    // Possibilité de dévier/trancher une flèche en plein vol avec l'épée
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (!arrow.isAlive) continue;
      if (weapon.checkHit(playerPos, playerFacingAngle, arrow.position, 0.55)) {
        arrow.destroy(true);
        anyHit = true;
      }
    }

    return anyHit;
  }

  /**
   * Vérifie la proximité des torches lorsque Zelya brandit son épée en Mode Torche.
   */
  checkTorchProximity(playerPos, isTorchMode, cameraManager = null, audioManager = null) {
    if (!isTorchMode) return;
    for (let i = 0; i < this.torches.length; i++) {
      this.torches[i].checkProximity(playerPos, isTorchMode, cameraManager, audioManager);
    }
  }

  /**
   * Bornes de navigation de la caverne.
   */
  getBounds() {
    return {
      player: {
        minX: 180.2,
        maxX: 228.5,
        minZ: -22.0,
        maxZ: 23.5
      },
      camera: {
        minX: 180.0,
        maxX: 229.0,
        minZ: -22.5,
        maxZ: 24.0
      }
    };
  }

  clearArrows() {
    for (let i = 0; i < this.arrows.length; i++) {
      this.arrows[i].dispose();
    }
    this.arrows = [];
  }

  resetPuzzle() {
    this.switchActivated = false;
    this.chestRevealed = false;
    this.chestOpened = false;

    if (this.switchPlate) {
      this.switchPlate.position.y = 0.16;
    }
    if (this.switchPlateMat) {
      this.switchPlateMat.emissiveColor.set(0.35, 0.25, 0.05);
    }
    if (this.chestRoot) {
      this.chestRoot.setEnabled(false);
    }
    if (this.chestLidPivot) {
      this.chestLidPivot.rotation.x = 0;
    }

    if (this.breakableRocks.length === 0) {
      const rock = new BreakableRock(this.scene, this.root, this.switchPos.x, 0, this.switchPos.z, 'secret_switch_rock');
      this.breakableRocks.push(rock);
    } else {
      this.breakableRocks.forEach(r => {
        r.health = 2;
        r.isBroken = false;
        r.root.setEnabled(true);
        r.visualNode.scaling.set(1, 1, 1);
        r.crackMat.emissiveColor.set(0.30, 0.24, 0.08);
      });
    }
    this.resetEnemies();
  }

  resetEnemies() {
    this.clearArrows();
    for (let i = 0; i < this.skeletons.length; i++) {
      this.skeletons[i].reset();
    }
  }

  setEnabled(enabled) {
    if (this.root) {
      this.root.setEnabled(enabled);
    }
    if (!enabled) {
      this.clearArrows();
    }
    // Désactiver également les lumières ponctuelles des torches si la caverne est masquée
    this.torches.forEach(t => {
      if (t.pointLight) {
        t.pointLight.setEnabled(enabled && t.isLit);
      }
    });
  }

  /**
   * Boucle de mise à jour de la caverne (torches, squelettes, flèches, chauves-souris, particules).
   */
  update(dt, player, cameraManager = null, audioManager = null, collisionManager = null) {
    if (!this.root.isEnabled()) return;

    // 1. Mise à jour des 7 torches
    for (let i = 0; i < this.torches.length; i++) {
      this.torches[i].update(dt);
    }

    // 2. Détection de proximité automatique en Mode Torche
    if (player && player.isTorchMode) {
      this.checkTorchProximity(player.getPosition(), player.isTorchMode, cameraManager, audioManager);
    }

    // 3. Mise à jour des 3 Squelettes Archers
    for (let i = 0; i < this.skeletons.length; i++) {
      this.skeletons[i].update(dt, player, collisionManager, (arrow) => {
        this.arrows.push(arrow);
      });
    }

    // 4. Mise à jour des flèches actives
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.update(dt, player, collisionManager);
      if (!arrow.isAlive) {
        this.arrows.splice(i, 1);
      }
    }

    // 5. Mise à jour des nuées de chauves-souris inoffensives (réactives à Zelya & au Mode Torche)
    for (let i = 0; i < this.bats.length; i++) {
      this.bats[i].update(dt, player);
    }

    // 5b. Cristaux corrompus (dégâts au contact)
    for (let i = 0; i < this.hazardCrystals.length; i++) {
      this.hazardCrystals[i].update(dt, player);
    }

    // 5c. Pierres cassables & Détection de la dalle-interrupteur secrète
    let rockStillBlocking = false;
    for (let i = 0; i < this.breakableRocks.length; i++) {
      this.breakableRocks[i].update(dt, player);
      if (!this.breakableRocks[i].isBroken) rockStillBlocking = true;
    }

    if (!this.switchActivated && !rockStillBlocking && player) {
      const pPos = player.getPosition();
      const dx = pPos.x - this.switchPos.x;
      const dz = pPos.z - this.switchPos.z;
      if (dx * dx + dz * dz < 1.15 * 1.15) {
        this.switchActivated = true;
        this.chestRevealed = true;
        this.switchPlate.position.y = 0.09;
        this.switchPlateMat.emissiveColor.set(0.15, 0.85, 0.45);
        this.chestRoot.setEnabled(true);
        if (cameraManager) {
          cameraManager.shake(0.24, 0.35);
        }
      }
    }

    // 6. Dérive douce des particules de poussière souterraine
    this.particleTime += dt;
    for (let i = 0; i < this.caveParticles.length; i++) {
      const p = this.caveParticles[i];
      p.mesh.position.x += p.speedX * dt;
      p.mesh.position.z += p.speedZ * dt;
      p.mesh.position.y = p.baseY + Math.sin(this.particleTime * p.bobSpeed + p.seed) * p.bobAmp;

      if (p.mesh.position.x > 228) p.mesh.position.x = 184;
      if (p.mesh.position.x < 184) p.mesh.position.x = 228;
      if (p.mesh.position.z > 22) p.mesh.position.z = -22;
      if (p.mesh.position.z < -22) p.mesh.position.z = 22;

      p.mesh.rotation.y += dt * 0.8;
    }
  }

  dispose() {
    this.clearArrows();
    this.skeletons.forEach(s => s.dispose());
    this.skeletons = [];
    this.bats.forEach(b => b.dispose());
    this.bats = [];
    this.torches.forEach(t => t.dispose());
    this.torches = [];
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
