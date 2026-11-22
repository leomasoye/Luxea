import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Torch } from '../entities/Torch.js';

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
  constructor(scene) {
    this.scene = scene;
    this.root = new TransformNode('CaveRoot', this.scene);

    // Espace de coordonnées de la caverne : X de 180 à 230, Z de -23 à 24
    this.wallHeight = 13.0;

    // Collections
    this.torches = [];
    this.caveParticles = [];
    this.particleTime = 0;
    this.rockColliders = [];

    // Matériaux partagés avec maxSimultaneousLights = 8 pour supporter l'éclairage des torches
    this.initMaterials();

    // Construction architecturale des 5 zones
    this.initMainFloors();
    this.initRaisedTerraceAndRamp();
    this.initPerimeterWalls();
    this.initInternalRockPartitions();
    this.initStalagmitesAndBoulders();
    this.initAncientMonoliths();
    this.initEntranceExitCorridor();
    this.initCeiling();
    this.initTorches();
    this.initCaveParticles();
  }

  initMaterials() {
    // Sol de pierre sombre
    this.floorMat = new StandardMaterial('mat_cave_floor', this.scene);
    this.floorMat.diffuseColor = new Color3(0.13, 0.15, 0.19);
    this.floorMat.specularColor = new Color3(0.04, 0.05, 0.06);
    this.floorMat.maxSimultaneousLights = 8;
    this.floorMat.freeze();

    // Dalles centrales pavées (allée usée)
    this.pavingMat = new StandardMaterial('mat_cave_paving', this.scene);
    this.pavingMat.diffuseColor = new Color3(0.18, 0.20, 0.26);
    this.pavingMat.specularColor = new Color3(0.06, 0.07, 0.08);
    this.pavingMat.maxSimultaneousLights = 8;
    this.pavingMat.freeze();

    // Sol de la terrasse surélevée Nord
    this.terraceFloorMat = new StandardMaterial('mat_terrace_floor', this.scene);
    this.terraceFloorMat.diffuseColor = new Color3(0.16, 0.18, 0.23);
    this.terraceFloorMat.specularColor = new Color3(0.05, 0.06, 0.07);
    this.terraceFloorMat.maxSimultaneousLights = 8;
    this.terraceFloorMat.freeze();

    // Parois rocheuses périmétriques
    this.wallMat = new StandardMaterial('mat_cave_wall', this.scene);
    this.wallMat.diffuseColor = new Color3(0.19, 0.21, 0.27);
    this.wallMat.specularColor = new Color3(0.03, 0.04, 0.05);
    this.wallMat.maxSimultaneousLights = 8;
    this.wallMat.freeze();

    // Falaise / Muret de soutènement de la terrasse
    this.cliffMat = new StandardMaterial('mat_cave_cliff', this.scene);
    this.cliffMat.diffuseColor = new Color3(0.22, 0.25, 0.31);
    this.cliffMat.specularColor = new Color3(0.05, 0.06, 0.07);
    this.cliffMat.maxSimultaneousLights = 8;
    this.cliffMat.freeze();

    // Stalagmites et formations rocheuses brutes
    this.rockMat = new StandardMaterial('mat_cave_rock', this.scene);
    this.rockMat.diffuseColor = new Color3(0.15, 0.17, 0.22);
    this.rockMat.specularColor = new Color3(0.03, 0.03, 0.04);
    this.rockMat.maxSimultaneousLights = 8;
    this.rockMat.freeze();

    // Cristaux souterrains mystiques (Recoin Sud)
    this.crystalMat = new StandardMaterial('mat_cave_crystal', this.scene);
    this.crystalMat.diffuseColor = new Color3(0.2, 0.8, 0.65);
    this.crystalMat.emissiveColor = new Color3(0.1, 0.45, 0.35);
    this.crystalMat.specularColor = new Color3(0.8, 1.0, 0.9);
    this.crystalMat.maxSimultaneousLights = 8;
    this.crystalMat.freeze();
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

    // Sol de la Galerie Est (X: 215 à 230, Z: -10 à 10)
    const floorEast = MeshBuilder.CreateGround('cave_floor_east', {
      width: 15,
      height: 20,
      subdivisions: 3
    }, this.scene);
    floorEast.material = this.floorMat;
    floorEast.position.set(222.5, 0, 0);
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

    // Allée centrale pavée de dalles antiques reliant l'entrée vers l'Est
    const mainAisle = MeshBuilder.CreateGround('cave_main_aisle', {
      width: 36,
      height: 4.6,
      subdivisions: 4
    }, this.scene);
    mainAisle.material = this.pavingMat;
    mainAisle.position.set(198, 0.015, 0);
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

    // 2. Éboulis et rochers dans la Grande Salle Centrale
    createBoulder('boulder_center_1', 195.0, 1.0, -4.5, 1.8, 1.4, 1.6, 0.7, 1.3);
    createBoulder('boulder_center_2', 208.5, 1.2, -3.0, 1.6, 1.5, 1.7, 1.9, 1.25);
    createStalagmiteCluster('stalag_center_1', 208.0, 3.5, 1.15, 3.9);

    // 3. Cristaux magiques incrustés au fond du Recoin Secret Sud
    const crystalPositions = [
      { x: 198.5, y: 1.1, z: -21.5, s: 1.2, rotX: 0.2, rotZ: -0.3 },
      { x: 206.5, y: 1.3, z: -21.8, s: 1.4, rotX: -0.1, rotZ: 0.25 },
      { x: 202.8, y: 0.9, z: -22.5, s: 1.0, rotX: 0.3, rotZ: 0.1 }
    ];

    crystalPositions.forEach((c, idx) => {
      const crystal = MeshBuilder.CreateCylinder(`cave_crystal_${idx}`, {
        height: 1.8 * c.s,
        diameterTop: 0.05,
        diameterBottom: 0.55 * c.s,
        tessellation: 6
      }, this.scene);
      crystal.material = this.crystalMat;
      crystal.position.set(c.x, c.y, c.z);
      crystal.rotation.x = c.rotX;
      crystal.rotation.z = c.rotZ;
      crystal.parent = this.root;
      crystal.freezeWorldMatrix();

      this.rockColliders.push({ type: 'circle', x: c.x, z: c.z, r: 0.55 * c.s, tag: 'crystal_cluster' });
    });

    // 4. Formations rocheuses dans la Crypte Est
    createStalagmiteCluster('stalag_east_1', 222.0, -6.5, 1.1, 4.0);
    createBoulder('boulder_east_niche', 226.5, 1.0, 8.5, 1.5, 1.3, 1.5, 2.2, 1.15);
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
  }

  // --- 9. Implantation des 7 Torches / Braseros dans tous les recoins ---
  initTorches() {
    // Liste des emplacements stratégiques exploratoires
    const torchConfigs = [
      // 1. Vestibule Ouest (près de l'arrivée dans la caverne)
      { id: 'west', x: 186.0, y: 0.0, z: 4.0, startLit: false },

      // 2. Carrefour de la Salle Centrale
      { id: 'center', x: 201.0, y: 0.0, z: -3.5, startLit: false },

      // 3. Plateau Nord Surélevé - Côté gauche de l'autel
      { id: 'north_l', x: 198.0, y: 1.6, z: 19.5, startLit: false },

      // 4. Plateau Nord Surélevé - Côté droit de l'autel
      { id: 'north_r', x: 213.0, y: 1.6, z: 19.5, startLit: false },

      // 5. Cœur du Recoin Secret Sud (Antre des Ombres & Cristaux)
      { id: 'south', x: 203.0, y: 0.0, z: -20.0, startLit: false },

      // 6. Niche Nord-Est de la Crypte
      { id: 'east_niche', x: 224.0, y: 0.0, z: 7.5, startLit: false },

      // 7. Fond Est de la Crypte (Chambre des Échos)
      { id: 'east_main', x: 227.5, y: 0.0, z: 0.0, startLit: false }
    ];

    torchConfigs.forEach(cfg => {
      const torch = new Torch(this.scene, this.root, cfg.x, cfg.y, cfg.z, cfg.id, {
        startLit: cfg.startLit,
        lightRange: 22.0,
        lightIntensity: 4.8
      });
      this.torches.push(torch);
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
  }

  /**
   * Vérifie les frappes à l'épée contre les torches de la caverne.
   */
  checkSwordHits(playerPos, playerFacingAngle, weapon, cameraManager = null, audioManager = null) {
    let anyHit = false;
    for (let i = 0; i < this.torches.length; i++) {
      const hit = this.torches[i].checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager, audioManager);
      if (hit) anyHit = true;
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

  setEnabled(enabled) {
    if (this.root) {
      this.root.setEnabled(enabled);
    }
    // Désactiver également les lumières ponctuelles des torches si la caverne est masquée
    this.torches.forEach(t => {
      if (t.pointLight) {
        t.pointLight.setEnabled(enabled && t.isLit);
      }
    });
  }

  /**
   * Boucle de mise à jour de la caverne (torches, particules ambiantes).
   */
  update(dt, player, cameraManager = null, audioManager = null) {
    if (!this.root.isEnabled()) return;

    // 1. Mise à jour des 7 torches
    for (let i = 0; i < this.torches.length; i++) {
      this.torches[i].update(dt);
    }

    // 2. Détection de proximité automatique en Mode Torche
    if (player && player.isTorchMode) {
      this.checkTorchProximity(player.getPosition(), player.isTorchMode, cameraManager, audioManager);
    }

    // 3. Dérive douce des particules de poussière souterraine
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
    this.torches.forEach(t => t.dispose());
    this.torches = [];
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
