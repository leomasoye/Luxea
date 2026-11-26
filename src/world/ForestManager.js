import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  PointLight
} from '@babylonjs/core';
import { RetroTextures } from '../rendering/RetroTextures.js';
import { buildLegendarySwordMeshes } from '../entities/Weapon.js';
import { SaveManager } from '../core/SaveManager.js';

/**
 * ForestManager.js — La Forêt Sacrée / Bois Korogu (Zone 3, derrière la Grille Ouest).
 * - Grande forêt ouverte (80 x 80) entièrement clôturée par des arbres géants et rochers moussus (zéro vide noir).
 * - Arbre Sacré colossal au centre avec racines géantes, visage ancien gravé, lianes et canopée multi-strates.
 * - Socle de l'Épée Légendaire devant l'Arbre Sacré, baigné par un rayon de soleil et encadré de lanternes.
 * - Clairières secondaires (étang forestier au Nord-Ouest, cercle de menhirs moussus au Sud-Ouest).
 * - Particules d'ambiance : lucioles dorées, pétales/feuilles tombantes et poussières sacrées autour du socle.
 * - Performance 60 FPS : matériaux figés (freeze) et matrices gelées (freezeWorldMatrix).
 */
export class ForestManager {
  constructor(scene, saveData = null) {
    this.scene = scene;
    this.saveData = saveData || {};
    this.root = new TransformNode('ForestRoot', this.scene);

    // Espace de coordonnées de la forêt : X de -260 à -180 (centre -220), Z de -40 à 40 (centre 0)
    this.centerX = -220;
    this.centerZ = 0;

    // Position de l'Arbre Sacré et du Socle de l'Épée Légendaire
    this.treePos = new Vector3(-228.0, 0, 0);
    this.pedestalPos = new Vector3(-213.5, 0, 0);

    // Collections
    this.colliders = [];
    this.interactables = [];
    this.fireflies = [];
    this.fallingLeaves = [];
    this.pedestalMotes = [];
    this.pedestalLight = null;
    this.sunbeamMesh = null;
    this.sunbeamMat = null;
    this.animTime = 0;

    // État du rituel de l'Épée Légendaire Bleue : 'LOCKED' | 'REVEALING' | 'REVEALED' | 'PULLING' | 'OBTAINED'
    this.swordState = this.saveData.legendarySwordObtained
      ? 'OBTAINED'
      : (this.saveData.legendarySwordRevealed ? 'REVEALED' : 'LOCKED');
    this.ritualCharge = 0;          // 0 -> 1 en ~2.6s en levant l'épée dans le cercle de lumière
    this.ritualDuration = 2.6;
    this.revealTimer = 0;
    this.revealDuration = 1.85;
    this.revealSwordShown = false;

    // Séquence d'extraction (galère + retrait)
    this.pullTimer = 0;
    this.pullDuration = 3.7;
    this.pullBurstDone = false;
    this.pullStartPos = new Vector3();
    this.pullTargetPos = new Vector3();
    this.pullFacingAngle = 0;
    this.pullSparkTimer = 0;

    // Meshes dynamiques du rituel & de l'épée dans le socle
    this.pedestalSwordRoot = null;
    this.pedestalSwordBaseY = 2.59;
    this.lightCircleRing = null;
    this.lightCircleMat = null;
    this.haloSphere = null;
    this.haloSphereMat = null;
    this.haloRing1 = null;
    this.haloRing2 = null;
    this.haloRingMat = null;

    this.initMaterials();
    this.initTerrainAndPaths();
    this.initGreatTree();
    this.initSwordPedestal();
    this.initEastEntranceArch();
    this.initPerimeterForest();
    this.initInteriorGroves();
    this.initForestPond();
    this.initAncientStoneRing();
    this.initPathLanternsAndDetails();
    this.initAmbientParticles();
  }

  initMaterials() {
    // Sol principal de la forêt (mousse émeraude riche pixel-art)
    this.groundMat = new StandardMaterial('mat_forest_ground', this.scene);
    this.groundMat.diffuseColor = new Color3(0.20, 0.48, 0.24);
    this.groundMat.diffuseTexture = RetroTextures.get(this.scene, 'grass', 42, 42);
    this.groundMat.specularColor = new Color3(0.03, 0.05, 0.03);
    this.groundMat.freeze();

    // Herbe lumineuse de la clairière centrale
    this.clearingMat = new StandardMaterial('mat_forest_clearing', this.scene);
    this.clearingMat.diffuseColor = new Color3(0.28, 0.62, 0.29);
    this.clearingMat.diffuseTexture = RetroTextures.get(this.scene, 'grass', 14, 14);
    this.clearingMat.specularColor = new Color3(0.04, 0.07, 0.04);
    this.clearingMat.freeze();

    // Sentier de terre forestière douce
    this.pathMat = new StandardMaterial('mat_forest_path', this.scene);
    this.pathMat.diffuseColor = new Color3(0.56, 0.45, 0.31);
    this.pathMat.diffuseTexture = RetroTextures.get(this.scene, 'dirt', 10, 2);
    this.pathMat.specularColor = new Color3(0.02, 0.02, 0.02);
    this.pathMat.freeze();

    // Dalles de pierre ancienne moussue
    this.stoneMat = new StandardMaterial('mat_forest_stone', this.scene);
    this.stoneMat.diffuseColor = new Color3(0.52, 0.56, 0.52);
    this.stoneMat.diffuseTexture = RetroTextures.get(this.scene, 'stone', 2, 2);
    this.stoneMat.specularColor = new Color3(0.08, 0.09, 0.08);
    this.stoneMat.freeze();

    // Pierre sculptée claire pour le Socle de l'Épée Légendaire
    this.pedestalStoneMat = new StandardMaterial('mat_pedestal_stone', this.scene);
    this.pedestalStoneMat.diffuseColor = new Color3(0.74, 0.76, 0.72);
    this.pedestalStoneMat.diffuseTexture = RetroTextures.get(this.scene, 'stone', 2, 2);
    this.pedestalStoneMat.emissiveColor = new Color3(0.05, 0.06, 0.05);
    this.pedestalStoneMat.specularColor = new Color3(0.15, 0.16, 0.15);
    this.pedestalStoneMat.freeze();

    // Or sacré / runes du socle
    this.goldMat = new StandardMaterial('mat_forest_gold', this.scene);
    this.goldMat.diffuseColor = new Color3(0.95, 0.80, 0.28);
    this.goldMat.emissiveColor = new Color3(0.42, 0.30, 0.06);
    this.goldMat.specularColor = new Color3(0.9, 0.8, 0.4);
    this.goldMat.freeze();

    // Lueur cyan sacrée de l'encoche d'épée
    this.slotGlowMat = new StandardMaterial('mat_sword_slot_glow', this.scene);
    this.slotGlowMat.diffuseColor = new Color3(0.45, 0.95, 1.0);
    this.slotGlowMat.emissiveColor = new Color3(0.28, 0.85, 0.95);
    this.slotGlowMat.specularColor = new Color3(1, 1, 1);
    this.slotGlowMat.freeze();

    // Écorce ancienne de l'Arbre Sacré
    this.greatBarkMat = new StandardMaterial('mat_great_tree_bark', this.scene);
    this.greatBarkMat.diffuseColor = new Color3(0.42, 0.28, 0.17);
    this.greatBarkMat.diffuseTexture = RetroTextures.get(this.scene, 'bark', 6, 4);
    this.greatBarkMat.specularColor = new Color3(0.04, 0.03, 0.02);
    this.greatBarkMat.freeze();

    // Écorce sombre des arbres de la forêt
    this.barkMat = new StandardMaterial('mat_forest_bark', this.scene);
    this.barkMat.diffuseColor = new Color3(0.38, 0.24, 0.15);
    this.barkMat.diffuseTexture = RetroTextures.get(this.scene, 'bark', 2, 2);
    this.barkMat.specularColor = new Color3(0.03, 0.02, 0.01);
    this.barkMat.freeze();

    // Écorce claire (bouleau / bois ancien)
    this.paleBarkMat = new StandardMaterial('mat_forest_pale_bark', this.scene);
    this.paleBarkMat.diffuseColor = new Color3(0.60, 0.54, 0.46);
    this.paleBarkMat.diffuseTexture = RetroTextures.get(this.scene, 'bark', 2, 2);
    this.paleBarkMat.specularColor = new Color3(0.04, 0.04, 0.04);
    this.paleBarkMat.freeze();

    // Feuillages variés (palette Korogu pixel-art)
    this.foliageDeepMat = new StandardMaterial('mat_forest_foliage_deep', this.scene);
    this.foliageDeepMat.diffuseColor = new Color3(0.12, 0.42, 0.22);
    this.foliageDeepMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    this.foliageDeepMat.specularColor = new Color3(0.03, 0.05, 0.03);
    this.foliageDeepMat.freeze();

    this.foliageEmeraldMat = new StandardMaterial('mat_forest_foliage_emerald', this.scene);
    this.foliageEmeraldMat.diffuseColor = new Color3(0.19, 0.56, 0.28);
    this.foliageEmeraldMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    this.foliageEmeraldMat.specularColor = new Color3(0.04, 0.07, 0.04);
    this.foliageEmeraldMat.freeze();

    this.foliageSunlitMat = new StandardMaterial('mat_forest_foliage_sunlit', this.scene);
    this.foliageSunlitMat.diffuseColor = new Color3(0.38, 0.72, 0.30);
    this.foliageSunlitMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    this.foliageSunlitMat.emissiveColor = new Color3(0.04, 0.09, 0.02);
    this.foliageSunlitMat.specularColor = new Color3(0.06, 0.09, 0.04);
    this.foliageSunlitMat.freeze();

    this.foliageGoldMat = new StandardMaterial('mat_forest_foliage_gold', this.scene);
    this.foliageGoldMat.diffuseColor = new Color3(0.84, 0.68, 0.22);
    this.foliageGoldMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    this.foliageGoldMat.emissiveColor = new Color3(0.08, 0.06, 0.01);
    this.foliageGoldMat.specularColor = new Color3(0.08, 0.06, 0.02);
    this.foliageGoldMat.freeze();

    this.blossomMat = new StandardMaterial('mat_forest_blossom', this.scene);
    this.blossomMat.diffuseColor = new Color3(0.98, 0.76, 0.84);
    this.blossomMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    this.blossomMat.emissiveColor = new Color3(0.22, 0.10, 0.14);
    this.blossomMat.specularColor = new Color3(0.1, 0.08, 0.09);
    this.blossomMat.freeze();

    // Mousse lumineuse sur les racines et rochers
    this.mossMat = new StandardMaterial('mat_forest_moss', this.scene);
    this.mossMat.diffuseColor = new Color3(0.22, 0.62, 0.30);
    this.mossMat.emissiveColor = new Color3(0.04, 0.12, 0.05);
    this.mossMat.freeze();

    // Rochers moussus
    this.rockMat = new StandardMaterial('mat_forest_rock', this.scene);
    this.rockMat.diffuseColor = new Color3(0.34, 0.39, 0.37);
    this.rockMat.specularColor = new Color3(0.06, 0.07, 0.07);
    this.rockMat.freeze();

    // Champignons bioluminescents (cyan & ambre)
    this.mushCyanMat = new StandardMaterial('mat_forest_mush_cyan', this.scene);
    this.mushCyanMat.diffuseColor = new Color3(0.24, 0.88, 0.82);
    this.mushCyanMat.emissiveColor = new Color3(0.14, 0.58, 0.54);
    this.mushCyanMat.freeze();

    this.mushAmberMat = new StandardMaterial('mat_forest_mush_amber', this.scene);
    this.mushAmberMat.diffuseColor = new Color3(0.98, 0.72, 0.24);
    this.mushAmberMat.emissiveColor = new Color3(0.45, 0.28, 0.05);
    this.mushAmberMat.freeze();

    // Lueur chaude des lanternes forestières
    this.lanternGlowMat = new StandardMaterial('mat_forest_lantern_glow', this.scene);
    this.lanternGlowMat.diffuseColor = new Color3(1.0, 0.92, 0.55);
    this.lanternGlowMat.emissiveColor = new Color3(0.95, 0.76, 0.24);
    this.lanternGlowMat.freeze();

    // Fleurs sacrées (Princesse de la Sérénité — blanc / bleu pâle)
    this.sacredFlowerMat = new StandardMaterial('mat_sacred_flower', this.scene);
    this.sacredFlowerMat.diffuseColor = new Color3(0.82, 0.94, 1.0);
    this.sacredFlowerMat.emissiveColor = new Color3(0.30, 0.52, 0.68);
    this.sacredFlowerMat.freeze();

    // Eau cristalline de l'étang forestier (pixel-art)
    this.waterMat = new StandardMaterial('mat_forest_water', this.scene);
    this.waterMat.diffuseColor = new Color3(0.18, 0.70, 0.74);
    this.waterMat.diffuseTexture = RetroTextures.get(this.scene, 'water', 6, 6);
    this.waterMat.emissiveColor = new Color3(0.05, 0.24, 0.28);
    this.waterMat.specularColor = new Color3(0.6, 0.9, 0.95);
    this.waterMat.alpha = 0.86;
    this.waterMat.freeze();
  }

  // --- 1. Sol étendu, Clairière Centrale & Sentiers sinueux ---
  initTerrainAndPaths() {
    // Sol forestier massif (130 x 130) pour garantir l'absence totale de vide noir au loin
    const baseGround = MeshBuilder.CreateGround('forest_ground_base', {
      width: 130,
      height: 130,
      subdivisions: 12
    }, this.scene);
    baseGround.material = this.groundMat;
    baseGround.position.set(this.centerX, 0, this.centerZ);
    baseGround.parent = this.root;
    baseGround.freezeWorldMatrix();

    // Grande clairière centrale herbeuse lumineuse autour de l'Arbre Sacré et du Socle
    const clearing = MeshBuilder.CreateDisc('forest_clearing_disc', {
      radius: 19.5,
      tessellation: 24
    }, this.scene);
    clearing.material = this.clearingMat;
    clearing.rotation.x = Math.PI / 2;
    clearing.position.set(-220.5, 0.012, 0);
    clearing.parent = this.root;
    clearing.freezeWorldMatrix();

    // Sentier principal Est -> Clairière (X: -176 à -205, Z = 0)
    const entryPath = MeshBuilder.CreateGround('forest_entry_path', {
      width: 30,
      height: 4.0,
      subdivisions: 4
    }, this.scene);
    entryPath.material = this.pathMat;
    entryPath.position.set(-191.0, 0.018, 0);
    entryPath.parent = this.root;
    entryPath.freezeWorldMatrix();

    // Dalles de pierre moussue incrustées le long de l'allée d'entrée
    for (let i = 0; i < 11; i++) {
      const px = -182.0 - i * 2.45;
      const pz = Math.sin(i * 1.3) * 0.45;
      const slab = MeshBuilder.CreateCylinder(`forest_path_slab_${i}`, {
        height: 0.05,
        diameter: 1.3 + (i % 3) * 0.25,
        tessellation: 7
      }, this.scene);
      slab.material = this.stoneMat;
      slab.scaling.set(1.25, 1, 0.85);
      slab.rotation.y = i * 0.7;
      slab.position.set(px, 0.025, pz);
      slab.parent = this.root;
      slab.freezeWorldMatrix();
    }

    // Dalles formant deux petits sentiers secondaires vers l'étang (NO) et les menhirs (SO)
    const sideSteps = [
      // Vers l'étang Nord-Ouest
      { x: -214, z: 7.5 }, { x: -216.5, z: 10.5 }, { x: -219.5, z: 13.5 },
      { x: -223, z: 16.5 }, { x: -227, z: 18.8 }, { x: -231, z: 20.5 },
      // Vers le cercle de pierres Sud-Ouest
      { x: -214, z: -7.5 }, { x: -216.5, z: -10.5 }, { x: -219.5, z: -13.5 },
      { x: -223, z: -16.5 }, { x: -227, z: -18.8 }, { x: -231, z: -20.5 }
    ];
    sideSteps.forEach((s, idx) => {
      const step = MeshBuilder.CreateCylinder(`forest_side_slab_${idx}`, {
        height: 0.04,
        diameter: 1.25,
        tessellation: 6
      }, this.scene);
      step.material = this.stoneMat;
      step.rotation.y = idx * 0.9;
      step.position.set(s.x, 0.022, s.z);
      step.parent = this.root;
      step.freezeWorldMatrix();
    });
  }

  // --- 2. Le Grand Arbre Sacré au centre (Style Arbre Mojo / Forêt Korogu) ---
  initGreatTree() {
    const treeRoot = new TransformNode('GreatKorokTree', this.scene);
    treeRoot.position.copyFrom(this.treePos);
    treeRoot.parent = this.root;

    // 1. Tronc massif principal (légèrement évasé à la base)
    const trunkLower = MeshBuilder.CreateCylinder('great_tree_trunk_lower', {
      height: 8.5,
      diameterBottom: 9.8,
      diameterTop: 6.4,
      tessellation: 10
    }, this.scene);
    trunkLower.material = this.greatBarkMat;
    trunkLower.position.y = 4.25;
    trunkLower.parent = treeRoot;
    trunkLower.freezeWorldMatrix();

    const trunkUpper = MeshBuilder.CreateCylinder('great_tree_trunk_upper', {
      height: 8.0,
      diameterBottom: 6.6,
      diameterTop: 5.2,
      tessellation: 10
    }, this.scene);
    trunkUpper.material = this.greatBarkMat;
    trunkUpper.position.y = 12.0;
    trunkUpper.parent = treeRoot;
    trunkUpper.freezeWorldMatrix();

    // 2. 8 Racines géantes contreforts rayonnant dans la clairière
    const rootAngles = [0.35, 0.95, 1.55, 2.25, 2.95, 3.65, 4.45, 5.45];
    rootAngles.forEach((ang, idx) => {
      const rootLen = 6.2 + (idx % 3) * 1.1;
      const rootMesh = MeshBuilder.CreateCylinder(`great_tree_root_${idx}`, {
        height: rootLen,
        diameterBottom: 2.3,
        diameterTop: 0.75,
        tessellation: 7
      }, this.scene);
      rootMesh.material = this.greatBarkMat;

      const dist = 4.5 + rootLen * 0.25;
      rootMesh.position.set(Math.cos(ang) * dist, 1.05, Math.sin(ang) * dist);
      rootMesh.rotation.z = Math.PI / 2 - 0.32;
      rootMesh.rotation.y = -ang;
      rootMesh.parent = treeRoot;
      rootMesh.freezeWorldMatrix();

      // Touffe de mousse lumineuse sur la racine
      const moss = MeshBuilder.CreateSphere(`great_tree_root_moss_${idx}`, {
        diameter: 1.5,
        segments: 4
      }, this.scene);
      moss.material = this.mossMat;
      moss.scaling.set(1.3, 0.45, 0.9);
      moss.position.set(Math.cos(ang) * (dist + 0.8), 0.35, Math.sin(ang) * (dist + 0.8));
      moss.parent = treeRoot;
      moss.freezeWorldMatrix();
    });

    // 3. Visage ancien stylisé / cavité spirituelle sur la face Est du tronc (tourné vers le Socle)
    const browL = MeshBuilder.CreateBox('great_tree_brow_l', { width: 0.8, height: 0.55, depth: 1.8 }, this.scene);
    browL.material = this.mossMat;
    browL.position.set(3.55, 7.6, -1.25);
    browL.rotation.x = 0.22;
    browL.parent = treeRoot;
    browL.freezeWorldMatrix();

    const browR = MeshBuilder.CreateBox('great_tree_brow_r', { width: 0.8, height: 0.55, depth: 1.8 }, this.scene);
    browR.material = this.mossMat;
    browR.position.set(3.55, 7.6, 1.25);
    browR.rotation.x = -0.22;
    browR.parent = treeRoot;
    browR.freezeWorldMatrix();

    // Yeux doux lumineux ambrés
    const eyeL = MeshBuilder.CreateSphere('great_tree_eye_l', { diameter: 0.65, segments: 5 }, this.scene);
    eyeL.material = this.lanternGlowMat;
    eyeL.position.set(3.55, 6.75, -1.15);
    eyeL.parent = treeRoot;
    eyeL.freezeWorldMatrix();

    const eyeR = MeshBuilder.CreateSphere('great_tree_eye_r', { diameter: 0.65, segments: 5 }, this.scene);
    eyeR.material = this.lanternGlowMat;
    eyeR.position.set(3.55, 6.75, 1.15);
    eyeR.parent = treeRoot;
    eyeR.freezeWorldMatrix();

    // Arche racinaire creuse en bas du tronc (effet sanctuaire ancien)
    const hollowMat = new StandardMaterial('mat_tree_hollow', this.scene);
    hollowMat.diffuseColor = new Color3(0.08, 0.06, 0.05);
    hollowMat.emissiveColor = new Color3(0.04, 0.10, 0.07);
    hollowMat.freeze();

    const hollow = MeshBuilder.CreateCylinder('great_tree_hollow', {
      height: 3.4,
      diameter: 2.6,
      tessellation: 8
    }, this.scene);
    hollow.material = hollowMat;
    hollow.scaling.set(0.5, 1, 1);
    hollow.position.set(4.1, 1.7, 0);
    hollow.parent = treeRoot;
    hollow.freezeWorldMatrix();

    // 4. Branches maîtresses s'écartant vers la canopée
    const branchConfigs = [
      { ang: 0.0, y: 12.8, len: 7.5 },
      { ang: 1.1, y: 13.4, len: 7.2 },
      { ang: 2.2, y: 13.0, len: 7.8 },
      { ang: 3.3, y: 13.5, len: 7.0 },
      { ang: 4.4, y: 12.9, len: 7.5 },
      { ang: 5.4, y: 13.2, len: 7.2 }
    ];
    branchConfigs.forEach((b, idx) => {
      const br = MeshBuilder.CreateCylinder(`great_tree_branch_${idx}`, {
        height: b.len,
        diameterBottom: 1.8,
        diameterTop: 0.85,
        tessellation: 6
      }, this.scene);
      br.material = this.greatBarkMat;
      br.position.set(Math.cos(b.ang) * 4.2, b.y, Math.sin(b.ang) * 4.2);
      br.rotation.z = Math.PI / 2 - 0.55;
      br.rotation.y = -b.ang;
      br.parent = treeRoot;
      br.freezeWorldMatrix();
    });

    // 5. Canopée monumentale multi-strates (vert profond, émeraude, vert doré et touches de fleurs roses)
    const crownClusters = [
      // Couronne centrale sommitale
      { x: 0, y: 20.5, z: 0, sx: 11.5, sy: 5.6, sz: 11.5, mat: this.foliageSunlitMat },
      { x: 0, y: 16.5, z: 0, sx: 14.0, sy: 5.2, sz: 14.0, mat: this.foliageEmeraldMat },
      // Lobes périphériques massifs
      { x: 7.8, y: 15.2, z: 2.0, sx: 8.2, sy: 4.4, sz: 8.0, mat: this.foliageEmeraldMat },
      { x: 7.2, y: 15.8, z: -4.8, sx: 7.8, sy: 4.2, sz: 7.6, mat: this.foliageSunlitMat },
      { x: -7.5, y: 15.5, z: 3.5, sx: 8.8, sy: 4.6, sz: 8.5, mat: this.foliageDeepMat },
      { x: -7.0, y: 16.0, z: -4.5, sx: 8.2, sy: 4.4, sz: 8.2, mat: this.foliageEmeraldMat },
      { x: 1.5, y: 15.6, z: 8.2, sx: 8.4, sy: 4.4, sz: 8.2, mat: this.foliageEmeraldMat },
      { x: -1.5, y: 15.4, z: -8.2, sx: 8.6, sy: 4.5, sz: 8.0, mat: this.foliageDeepMat },
      // Touches de feuillage doré & fleurs de cerisier sacrées (clins d'œil Korogu)
      { x: 4.5, y: 19.2, z: 4.2, sx: 5.6, sy: 3.2, sz: 5.4, mat: this.blossomMat },
      { x: -4.2, y: 19.4, z: -3.8, sx: 5.8, sy: 3.4, sz: 5.6, mat: this.blossomMat },
      { x: 3.8, y: 19.8, z: -3.5, sx: 5.2, sy: 3.0, sz: 5.2, mat: this.foliageGoldMat },
      { x: -3.5, y: 19.5, z: 4.6, sx: 5.4, sy: 3.1, sz: 5.4, mat: this.foliageSunlitMat },
      { x: 0, y: 23.2, z: 0, sx: 6.5, sy: 3.4, sz: 6.5, mat: this.blossomMat }
    ];

    crownClusters.forEach((c, idx) => {
      const dome = MeshBuilder.CreateSphere(`great_tree_canopy_${idx}`, {
        diameter: 2.0,
        segments: 6
      }, this.scene);
      dome.material = c.mat;
      dome.scaling.set(c.sx, c.sy, c.sz);
      dome.position.set(c.x, c.y, c.z);
      dome.parent = treeRoot;
      dome.freezeWorldMatrix();
    });

    // 6. Lianes tombantes autour de la canopée
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + 0.15;
      const r = 8.5 + (i % 3) * 1.4;
      const len = 3.8 + (i % 4) * 1.3;
      const vine = MeshBuilder.CreateCylinder(`great_tree_vine_${i}`, {
        height: len,
        diameterTop: 0.16,
        diameterBottom: 0.06,
        tessellation: 5
      }, this.scene);
      vine.material = i % 3 === 0 ? this.mossMat : this.foliageEmeraldMat;
      vine.position.set(Math.cos(ang) * r, 14.0 - len / 2, Math.sin(ang) * r);
      vine.parent = treeRoot;
      vine.freezeWorldMatrix();
    }

    treeRoot.freezeWorldMatrix();

    // Collider solide du tronc de l'Arbre Sacré
    this.colliders.push({
      type: 'circle',
      x: this.treePos.x,
      z: this.treePos.z,
      r: 5.1,
      tag: 'great_korok_tree'
    });
  }

  // --- 3. Socle de l'Épée Légendaire (au cœur de la clairière, face à l'Arbre Sacré) ---
  initSwordPedestal() {
    const pedRoot = new TransformNode('LegendarySwordPedestal', this.scene);
    pedRoot.position.copyFrom(this.pedestalPos);
    pedRoot.parent = this.root;

    // 1. Esplanade circulaire pavée ancienne (rayon 5.8)
    const plaza = MeshBuilder.CreateCylinder('pedestal_plaza', {
      height: 0.08,
      diameter: 11.6,
      tessellation: 16
    }, this.scene);
    plaza.material = this.stoneMat;
    plaza.position.y = 0.04;
    plaza.parent = pedRoot;
    plaza.freezeWorldMatrix();

    // Anneau gravé doré au sol autour du socle
    const runeRing = MeshBuilder.CreateTorus('pedestal_rune_ring', {
      diameter: 7.4,
      thickness: 0.12,
      tessellation: 24
    }, this.scene);
    runeRing.material = this.goldMat;
    runeRing.position.y = 0.09;
    runeRing.parent = pedRoot;
    runeRing.freezeWorldMatrix();

    // 2. Estrade octogonale à 3 marches (Zelya peut monter dessus via getGroundHeight)
    const tiers = [
      { d: 6.2, h: 0.22, y: 0.11 },
      { d: 4.8, h: 0.22, y: 0.33 },
      { d: 3.5, h: 0.22, y: 0.55 }
    ];
    tiers.forEach((t, idx) => {
      const step = MeshBuilder.CreateCylinder(`pedestal_tier_${idx}`, {
        height: t.h,
        diameter: t.d,
        tessellation: 8
      }, this.scene);
      step.material = idx === 2 ? this.pedestalStoneMat : this.stoneMat;
      step.position.y = t.y;
      step.parent = pedRoot;
      step.freezeWorldMatrix();
    });

    // 3. Piédestal central sculpté (prêt à accueillir l'Épée Légendaire)
    const plinthBase = MeshBuilder.CreateBox('pedestal_plinth_base', {
      width: 1.55,
      height: 0.35,
      depth: 1.55
    }, this.scene);
    plinthBase.material = this.pedestalStoneMat;
    plinthBase.position.y = 0.835;
    plinthBase.parent = pedRoot;
    plinthBase.freezeWorldMatrix();

    const plinthBody = MeshBuilder.CreateCylinder('pedestal_plinth_body', {
      height: 0.72,
      diameterBottom: 1.45,
      diameterTop: 1.15,
      tessellation: 4
    }, this.scene);
    plinthBody.material = this.pedestalStoneMat;
    plinthBody.rotation.y = Math.PI / 4;
    plinthBody.position.y = 1.35;
    plinthBody.parent = pedRoot;
    plinthBody.freezeWorldMatrix();

    // Bordure supérieure dorée du socle
    const plinthCap = MeshBuilder.CreateBox('pedestal_plinth_cap', {
      width: 1.18,
      height: 0.12,
      depth: 1.18
    }, this.scene);
    plinthCap.material = this.goldMat;
    plinthCap.position.y = 1.74;
    plinthCap.parent = pedRoot;
    plinthCap.freezeWorldMatrix();

    // Encoche lumineuse d'épée sur le dessus du socle (fente sacrée prête pour la lame)
    const swordSlot = MeshBuilder.CreateBox('pedestal_sword_slot', {
      width: 0.14,
      height: 0.08,
      depth: 0.56
    }, this.scene);
    swordSlot.material = this.slotGlowMat;
    swordSlot.position.y = 1.81;
    swordSlot.parent = pedRoot;
    swordSlot.freezeWorldMatrix();

    // Emblème triangulaire doré gravé sur la face Est du socle (tourné vers l'entrée)
    const emblem = MeshBuilder.CreateCylinder('pedestal_emblem', {
      height: 0.08,
      diameter: 0.52,
      tessellation: 3
    }, this.scene);
    emblem.material = this.goldMat;
    emblem.rotation.z = Math.PI / 2;
    emblem.rotation.x = Math.PI / 6;
    emblem.position.set(0.56, 1.34, 0);
    emblem.parent = pedRoot;
    emblem.freezeWorldMatrix();

    // 4. Rayon de soleil divin (Sunbeam) traversant la canopée jusqu'au socle
    this.sunbeamMat = new StandardMaterial('mat_pedestal_sunbeam', this.scene);
    this.sunbeamMat.diffuseColor = new Color3(1.0, 0.96, 0.72);
    this.sunbeamMat.emissiveColor = new Color3(0.95, 0.88, 0.48);
    this.sunbeamMat.alpha = 0.14;
    this.sunbeamMat.backFaceCulling = false;

    this.sunbeamMesh = MeshBuilder.CreateCylinder('pedestal_sunbeam', {
      height: 18.0,
      diameterTop: 2.2,
      diameterBottom: 5.8,
      tessellation: 14,
      sideOrientation: 2
    }, this.scene);
    this.sunbeamMesh.material = this.sunbeamMat;
    this.sunbeamMesh.position.set(0.8, 9.2, 0);
    this.sunbeamMesh.rotation.z = -0.10;
    this.sunbeamMesh.parent = pedRoot;
    this.sunbeamMesh.isPickable = false;

    // 4b. Cercle de lumière sacré au sol (indique clairement la zone où lever l'épée)
    this.lightCircleMat = new StandardMaterial('mat_pedestal_light_circle', this.scene);
    this.lightCircleMat.diffuseColor = new Color3(1.0, 0.96, 0.68);
    this.lightCircleMat.emissiveColor = new Color3(0.85, 0.92, 1.0);
    this.lightCircleMat.alpha = 0.24;
    this.lightCircleMat.backFaceCulling = false;

    this.lightCircleRing = MeshBuilder.CreateDisc('pedestal_light_circle_disc', {
      radius: 3.65,
      tessellation: 28
    }, this.scene);
    this.lightCircleRing.material = this.lightCircleMat;
    this.lightCircleRing.rotation.x = Math.PI / 2;
    this.lightCircleRing.position.y = 0.105;
    this.lightCircleRing.parent = pedRoot;
    this.lightCircleRing.isPickable = false;

    // 4c. Halo lumineux éblouissant 3D (sphère d'énergie + anneaux ascendants lors du rituel)
    this.haloSphereMat = new StandardMaterial('mat_pedestal_halo_sphere', this.scene);
    this.haloSphereMat.diffuseColor = new Color3(0.85, 0.97, 1.0);
    this.haloSphereMat.emissiveColor = new Color3(0.75, 0.95, 1.0);
    this.haloSphereMat.alpha = 0.0;
    this.haloSphereMat.backFaceCulling = false;

    this.haloSphere = MeshBuilder.CreateSphere('pedestal_halo_sphere', {
      diameter: 2.0,
      segments: 12
    }, this.scene);
    this.haloSphere.material = this.haloSphereMat;
    this.haloSphere.position.set(0, 2.2, 0);
    this.haloSphere.parent = pedRoot;
    this.haloSphere.isPickable = false;
    this.haloSphere.setEnabled(false);

    this.haloRingMat = new StandardMaterial('mat_pedestal_halo_ring', this.scene);
    this.haloRingMat.diffuseColor = new Color3(0.65, 0.95, 1.0);
    this.haloRingMat.emissiveColor = new Color3(0.45, 0.90, 1.0);
    this.haloRingMat.alpha = 0.0;

    this.haloRing1 = MeshBuilder.CreateTorus('pedestal_halo_ring_1', {
      diameter: 5.2,
      thickness: 0.14,
      tessellation: 24
    }, this.scene);
    this.haloRing1.material = this.haloRingMat;
    this.haloRing1.position.set(0, 0.4, 0);
    this.haloRing1.parent = pedRoot;
    this.haloRing1.isPickable = false;
    this.haloRing1.setEnabled(false);

    this.haloRing2 = MeshBuilder.CreateTorus('pedestal_halo_ring_2', {
      diameter: 3.4,
      thickness: 0.11,
      tessellation: 24
    }, this.scene);
    this.haloRing2.material = this.haloRingMat;
    this.haloRing2.position.set(0, 1.2, 0);
    this.haloRing2.parent = pedRoot;
    this.haloRing2.isPickable = false;
    this.haloRing2.setEnabled(false);

    // 4d. Épée Légendaire Bleue plantée dans le socle (lame vers le bas, révélée après le halo)
    this.pedestalSwordRoot = new TransformNode('PedestalLegendarySword', this.scene);
    this.pedestalSwordRoot.position.set(0, this.pedestalSwordBaseY, 0);
    this.pedestalSwordRoot.parent = pedRoot;

    const pedSword = buildLegendarySwordMeshes(this.scene, this.pedestalSwordRoot, 'pedestal_leg_sword');
    // Lame plantée verticalement dans l'encoche du socle, garde tournée vers l'entrée Est
    pedSword.root.rotation.z = Math.PI;
    pedSword.root.rotation.y = Math.PI / 2;
    this.pedestalSwordRoot.setEnabled(this.swordState === 'REVEALED');

    // Enregistrement de l'interaction [E] pour retirer l'épée légendaire du socle
    this.interactables.push({
      id: 'forest_legendary_sword',
      position: new Vector3(this.pedestalPos.x, 2.2, this.pedestalPos.z),
      radius: 2.85,
      isAvailable: () => this.swordState === 'REVEALED',
      promptText: "[E] Retirer l'épée légendaire",
      onInteract: (player, cameraManager, uiManager) => {
        this.startPullSequence(player, cameraManager, uiManager);
      }
    });

    // 5. Lumière sacrée ponctuelle au-dessus du socle
    this.pedestalLight = new PointLight(
      'ForestPedestalLight',
      new Vector3(this.pedestalPos.x, 4.2, this.pedestalPos.z),
      this.scene
    );
    if (this.swordState === 'REVEALED' || this.swordState === 'OBTAINED') {
      this.pedestalLight.diffuse = new Color3(0.45, 0.88, 1.0);
      this.pedestalLight.specular = new Color3(0.6, 0.92, 1.0);
    } else {
      this.pedestalLight.diffuse = new Color3(1.0, 0.92, 0.62);
      this.pedestalLight.specular = new Color3(0.8, 0.75, 0.45);
    }
    this.pedestalLight.intensity = 2.2;
    this.pedestalLight.range = 19.0;

    // 6. 4 Colonnes-lanternes moussues encadrant l'esplanade
    const pillarOffsets = [
      { x: 4.6, z: 4.6 },
      { x: 4.6, z: -4.6 },
      { x: -4.6, z: 4.6 },
      { x: -4.6, z: -4.6 }
    ];
    pillarOffsets.forEach((p, idx) => {
      const col = MeshBuilder.CreateBox(`pedestal_pillar_${idx}`, {
        width: 0.75,
        height: 2.1,
        depth: 0.75
      }, this.scene);
      col.material = this.stoneMat;
      col.position.set(p.x, 1.05, p.z);
      col.parent = pedRoot;
      col.freezeWorldMatrix();

      const cap = MeshBuilder.CreateBox(`pedestal_pillar_cap_${idx}`, {
        width: 0.95,
        height: 0.22,
        depth: 0.95
      }, this.scene);
      cap.material = this.mossMat;
      cap.position.set(p.x, 2.2, p.z);
      cap.parent = pedRoot;
      cap.freezeWorldMatrix();

      const orb = MeshBuilder.CreateSphere(`pedestal_pillar_orb_${idx}`, {
        diameter: 0.42,
        segments: 5
      }, this.scene);
      orb.material = this.lanternGlowMat;
      orb.position.set(p.x, 2.52, p.z);
      orb.parent = pedRoot;
      orb.freezeWorldMatrix();

      this.colliders.push({
        type: 'circle',
        x: this.pedestalPos.x + p.x,
        z: this.pedestalPos.z + p.z,
        r: 0.52,
        tag: 'pedestal_pillar'
      });
    });

    // 7. Couronne de fleurs sacrées (Silent Princess) autour des marches du socle
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + 0.25;
      const dist = 3.55 + (i % 2) * 0.45;
      this.createSacredFlower(
        `pedestal_flower_${i}`,
        this.pedestalPos.x + Math.cos(ang) * dist,
        0.08,
        this.pedestalPos.z + Math.sin(ang) * dist
      );
    }

    // Collider du piédestal central uniquement (on peut monter sur les 3 marches)
    this.colliders.push({
      type: 'circle',
      x: this.pedestalPos.x,
      z: this.pedestalPos.z,
      r: 0.95,
      tag: 'sword_pedestal'
    });
  }

  // --- 4. Arche de pierre moussue à l'Est (Retour vers la Plaine d'Éveil) ---
  initEastEntranceArch() {
    // Colonnes antiques moussues à X = -180, Z = ±2.1
    const colN = MeshBuilder.CreateCylinder('forest_exit_col_n', {
      height: 5.0,
      diameter: 1.5,
      tessellation: 8
    }, this.scene);
    colN.material = this.stoneMat;
    colN.position.set(-180.0, 2.5, 2.1);
    colN.parent = this.root;
    colN.freezeWorldMatrix();

    const colS = MeshBuilder.CreateCylinder('forest_exit_col_s', {
      height: 5.0,
      diameter: 1.5,
      tessellation: 8
    }, this.scene);
    colS.material = this.stoneMat;
    colS.position.set(-180.0, 2.5, -2.1);
    colS.parent = this.root;
    colS.freezeWorldMatrix();

    const lintel = MeshBuilder.CreateBox('forest_exit_lintel', {
      width: 2.2,
      height: 1.4,
      depth: 5.8
    }, this.scene);
    lintel.material = this.stoneMat;
    lintel.position.set(-180.0, 4.9, 0);
    lintel.parent = this.root;
    lintel.freezeWorldMatrix();

    // Touffe de mousse sur le linteau
    const mossCap = MeshBuilder.CreateBox('forest_exit_moss', {
      width: 2.3,
      height: 0.45,
      depth: 5.9
    }, this.scene);
    mossCap.material = this.mossMat;
    mossCap.position.set(-180.0, 5.7, 0);
    mossCap.parent = this.root;
    mossCap.freezeWorldMatrix();

    // Tunnel végétal + brume lumineuse derrière l'arche (X = -179 à -175) pour éviter tout vide
    const mistPortalMat = new StandardMaterial('mat_forest_exit_glow', this.scene);
    mistPortalMat.diffuseColor = new Color3(0.55, 0.85, 0.65);
    mistPortalMat.emissiveColor = new Color3(0.32, 0.56, 0.42);
    mistPortalMat.freeze();

    const exitBack = MeshBuilder.CreatePlane('forest_exit_glow', { width: 4.0, height: 4.8 }, this.scene);
    exitBack.material = mistPortalMat;
    exitBack.rotation.y = -Math.PI / 2;
    exitBack.position.set(-175.8, 2.4, 0);
    exitBack.parent = this.root;
    exitBack.freezeWorldMatrix();

    const tunWallN = MeshBuilder.CreateBox('forest_exit_tun_n', { width: 5.0, height: 5.5, depth: 1.4 }, this.scene);
    tunWallN.material = this.foliageDeepMat;
    tunWallN.position.set(-177.8, 2.75, 2.7);
    tunWallN.parent = this.root;
    tunWallN.freezeWorldMatrix();

    const tunWallS = MeshBuilder.CreateBox('forest_exit_tun_s', { width: 5.0, height: 5.5, depth: 1.4 }, this.scene);
    tunWallS.material = this.foliageDeepMat;
    tunWallS.position.set(-177.8, 2.75, -2.7);
    tunWallS.parent = this.root;
    tunWallS.freezeWorldMatrix();

    const tunCeil = MeshBuilder.CreateBox('forest_exit_tun_ceil', { width: 5.0, height: 1.4, depth: 6.0 }, this.scene);
    tunCeil.material = this.foliageDeepMat;
    tunCeil.position.set(-177.8, 5.3, 0);
    tunCeil.parent = this.root;
    tunCeil.freezeWorldMatrix();
  }

  // --- 5. Enceinte naturelle de la forêt (Double rangée d'arbres géants & rochers moussus) ---
  initPerimeterForest() {
    // Crée une bordure organique dense tout autour de X: [-259, -181], Z: [-39, 39]
    // en laissant uniquement le passage Est ouvert (X = -180, Z = [-3.5, 3.5])
    let idx = 0;

    // Bordure Nord (Z = 39) & Sud (Z = -39)
    for (let x = -258; x <= -182; x += 5.4) {
      this.createForestTree(`perim_n_${idx}`, x, 38.5 + (idx % 2) * 1.4, 1.55 + (idx % 3) * 0.25, idx % 3, false);
      this.createForestTree(`perim_n2_${idx}`, x + 2.5, 44.0, 2.1, (idx + 1) % 3, false);

      this.createForestTree(`perim_s_${idx}`, x, -38.5 - (idx % 2) * 1.4, 1.55 + ((idx + 1) % 3) * 0.25, (idx + 2) % 3, false);
      this.createForestTree(`perim_s2_${idx}`, x + 2.5, -44.0, 2.1, idx % 3, false);
      idx++;
    }

    // Bordure Ouest (X = -259) & Est (X = -181, sauf brèche centrale Z = [-3.8, 3.8])
    for (let z = -34; z <= 34; z += 5.4) {
      this.createForestTree(`perim_w_${idx}`, -258.5 - (idx % 2) * 1.4, z, 1.6 + (idx % 3) * 0.25, (idx + 1) % 3, false);
      this.createForestTree(`perim_w2_${idx}`, -264.0, z + 2.5, 2.2, idx % 3, false);

      if (Math.abs(z) > 4.2) {
        this.createForestTree(`perim_e_${idx}`, -180.5 + (idx % 2) * 1.2, z, 1.55 + (idx % 3) * 0.22, (idx + 2) % 3, false);
        this.createForestTree(`perim_e2_${idx}`, -175.0, z + 2.2, 2.0, idx % 3, false);
      }
      idx++;
    }

    // Haies / buissons denses et rochers moussus au pied des arbres périmétriques pour fermer l'horizon bas
    const createHedgeWall = (name, x, z, w, d) => {
      const hedge = MeshBuilder.CreateBox(name, { width: w, height: 3.4, depth: d }, this.scene);
      hedge.material = this.foliageDeepMat;
      hedge.position.set(x, 1.5, z);
      hedge.parent = this.root;
      hedge.freezeWorldMatrix();
    };
    createHedgeWall('forest_hedge_n', -220, 41.5, 84, 4.0);
    createHedgeWall('forest_hedge_s', -220, -41.5, 84, 4.0);
    createHedgeWall('forest_hedge_w', -261.5, 0, 4.0, 84);
    createHedgeWall('forest_hedge_e_n', -178.5, 22.0, 4.0, 38.0);
    createHedgeWall('forest_hedge_e_s', -178.5, -22.0, 4.0, 38.0);
  }

  // --- 6. Bosquets intérieurs d'arbres variés (Korogu, sapins, arbres dorés, chênes moussus) ---
  initInteriorGroves() {
    const trees = [
      // Encadrement de l'allée d'entrée Est
      { x: -187, z: 7.5, s: 1.25, v: 0 },
      { x: -188, z: -7.5, s: 1.20, v: 1 },
      { x: -195, z: 9.0, s: 1.35, v: 2 },
      { x: -196, z: -8.8, s: 1.30, v: 0 },
      { x: -201, z: 14.5, s: 1.40, v: 1 },
      { x: -201, z: -14.5, s: 1.35, v: 3 },

      // Quadrant Nord-Est
      { x: -191, z: 19.5, s: 1.45, v: 0 },
      { x: -199, z: 26.5, s: 1.50, v: 1 },
      { x: -188, z: 29.0, s: 1.35, v: 2 },
      { x: -209, z: 24.0, s: 1.30, v: 3 },
      { x: -216, z: 30.5, s: 1.55, v: 0 },

      // Quadrant Sud-Est
      { x: -191, z: -19.5, s: 1.40, v: 1 },
      { x: -199, z: -26.5, s: 1.55, v: 0 },
      { x: -188, z: -29.0, s: 1.30, v: 3 },
      { x: -209, z: -24.0, s: 1.35, v: 2 },
      { x: -216, z: -30.5, s: 1.50, v: 1 },

      // Couronne autour de la grande clairière (respecte la vue dégagée sur l'Arbre Sacré)
      { x: -224, z: 24.5, s: 1.35, v: 2 },
      { x: -224, z: -24.5, s: 1.40, v: 3 },
      { x: -242, z: 10.0, s: 1.45, v: 0 },
      { x: -242, z: -10.0, s: 1.45, v: 1 },
      { x: -249, z: 0.0, s: 1.65, v: 3 },

      // Quadrant Nord-Ouest (autour de l'étang)
      { x: -248, z: 19.5, s: 1.40, v: 1 },
      { x: -246, z: 31.0, s: 1.55, v: 0 },
      { x: -232, z: 33.5, s: 1.45, v: 2 },

      // Quadrant Sud-Ouest (autour des menhirs)
      { x: -248, z: -19.5, s: 1.45, v: 0 },
      { x: -246, z: -31.0, s: 1.50, v: 2 },
      { x: -232, z: -33.5, s: 1.40, v: 1 }
    ];

    trees.forEach((t, idx) => {
      this.createForestTree(`forest_tree_${idx}`, t.x, t.z, t.s, t.v, true);
    });
  }

  /**
   * Crée un arbre forestier stylisé low-poly.
   * variant: 0 = Chêne émeraude large, 1 = Pin forestier à étages, 2 = Arbre lumineux doré/printemps, 3 = Bouleau fleuri
   */
  createForestTree(name, x, z, scale = 1.0, variant = 0, addCollider = true) {
    const node = new TransformNode(name, this.scene);
    node.position.set(x, 0, z);
    node.scaling.setAll(scale);
    node.parent = this.root;

    const trunkMat = variant === 3 ? this.paleBarkMat : this.barkMat;

    if (variant === 1) {
      // Pin forestier à 3 strates coniques
      const trunk = MeshBuilder.CreateCylinder(`${name}_tr`, {
        height: 2.2,
        diameterBottom: 0.72,
        diameterTop: 0.45,
        tessellation: 6
      }, this.scene);
      trunk.material = trunkMat;
      trunk.position.y = 1.1;
      trunk.parent = node;
      trunk.freezeWorldMatrix();

      const tiers = [
        { y: 3.1, h: 2.6, d: 3.2 },
        { y: 4.8, h: 2.4, d: 2.5 },
        { y: 6.3, h: 2.0, d: 1.7 }
      ];
      tiers.forEach((ti, i) => {
        const cone = MeshBuilder.CreateCylinder(`${name}_c${i}`, {
          height: ti.h,
          diameterTop: 0.05,
          diameterBottom: ti.d,
          tessellation: 7
        }, this.scene);
        cone.material = i === 2 ? this.foliageEmeraldMat : this.foliageDeepMat;
        cone.position.y = ti.y;
        cone.parent = node;
        cone.freezeWorldMatrix();
      });
    } else {
      // Chêne large / Arbre doré / Bouleau fleuri à houppier multi-sphères
      const trunk = MeshBuilder.CreateCylinder(`${name}_tr`, {
        height: 3.4,
        diameterBottom: 0.95,
        diameterTop: 0.55,
        tessellation: 7
      }, this.scene);
      trunk.material = trunkMat;
      trunk.position.y = 1.7;
      trunk.parent = node;
      trunk.freezeWorldMatrix();

      const mainMat =
        variant === 2 ? this.foliageGoldMat :
        variant === 3 ? this.blossomMat :
        this.foliageEmeraldMat;
      const accentMat =
        variant === 2 ? this.foliageSunlitMat :
        variant === 3 ? this.foliageSunlitMat :
        this.foliageSunlitMat;

      const crownMain = MeshBuilder.CreateSphere(`${name}_cm`, { diameter: 3.6, segments: 5 }, this.scene);
      crownMain.material = mainMat;
      crownMain.scaling.set(1.1, 0.85, 1.1);
      crownMain.position.set(0, 4.4, 0);
      crownMain.parent = node;
      crownMain.freezeWorldMatrix();

      const crownSide1 = MeshBuilder.CreateSphere(`${name}_cs1`, { diameter: 2.5, segments: 5 }, this.scene);
      crownSide1.material = accentMat;
      crownSide1.position.set(1.1, 3.8, 0.7);
      crownSide1.parent = node;
      crownSide1.freezeWorldMatrix();

      const crownSide2 = MeshBuilder.CreateSphere(`${name}_cs2`, { diameter: 2.4, segments: 5 }, this.scene);
      crownSide2.material = mainMat;
      crownSide2.position.set(-1.0, 4.0, -0.8);
      crownSide2.parent = node;
      crownSide2.freezeWorldMatrix();
    }

    node.freezeWorldMatrix();

    if (addCollider) {
      this.colliders.push({
        type: 'circle',
        x,
        z,
        r: 0.65 * scale,
        tag: 'forest_tree'
      });
    }
  }

  // --- 7. Étang Forestier paisible dans la clairière Nord-Ouest ---
  initForestPond() {
    const px = -237.5;
    const pz = 22.5;

    // Bassin d'eau turquoise
    const water = MeshBuilder.CreateDisc('forest_pond_water', {
      radius: 5.6,
      tessellation: 20
    }, this.scene);
    water.material = this.waterMat;
    water.rotation.x = Math.PI / 2;
    water.scaling.set(1.15, 0.88, 1);
    water.position.set(px, 0.03, pz);
    water.parent = this.root;
    water.freezeWorldMatrix();

    // Nénuphars flottants
    const pads = [
      { ox: -1.8, oz: 1.2, r: 0.65 },
      { ox: 1.4, oz: -1.5, r: 0.75 },
      { ox: 2.2, oz: 0.9, r: 0.55 },
      { ox: -0.5, oz: -2.0, r: 0.60 }
    ];
    pads.forEach((p, idx) => {
      const pad = MeshBuilder.CreateDisc(`pond_lily_${idx}`, { radius: p.r, tessellation: 8 }, this.scene);
      pad.material = this.mossMat;
      pad.rotation.x = Math.PI / 2;
      pad.position.set(px + p.ox, 0.055, pz + p.oz);
      pad.parent = this.root;
      pad.freezeWorldMatrix();

      if (idx % 2 === 0) {
        const lotus = MeshBuilder.CreateSphere(`pond_lotus_${idx}`, { diameter: 0.34, segments: 4 }, this.scene);
        lotus.material = this.blossomMat;
        lotus.position.set(px + p.ox, 0.16, pz + p.oz);
        lotus.parent = this.root;
        lotus.freezeWorldMatrix();
      }
    });

    // Rochers moussus bordant l'étang
    const bankRocks = [
      { ox: -5.8, oz: 1.8, sx: 1.4, sy: 1.0, sz: 1.2 },
      { ox: -3.5, oz: 4.8, sx: 1.2, sy: 0.9, sz: 1.3 },
      { ox: 4.5, oz: 3.6, sx: 1.3, sy: 1.1, sz: 1.2 },
      { ox: 5.5, oz: -2.2, sx: 1.1, sy: 0.8, sz: 1.1 },
      { ox: -2.2, oz: -4.8, sx: 1.4, sy: 0.9, sz: 1.2 }
    ];
    bankRocks.forEach((r, idx) => {
      const rock = MeshBuilder.CreateSphere(`pond_rock_${idx}`, { diameter: 1.8, segments: 4 }, this.scene);
      rock.material = this.rockMat;
      rock.scaling.set(r.sx, r.sy, r.sz);
      rock.position.set(px + r.ox, r.sy * 0.42, pz + r.oz);
      rock.parent = this.root;
      rock.freezeWorldMatrix();
    });

    // Collider circulaire de l'étang pour ne pas marcher dans l'eau profonde
    this.colliders.push({
      type: 'circle',
      x: px,
      z: pz,
      r: 5.2,
      tag: 'forest_pond'
    });
  }

  // --- 8. Cercle de Menhirs Moussus dans la clairière Sud-Ouest ---
  initAncientStoneRing() {
    const cx = -237.5;
    const cz = -22.5;

    // Sol moussu circulaire
    const ringFloor = MeshBuilder.CreateDisc('stone_ring_floor', { radius: 5.2, tessellation: 14 }, this.scene);
    ringFloor.material = this.clearingMat;
    ringFloor.rotation.x = Math.PI / 2;
    ringFloor.position.set(cx, 0.015, cz);
    ringFloor.parent = this.root;
    ringFloor.freezeWorldMatrix();

    // 6 menhirs inclinés entourant un petit bosquet de fleurs sacrées
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      const rx = cx + Math.cos(ang) * 4.5;
      const rz = cz + Math.sin(ang) * 4.5;
      const h = 2.4 + (i % 3) * 0.65;

      const menhir = MeshBuilder.CreateBox(`forest_menhir_${i}`, {
        width: 1.0,
        height: h,
        depth: 0.75
      }, this.scene);
      menhir.material = this.stoneMat;
      menhir.position.set(rx, h / 2 - 0.1, rz);
      menhir.rotation.y = -ang;
      menhir.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
      menhir.parent = this.root;
      menhir.freezeWorldMatrix();

      this.colliders.push({
        type: 'circle',
        x: rx,
        z: rz,
        r: 0.68,
        tag: 'forest_menhir'
      });
    }

    // Fleurs sacrées et champignons lumineux au centre du cercle
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      this.createSacredFlower(`ring_flower_${i}`, cx + Math.cos(ang) * 1.4, 0.02, cz + Math.sin(ang) * 1.4);
    }
    this.createMushroomCluster('ring_mush_center', cx, cz, true);
  }

  // --- 9. Lanternes de sentier, souches, rondins moussus, champignons & fleurs ---
  initPathLanternsAndDetails() {
    // 1. Lanternes en bois bordant le sentier principal Est -> Clairière
    const lanternPositions = [
      { x: -185.0, z: 2.6 },
      { x: -185.0, z: -2.6 },
      { x: -194.5, z: 2.8 },
      { x: -194.5, z: -2.8 },
      { x: -204.0, z: 3.4 },
      { x: -204.0, z: -3.4 }
    ];
    lanternPositions.forEach((lp, idx) => {
      const post = MeshBuilder.CreateCylinder(`forest_lantern_post_${idx}`, {
        height: 2.3,
        diameter: 0.22,
        tessellation: 6
      }, this.scene);
      post.material = this.barkMat;
      post.position.set(lp.x, 1.15, lp.z);
      post.parent = this.root;
      post.freezeWorldMatrix();

      const arm = MeshBuilder.CreateBox(`forest_lantern_arm_${idx}`, {
        width: 0.2,
        height: 0.16,
        depth: 0.75
      }, this.scene);
      arm.material = this.barkMat;
      arm.position.set(lp.x, 2.2, lp.z - Math.sign(lp.z) * 0.25);
      arm.parent = this.root;
      arm.freezeWorldMatrix();

      const lamp = MeshBuilder.CreateBox(`forest_lantern_lamp_${idx}`, {
        width: 0.34,
        height: 0.44,
        depth: 0.34
      }, this.scene);
      lamp.material = this.lanternGlowMat;
      lamp.position.set(lp.x, 1.92, lp.z - Math.sign(lp.z) * 0.50);
      lamp.parent = this.root;
      lamp.freezeWorldMatrix();

      this.colliders.push({
        type: 'circle',
        x: lp.x,
        z: lp.z,
        r: 0.32,
        tag: 'forest_lantern'
      });
    });

    // 2. Rondins moussus & souches d'arbres
    const logs = [
      { x: -206.0, z: 11.5, rotY: 0.55 },
      { x: -208.0, z: -12.0, rotY: -0.45 },
      { x: -236.0, z: 5.5, rotY: 1.2 }
    ];
    logs.forEach((l, idx) => {
      const log = MeshBuilder.CreateCylinder(`forest_log_${idx}`, {
        height: 3.8,
        diameter: 0.95,
        tessellation: 7
      }, this.scene);
      log.material = this.barkMat;
      log.rotation.z = Math.PI / 2;
      log.rotation.y = l.rotY;
      log.position.set(l.x, 0.38, l.z);
      log.parent = this.root;
      log.freezeWorldMatrix();

      this.colliders.push({ type: 'circle', x: l.x, z: l.z, r: 1.15, tag: 'forest_log' });
    });

    const stumps = [
      { x: -199.0, z: 6.0 },
      { x: -200.5, z: -6.5 },
      { x: -222.0, z: 14.5 },
      { x: -222.5, z: -15.0 }
    ];
    stumps.forEach((st, idx) => {
      const stump = MeshBuilder.CreateCylinder(`forest_stump_${idx}`, {
        height: 0.75,
        diameterBottom: 1.3,
        diameterTop: 1.05,
        tessellation: 8
      }, this.scene);
      stump.material = this.barkMat;
      stump.position.set(st.x, 0.375, st.z);
      stump.parent = this.root;
      stump.freezeWorldMatrix();

      this.colliders.push({ type: 'circle', x: st.x, z: st.z, r: 0.72, tag: 'forest_stump' });
    });

    // 3. Grappes de champignons bioluminescents (cyan & ambre)
    const mushrooms = [
      { x: -189.0, z: 5.8, cyan: true },
      { x: -191.5, z: -5.4, cyan: false },
      { x: -219.0, z: 8.5, cyan: true },
      { x: -220.5, z: -8.2, cyan: false },
      { x: -234.5, z: 4.0, cyan: true },
      { x: -234.5, z: -4.2, cyan: true },
      { x: -229.0, z: 17.5, cyan: false },
      { x: -229.5, z: -17.5, cyan: true }
    ];
    mushrooms.forEach((m, idx) => {
      this.createMushroomCluster(`forest_mush_${idx}`, m.x, m.z, m.cyan);
    });

    // 4. Touffes de fougères & fleurs sacrées réparties dans la clairière
    const flowerSpots = [
      { x: -206.5, z: 5.2 }, { x: -207.2, z: -5.5 },
      { x: -217.5, z: 10.5 }, { x: -218.0, z: -10.2 },
      { x: -226.5, z: 10.8 }, { x: -226.5, z: -10.8 },
      { x: -196.5, z: 4.5 }, { x: -197.0, z: -4.8 }
    ];
    flowerSpots.forEach((f, idx) => {
      this.createSacredFlower(`forest_wild_flower_${idx}`, f.x, 0.02, f.z);
    });
  }

  createMushroomCluster(name, x, z, isCyan = true) {
    const capMat = isCyan ? this.mushCyanMat : this.mushAmberMat;
    const offsets = [
      { ox: 0, oz: 0, s: 1.0 },
      { ox: 0.42, oz: 0.25, s: 0.72 },
      { ox: -0.35, oz: 0.30, s: 0.62 }
    ];
    offsets.forEach((o, i) => {
      const stem = MeshBuilder.CreateCylinder(`${name}_st_${i}`, {
        height: 0.45 * o.s,
        diameter: 0.16 * o.s,
        tessellation: 6
      }, this.scene);
      stem.material = this.paleBarkMat;
      stem.position.set(x + o.ox, 0.22 * o.s, z + o.oz);
      stem.parent = this.root;
      stem.freezeWorldMatrix();

      const cap = MeshBuilder.CreateSphere(`${name}_cp_${i}`, {
        diameter: 0.56 * o.s,
        segments: 5
      }, this.scene);
      cap.material = capMat;
      cap.scaling.set(1.1, 0.55, 1.1);
      cap.position.set(x + o.ox, 0.45 * o.s, z + o.oz);
      cap.parent = this.root;
      cap.freezeWorldMatrix();
    });
  }

  createSacredFlower(name, x, y, z) {
    const stem = MeshBuilder.CreateCylinder(`${name}_stem`, {
      height: 0.38,
      diameter: 0.05,
      tessellation: 4
    }, this.scene);
    stem.material = this.mossMat;
    stem.position.set(x, y + 0.19, z);
    stem.parent = this.root;
    stem.freezeWorldMatrix();

    const bloom = MeshBuilder.CreateSphere(`${name}_bloom`, {
      diameter: 0.28,
      segments: 4
    }, this.scene);
    bloom.material = this.sacredFlowerMat;
    bloom.scaling.set(1.1, 0.65, 1.1);
    bloom.position.set(x, y + 0.40, z);
    bloom.parent = this.root;
    bloom.freezeWorldMatrix();
  }

  // --- 10. Particules magiques : lucioles, feuilles tombantes & poussières sacrées ---
  initAmbientParticles() {
    // 1. Lucioles dorées flottant dans toute la forêt
    const fireflyMat = new StandardMaterial('mat_forest_firefly', this.scene);
    fireflyMat.diffuseColor = new Color3(1.0, 0.96, 0.62);
    fireflyMat.emissiveColor = new Color3(0.95, 0.86, 0.28);
    fireflyMat.freeze();

    for (let i = 0; i < 42; i++) {
      const p = MeshBuilder.CreateBox(`forest_firefly_${i}`, { width: 0.14, height: 0.14, depth: 0.14 }, this.scene);
      p.material = fireflyMat;
      const fx = -252 + Math.random() * 68;
      const fy = 0.7 + Math.random() * 4.5;
      const fz = -32 + Math.random() * 64;
      p.position.set(fx, fy, fz);
      p.parent = this.root;

      this.fireflies.push({
        mesh: p,
        baseY: fy,
        speedX: (Math.random() - 0.5) * 0.45,
        speedZ: (Math.random() - 0.5) * 0.45,
        bobSpeed: 1.0 + Math.random() * 1.4,
        bobAmp: 0.22 + Math.random() * 0.25,
        seed: Math.random() * Math.PI * 2
      });
    }

    // 2. Feuilles et pétales tombant doucement de la canopée de l'Arbre Sacré
    for (let i = 0; i < 24; i++) {
      const leaf = MeshBuilder.CreateBox(`forest_leaf_${i}`, { width: 0.20, height: 0.04, depth: 0.14 }, this.scene);
      leaf.material = i % 3 === 0 ? this.blossomMat : this.foliageSunlitMat;
      const ang = Math.random() * Math.PI * 2;
      const r = 3.5 + Math.random() * 13.5;
      const lx = this.treePos.x + Math.cos(ang) * r;
      const ly = 2.0 + Math.random() * 14.0;
      const lz = this.treePos.z + Math.sin(ang) * r;
      leaf.position.set(lx, ly, lz);
      leaf.parent = this.root;

      this.fallingLeaves.push({
        mesh: leaf,
        originX: lx,
        originZ: lz,
        fallSpeed: 0.55 + Math.random() * 0.55,
        swaySpeed: 1.2 + Math.random() * 1.2,
        swayAmp: 0.6 + Math.random() * 0.8,
        seed: Math.random() * Math.PI * 2
      });
    }

    // 3. Poussières de lumière sacrée s'élevant autour du Socle de l'Épée Légendaire
    for (let i = 0; i < 16; i++) {
      const mote = MeshBuilder.CreateBox(`pedestal_mote_${i}`, { width: 0.11, height: 0.11, depth: 0.11 }, this.scene);
      mote.material = i % 2 === 0 ? this.slotGlowMat : fireflyMat;
      const ang = (i / 16) * Math.PI * 2;
      const r = 0.8 + Math.random() * 2.4;
      const my = 0.6 + Math.random() * 5.0;
      mote.position.set(
        this.pedestalPos.x + Math.cos(ang) * r,
        my,
        this.pedestalPos.z + Math.sin(ang) * r
      );
      mote.parent = this.root;

      this.pedestalMotes.push({
        mesh: mote,
        angle: ang,
        radius: r,
        y: my,
        riseSpeed: 0.45 + Math.random() * 0.40,
        orbitSpeed: 0.35 + Math.random() * 0.35
      });
    }
  }

  /**
   * Fournisseur de hauteur verticale : permet de monter doucement les 3 marches du Socle de l'Épée.
   */
  getGroundHeight(x, z) {
    const dx = x - this.pedestalPos.x;
    const dz = z - this.pedestalPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= 1.75) return 0.66;
    if (dist <= 2.40) return 0.44;
    if (dist <= 3.10) return 0.22;
    return 0.0;
  }

  /**
   * Enregistre les collisions de la forêt sous la zone 'forest'.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Limites périphériques étanches (avec ouverture Est à X = -180, Z = [-2.6, 2.6])
    collisionManager.addBox(-263, -177, 36.5, 43.0, 'forest_bound_n', 'forest');
    collisionManager.addBox(-263, -177, -43.0, -36.5, 'forest_bound_s', 'forest');
    collisionManager.addBox(-263, -256.5, -43.0, 43.0, 'forest_bound_w', 'forest');
    collisionManager.addBox(-181.5, -175.0, 2.6, 43.0, 'forest_bound_e_n', 'forest');
    collisionManager.addBox(-181.5, -175.0, -43.0, -2.6, 'forest_bound_e_s', 'forest');

    // 2. Obstacles intérieurs (Arbre Sacré, Socle, arbres, étang, menhirs, lanternes, souches)
    this.colliders.forEach(c => {
      if (c.type === 'circle') {
        collisionManager.addCircle(c.x, c.z, c.r, c.tag || 'forest_obs', 'forest');
      } else if (c.type === 'box') {
        collisionManager.addBox(c.minX, c.maxX, c.minZ, c.maxZ, c.tag || 'forest_obs', 'forest');
      }
    });
  }

  getBounds() {
    return {
      player: {
        minX: -256.0,
        maxX: -179.5,
        minZ: -36.0,
        maxZ: 36.0
      },
      camera: {
        minX: -257.0,
        maxX: -180.5,
        minZ: -37.0,
        maxZ: 37.0
      }
    };
  }

  /**
   * Retourne l'élément interactif le plus proche de Zelya dans la forêt (socle de l'épée).
   */
  getNearestInteractable(playerPos, playerFacingAngle = null) {
    if (!playerPos || this.swordState !== 'REVEALED') return null;

    let nearest = null;
    let minDist = Infinity;

    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      if (typeof item.isAvailable === 'function' && !item.isAvailable()) continue;

      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= item.radius && dist < minDist) {
        if (playerFacingAngle !== null && playerFacingAngle !== undefined && dist > 0.1) {
          const dot = Math.sin(playerFacingAngle) * (dx / dist) + Math.cos(playerFacingAngle) * (dz / dist);
          if (dot < -0.35) continue;
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

  /**
   * Indique si une cinématique / séquence d'épée (halo ou extraction) verrouille les actions normales.
   */
  isSwordSequenceActive() {
    return this.swordState === 'PULLING';
  }

  /**
   * Lance la séquence d'extraction de l'Épée Légendaire Bleue du socle (galère + retrait).
   */
  startPullSequence(player, cameraManager = null, uiManager = null) {
    if (this.swordState !== 'REVEALED' || !player) return;

    this.swordState = 'PULLING';
    this.pullTimer = 0;
    this.pullBurstDone = false;
    this.pullSparkTimer = 0;

    // Calcule une position idéale juste devant le socle du côté où Zelya arrive
    const pPos = player.getPosition();
    let dx = pPos.x - this.pedestalPos.x;
    let dz = pPos.z - this.pedestalPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      dx = 1;
      dz = 0;
    } else {
      dx /= dist;
      dz /= dist;
    }

    this.pullStartPos.copyFrom(pPos);
    const gripDist = 1.18;
    this.pullTargetPos.set(
      this.pedestalPos.x + dx * gripDist,
      0.66,
      this.pedestalPos.z + dz * gripDist
    );
    // Zelya fait face au centre du socle
    this.pullFacingAngle = Math.atan2(-dx, -dz);

    // Oriente la garde de l'épée face à Zelya pour une prise naturelle à deux mains
    if (this.pedestalSwordRoot) {
      this.pedestalSwordRoot.rotation.y = this.pullFacingAngle + Math.PI / 2;
    }

    player.beginSwordPull();
    if (uiManager) {
      uiManager.hideInteractionPrompt();
    }
    if (cameraManager) {
      cameraManager.shake(0.08, 0.25);
    }
  }

  /**
   * Projette des étincelles bleues magiques autour du socle (révélation ou effort d'extraction).
   */
  spawnBlueSparks(count = 14, originY = 1.95, spread = 1.2) {
    const sparkMat = new StandardMaterial('mat_leg_spark', this.scene);
    sparkMat.diffuseColor = new Color3(0.55, 0.94, 1.0);
    sparkMat.emissiveColor = new Color3(0.32, 0.85, 1.0);
    sparkMat.specularColor = new Color3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const spark = MeshBuilder.CreateBox('leg_spark', {
        width: 0.12,
        height: 0.12,
        depth: 0.12
      }, this.scene);
      spark.material = sparkMat;

      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const r = 0.25 + Math.random() * 0.55;
      spark.position.set(
        this.pedestalPos.x + Math.cos(ang) * r,
        originY + (Math.random() - 0.5) * 0.4,
        this.pedestalPos.z + Math.sin(ang) * r
      );

      const vx = Math.cos(ang) * (1.2 + Math.random() * spread * 2.2);
      const vy = 1.8 + Math.random() * 3.0;
      const vz = Math.sin(ang) * (1.2 + Math.random() * spread * 2.2);
      let life = 0.65 + Math.random() * 0.35;
      const maxLife = life;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        spark.position.x += vx * dt;
        spark.position.y += vy * dt;
        spark.position.z += vz * dt;
        spark.rotation.x += 5 * dt;
        spark.rotation.y += 6 * dt;

        const s = Math.max(0.01, (life / maxLife) * 1.3);
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
   * Réinitialise le rituel de l'épée légendaire (lors d'un reset de sauvegarde).
   */
  resetSwordEvent() {
    this.swordState = 'LOCKED';
    this.ritualCharge = 0;
    this.revealTimer = 0;
    this.revealSwordShown = false;
    this.pullTimer = 0;
    this.pullBurstDone = false;

    if (this.pedestalSwordRoot) {
      this.pedestalSwordRoot.position.set(0, this.pedestalSwordBaseY, 0);
      this.pedestalSwordRoot.rotation.set(0, 0, 0);
      this.pedestalSwordRoot.setEnabled(false);
    }
    if (this.haloSphere) this.haloSphere.setEnabled(false);
    if (this.haloRing1) this.haloRing1.setEnabled(false);
    if (this.haloRing2) this.haloRing2.setEnabled(false);
    if (this.pedestalLight) {
      this.pedestalLight.diffuse = new Color3(1.0, 0.92, 0.62);
      this.pedestalLight.specular = new Color3(0.8, 0.75, 0.45);
      this.pedestalLight.intensity = 2.2;
    }
  }

  setEnabled(enabled) {
    if (this.root) {
      this.root.setEnabled(enabled);
    }
    if (this.pedestalLight) {
      this.pedestalLight.setEnabled(enabled);
    }
  }

  update(dt, player = null, cameraManager = null, uiManager = null) {
    if (!this.root.isEnabled()) return;

    this.animTime += dt;

    // 1. Lucioles dorées
    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i];
      f.mesh.position.x += f.speedX * dt;
      f.mesh.position.z += f.speedZ * dt;
      f.mesh.position.y = f.baseY + Math.sin(this.animTime * f.bobSpeed + f.seed) * f.bobAmp;

      if (f.mesh.position.x > -184) f.mesh.position.x = -252;
      if (f.mesh.position.x < -252) f.mesh.position.x = -184;
      if (f.mesh.position.z > 32) f.mesh.position.z = -32;
      if (f.mesh.position.z < -32) f.mesh.position.z = 32;

      const s = 0.75 + 0.35 * Math.sin(this.animTime * 3.2 + f.seed);
      f.mesh.scaling.set(s, s, s);
    }

    // 2. Feuilles et pétales tombant de l'Arbre Sacré
    for (let i = 0; i < this.fallingLeaves.length; i++) {
      const l = this.fallingLeaves[i];
      l.mesh.position.y -= l.fallSpeed * dt;
      l.mesh.position.x = l.originX + Math.sin(this.animTime * l.swaySpeed + l.seed) * l.swayAmp;
      l.mesh.position.z = l.originZ + Math.cos(this.animTime * l.swaySpeed * 0.8 + l.seed) * l.swayAmp;
      l.mesh.rotation.y += dt * 1.4;
      l.mesh.rotation.x += dt * 0.9;

      if (l.mesh.position.y < 0.15) {
        l.mesh.position.y = 14.5 + Math.random() * 2.0;
      }
    }

    // 3. Poussières sacrées autour du Socle de l'Épée Légendaire (accélèrent pendant le rituel)
    const moteBoost = 1.0 + this.ritualCharge * 3.8 + (this.swordState === 'PULLING' ? 2.5 : 0);
    for (let i = 0; i < this.pedestalMotes.length; i++) {
      const m = this.pedestalMotes[i];
      m.angle += m.orbitSpeed * moteBoost * dt;
      m.y += m.riseSpeed * moteBoost * dt;
      if (m.y > 6.5) m.y = 0.5;

      const rScale = this.swordState === 'LOCKED' ? (1.0 - this.ritualCharge * 0.35) : 1.0;
      m.mesh.position.x = this.pedestalPos.x + Math.cos(m.angle) * m.radius * rScale;
      m.mesh.position.y = m.y;
      m.mesh.position.z = this.pedestalPos.z + Math.sin(m.angle) * m.radius * rScale;
      m.mesh.rotation.y += dt * 2.0 * moteBoost;
    }

    // 4. Machine à états du Rituel de la Lumière & de l'Épée Légendaire Bleue
    this.updateSwordRitual(dt, player, cameraManager, uiManager);
  }

  updateSwordRitual(dt, player, cameraManager, uiManager) {
    // --- ÉTAT 1 : LOCKED (Attente que Zelya lève son épée dans le cercle de lumière) ---
    if (this.swordState === 'LOCKED') {
      let inLightCircle = false;
      let raisingSword = false;

      if (player) {
        const pPos = player.getPosition();
        const dist = Math.hypot(pPos.x - this.pedestalPos.x, pPos.z - this.pedestalPos.z);
        inLightCircle = dist <= 3.85;
        raisingSword = inLightCircle && player.isTorchMode && !player.isDodgeRolling && !player.isKnockedBack;
      }

      if (raisingSword) {
        this.ritualCharge = Math.min(1.0, this.ritualCharge + dt / this.ritualDuration);

        // Légère vibration croissante de la caméra et du sol
        if (cameraManager && this.ritualCharge > 0.25) {
          cameraManager.shake(0.03 + this.ritualCharge * 0.11, 0.12);
        }

        // Déclenchement du halo éblouissant dès que la charge atteint 100%
        if (this.ritualCharge >= 1.0) {
          this.swordState = 'REVEALING';
          this.revealTimer = 0;
          this.revealSwordShown = false;
          if (cameraManager) {
            cameraManager.shake(0.20, 0.55);
          }
          return;
        }
      } else {
        // Décroissance douce si le joueur baisse l'épée ou sort du cercle
        this.ritualCharge = Math.max(0, this.ritualCharge - dt * 0.65);
      }

      // Feedback visuel du cercle de lumière et du rayon solaire
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * (inLightCircle ? 4.5 : 2.2));
      if (this.lightCircleMat) {
        this.lightCircleMat.alpha = 0.16 + pulse * 0.08 + (inLightCircle ? 0.14 : 0) + this.ritualCharge * 0.52;
      }
      if (this.sunbeamMat) {
        this.sunbeamMat.alpha = 0.14 + this.ritualCharge * 0.48;
      }
      if (this.sunbeamMesh) {
        const beamScale = 1.0 + this.ritualCharge * 0.55;
        this.sunbeamMesh.scaling.set(beamScale, 1.0, beamScale);
      }

      // Anneaux et sphère d'énergie montant autour du socle pendant la charge
      if (this.ritualCharge > 0.02) {
        if (this.haloRing1) {
          this.haloRing1.setEnabled(true);
          this.haloRing1.position.y = 0.35 + ((this.animTime * 1.8) % 3.4);
          const s1 = 1.15 - this.ritualCharge * 0.35;
          this.haloRing1.scaling.set(s1, s1, s1);
          this.haloRing1.rotation.y += dt * (2.5 + this.ritualCharge * 5.0);
        }
        if (this.haloRing2) {
          this.haloRing2.setEnabled(true);
          this.haloRing2.position.y = 0.35 + (((this.animTime * 1.8) + 1.7) % 3.4);
          const s2 = 0.85 + this.ritualCharge * 0.55;
          this.haloRing2.scaling.set(s2, s2, s2);
          this.haloRing2.rotation.y -= dt * (3.2 + this.ritualCharge * 6.0);
        }
        if (this.haloRingMat) {
          this.haloRingMat.alpha = Math.min(0.9, this.ritualCharge * 0.95);
        }
        if (this.haloSphere && this.haloSphereMat) {
          this.haloSphere.setEnabled(true);
          const s = 0.4 + this.ritualCharge * 2.4;
          this.haloSphere.scaling.set(s, s, s);
          this.haloSphereMat.alpha = this.ritualCharge * 0.55;
        }
      } else {
        if (this.haloRing1) this.haloRing1.setEnabled(false);
        if (this.haloRing2) this.haloRing2.setEnabled(false);
        if (this.haloSphere) this.haloSphere.setEnabled(false);
      }

      if (this.pedestalLight) {
        this.pedestalLight.intensity = 2.1 + Math.sin(this.animTime * 2.0) * 0.25 + this.ritualCharge * 13.0;
        const c = this.ritualCharge;
        this.pedestalLight.diffuse.set(1.0 - c * 0.25, 0.92 + c * 0.06, 0.62 + c * 0.38);
      }
      if (uiManager) {
        uiManager.setLightHaloIntensity(this.ritualCharge * 0.22);
      }
    }

    // --- ÉTAT 2 : REVEALING (Halo lumineux éblouissant -> Révélation de l'Épée Bleue) ---
    else if (this.swordState === 'REVEALING') {
      this.revealTimer += dt;
      const t = Math.min(1.0, this.revealTimer / this.revealDuration);

      // Courbe du flash éblouissant : montée fulgurante (0 -> 0.28), pic blanc pur (0.28 -> 0.45), dissipation (0.45 -> 1.0)
      let flashAlpha = 0;
      if (t < 0.28) {
        flashAlpha = t / 0.28;
      } else if (t < 0.45) {
        flashAlpha = 1.0;
      } else {
        flashAlpha = Math.max(0, 1.0 - (t - 0.45) / 0.55);
      }

      if (uiManager) {
        uiManager.setLightHaloIntensity(flashAlpha);
      }

      // Expansion spectaculaire du halo 3D autour du socle
      if (this.haloSphere && this.haloSphereMat) {
        this.haloSphere.setEnabled(true);
        const s = 2.6 + t * 14.0;
        this.haloSphere.scaling.set(s, s, s);
        this.haloSphereMat.alpha = flashAlpha * 0.92;
      }
      if (this.haloRing1 && this.haloRing2 && this.haloRingMat) {
        const ringExpand = 1.0 + t * 3.5;
        this.haloRing1.scaling.set(ringExpand, ringExpand, ringExpand);
        this.haloRing2.scaling.set(ringExpand * 1.25, ringExpand * 1.25, ringExpand * 1.25);
        this.haloRingMat.alpha = flashAlpha * 0.85;
      }
      if (this.pedestalLight) {
        this.pedestalLight.intensity = 2.6 + flashAlpha * 24.0;
        this.pedestalLight.diffuse.set(0.65 + flashAlpha * 0.35, 0.92 + flashAlpha * 0.08, 1.0);
      }

      // Au pic de l'éblouissement, l'Épée Légendaire Bleue apparaît dans le socle !
      if (!this.revealSwordShown && t >= 0.36) {
        this.revealSwordShown = true;
        if (this.pedestalSwordRoot) {
          this.pedestalSwordRoot.position.set(0, this.pedestalSwordBaseY, 0);
          this.pedestalSwordRoot.setEnabled(true);
        }
        this.saveData.legendarySwordRevealed = true;
        SaveManager.save(this.saveData);
        this.spawnBlueSparks(22, 2.2, 1.5);
      }

      if (t >= 1.0) {
        this.swordState = 'REVEALED';
        this.ritualCharge = 0;
        if (this.haloSphere) this.haloSphere.setEnabled(false);
        if (this.haloRing1) this.haloRing1.setEnabled(false);
        if (this.haloRing2) this.haloRing2.setEnabled(false);
        if (this.sunbeamMesh) this.sunbeamMesh.scaling.set(1, 1, 1);
        if (this.sunbeamMat) {
          this.sunbeamMat.alpha = 0.16;
          this.sunbeamMat.diffuseColor = new Color3(0.65, 0.92, 1.0);
          this.sunbeamMat.emissiveColor = new Color3(0.35, 0.78, 1.0);
        }
        if (uiManager) uiManager.setLightHaloIntensity(0);
      }
    }

    // --- ÉTAT 3 : REVEALED (Épée Bleue rayonnante dans le socle, prête à être retirée avec [E]) ---
    else if (this.swordState === 'REVEALED') {
      if (this.pedestalLight) {
        this.pedestalLight.diffuse.set(0.45, 0.88, 1.0);
        this.pedestalLight.intensity = 2.8 + Math.sin(this.animTime * 2.8) * 0.45;
      }
      if (this.lightCircleMat) {
        this.lightCircleMat.alpha = 0.20 + Math.sin(this.animTime * 2.4) * 0.06;
        this.lightCircleMat.emissiveColor.set(0.30, 0.78, 1.0);
      }
    }

    // --- ÉTAT 4 : PULLING (Animation spécifique & quelques secondes de galère pour retirer l'épée) ---
    else if (this.swordState === 'PULLING') {
      this.pullTimer += dt;
      const t = Math.min(1.0, this.pullTimer / this.pullDuration);

      // Phase A : Mise en place et prise en main (0.0 -> 0.45s)
      if (this.pullTimer < 0.45) {
        const p = this.pullTimer / 0.45;
        const ease = 1.0 - Math.pow(1.0 - p, 2.0);
        if (player) {
          const curX = this.pullStartPos.x + (this.pullTargetPos.x - this.pullStartPos.x) * ease;
          const curY = this.pullStartPos.y + (this.pullTargetPos.y - this.pullStartPos.y) * ease;
          const curZ = this.pullStartPos.z + (this.pullTargetPos.z - this.pullStartPos.z) * ease;
          player.setPosition(curX, curY, curZ);
          player.facingAngle = this.pullFacingAngle;
          player.targetFacingAngle = this.pullFacingAngle;
          player.updateSwordPullPose('GRIP', ease, 0);
        }
      }
      // Phase B : Quelques secondes de galère / 3 grandes secousses d'extraction (0.45s -> 2.75s)
      else if (this.pullTimer < 2.75) {
        const struggleDuration = 2.30;
        const sp = (this.pullTimer - 0.45) / struggleDuration; // 0 -> 1

        // 3 impulsions d'effort soutenu avec tremblement musculaire
        const heaveWave = Math.pow(Math.abs(Math.sin(sp * Math.PI * 3.0)), 0.75);
        const strain = 0.45 + 0.55 * heaveWave;

        // L'épée sort progressivement par à-coups du socle (de 0 à +0.78m)
        const riseProgress = Math.min(1.0, sp * 0.85 + Math.sin(sp * Math.PI * 3.0) * 0.05);
        if (this.pedestalSwordRoot) {
          const jitterX = (Math.random() - 0.5) * 0.045 * strain;
          const jitterZ = (Math.random() - 0.5) * 0.045 * strain;
          this.pedestalSwordRoot.position.set(
            jitterX,
            this.pedestalSwordBaseY + riseProgress * 0.78,
            jitterZ
          );
        }

        if (player) {
          player.setPosition(this.pullTargetPos.x, this.pullTargetPos.y, this.pullTargetPos.z);
          player.facingAngle = this.pullFacingAngle;
          player.updateSwordPullPose('STRUGGLE', sp, strain);
        }

        // Secousse de caméra rythmée sur l'effort
        if (cameraManager && heaveWave > 0.65) {
          cameraManager.shake(0.06 + sp * 0.08, 0.10);
        }

        // Étincelles bleues jaillissant de l'encoche pendant l'effort
        this.pullSparkTimer -= dt;
        if (this.pullSparkTimer <= 0) {
          this.pullSparkTimer = 0.22;
          this.spawnBlueSparks(5, 1.9, 0.9);
        }

        // Montée de la lueur du socle
        if (this.pedestalLight) {
          this.pedestalLight.intensity = 3.2 + sp * 9.5 + heaveWave * 3.0;
          this.pedestalLight.diffuse.set(0.45 + sp * 0.35, 0.88 + sp * 0.10, 1.0);
        }
        if (uiManager) {
          uiManager.setLightHaloIntensity(sp * 0.25 * heaveWave);
        }
      }
      // Phase C : Extraction finale & Triomphe (2.75s -> 3.70s)
      else {
        const tp = Math.min(1.0, (this.pullTimer - 2.75) / 0.95);

        if (!this.pullBurstDone) {
          this.pullBurstDone = true;
          // L'épée quitte le socle et remplace instantanément l'ancienne épée de Zelya !
          if (this.pedestalSwordRoot) {
            this.pedestalSwordRoot.setEnabled(false);
          }
          if (player) {
            player.equipLegendarySword(false);
          }
          this.saveData.legendarySwordRevealed = true;
          this.saveData.legendarySwordObtained = true;
          SaveManager.save(this.saveData);

          this.spawnBlueSparks(28, 2.5, 1.8);
          if (cameraManager) {
            cameraManager.shake(0.22, 0.35);
          }
        }

        if (player) {
          player.updateSwordPullPose('TRIUMPH', tp, 0);
        }
        if (uiManager) {
          const flash = Math.max(0, 1.0 - tp * 2.2) * 0.75;
          uiManager.setLightHaloIntensity(flash);
        }
        if (this.pedestalLight) {
          this.pedestalLight.intensity = 2.0 + Math.max(0, 1.0 - tp) * 14.0;
        }
      }

      if (t >= 1.0) {
        this.swordState = 'OBTAINED';
        if (player) {
          player.endSwordPull();
        }
        if (uiManager) {
          uiManager.setLightHaloIntensity(0);
        }
      }
    }

    // --- ÉTAT 5 : OBTAINED (Socle apaisé d'une douce lueur bleue) ---
    else if (this.swordState === 'OBTAINED') {
      if (this.pedestalLight) {
        this.pedestalLight.diffuse.set(0.45, 0.85, 1.0);
        this.pedestalLight.intensity = 1.9 + Math.sin(this.animTime * 1.8) * 0.2;
      }
      if (this.lightCircleMat) {
        this.lightCircleMat.alpha = 0.10 + Math.sin(this.animTime * 1.6) * 0.03;
      }
    }
  }

  dispose() {
    if (this.pedestalLight) {
      this.pedestalLight.dispose();
      this.pedestalLight = null;
    }
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
