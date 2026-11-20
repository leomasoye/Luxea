import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * EnvironmentManager.js — Décors, sol et falaises de la Plaine d'Éveil.
 * Conforme à AGENT.md & GDD.md :
 * - Terrain herbeux texturé avec sentiers de terre battue.
 * - Falaises et parois rocheuses fermant la zone de jeu.
 * - Arbres et rochers optimisés avec gel des matrices statiques (freezeWorldMatrix).
 */
export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.root = new TransformNode('EnvironmentRoot', this.scene);

    this.initTerrain();
    this.initPaths();
    this.initCliffsAndTrees();
  }

  initTerrain() {
    // Matériau Herbe verte rétro
    const grassMat = new StandardMaterial('mat_grass', this.scene);
    grassMat.diffuseColor = new Color3(0.24, 0.58, 0.28);
    grassMat.specularColor = new Color3(0.04, 0.08, 0.04);
    grassMat.freeze();

    // Sol principal de la plaine (52 x 52 unités)
    const ground = MeshBuilder.CreateGround('main_ground', {
      width: 54,
      height: 54,
      subdivisions: 12
    }, this.scene);
    ground.material = grassMat;
    ground.position.y = 0;
    ground.parent = this.root;
    ground.freezeWorldMatrix();
  }

  initPaths() {
    // Matériau Sentier de terre battue
    const pathMat = new StandardMaterial('mat_path', this.scene);
    pathMat.diffuseColor = new Color3(0.62, 0.48, 0.32);
    pathMat.specularColor = new Color3(0.02, 0.02, 0.02);
    pathMat.freeze();

    // 1. Sentier vertical reliant le Spawn au Sanctuaire Nord (Porte du Boss)
    const northPath = MeshBuilder.CreateGround('path_north', {
      width: 3.5,
      height: 28,
      subdivisions: 2
    }, this.scene);
    northPath.material = pathMat;
    northPath.position.set(0, 0.015, 6);
    northPath.parent = this.root;
    northPath.freezeWorldMatrix();

    // 2. Sentier Est vers la Caverne du Gardien
    const eastPath = MeshBuilder.CreateGround('path_east', {
      width: 24,
      height: 3.2,
      subdivisions: 2
    }, this.scene);
    eastPath.material = pathMat;
    eastPath.position.set(11, 0.015, 2);
    eastPath.parent = this.root;
    eastPath.freezeWorldMatrix();

    // 3. Sentier Ouest vers le Sanctuaire des Ruines
    const westPath = MeshBuilder.CreateGround('path_west', {
      width: 24,
      height: 3.2,
      subdivisions: 2
    }, this.scene);
    westPath.material = pathMat;
    westPath.position.set(-11, 0.015, 2);
    westPath.parent = this.root;
    westPath.freezeWorldMatrix();

    // 4. Carrefour central pavé de terre
    const centerCrossing = MeshBuilder.CreateGround('path_crossing', {
      width: 6,
      height: 6,
      subdivisions: 1
    }, this.scene);
    centerCrossing.material = pathMat;
    centerCrossing.position.set(0, 0.02, 2);
    centerCrossing.parent = this.root;
    centerCrossing.freezeWorldMatrix();
  }

  initCliffsAndTrees() {
    // Matériau Falaise rocheuse (Gris chaud low-poly)
    const rockMat = new StandardMaterial('mat_cliff', this.scene);
    rockMat.diffuseColor = new Color3(0.42, 0.44, 0.48);
    rockMat.specularColor = new Color3(0.08, 0.08, 0.08);
    rockMat.freeze();

    // Matériaux Arbres (Tronc bois & feuillage conique)
    const woodMat = new StandardMaterial('mat_tree_wood', this.scene);
    woodMat.diffuseColor = new Color3(0.38, 0.22, 0.12);
    woodMat.freeze();

    const foliageMat = new StandardMaterial('mat_tree_foliage', this.scene);
    foliageMat.diffuseColor = new Color3(0.14, 0.48, 0.22);
    foliageMat.freeze();

    // Création des parois rocheuses périmétriques (Est, Ouest, Sud, Nord avec brèches pour les passages)
    const createCliffBlock = (name, w, h, d, x, y, z) => {
      const block = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
      block.material = rockMat;
      block.position.set(x, y, z);
      block.parent = this.root;
      block.freezeWorldMatrix();
    };

    // Parois Sud (fermée derrière le spawn)
    createCliffBlock('cliff_s', 54, 4.5, 4, 0, 2.25, -24);

    // Parois Est (avec brèche vers la caverne à z = 2)
    createCliffBlock('cliff_e_north', 4, 4.5, 22, 25, 2.25, 14);
    createCliffBlock('cliff_e_south', 4, 4.5, 22, 25, 2.25, -12);

    // Parois Ouest (avec brèche vers la grille à z = 2)
    createCliffBlock('cliff_w_north', 4, 4.5, 22, -25, 2.25, 14);
    createCliffBlock('cliff_w_south', 4, 4.5, 22, -25, 2.25, -12);

    // Parois Nord (avec brèche pour la Porte du Boss à x = 0)
    createCliffBlock('cliff_n_east', 22, 5.5, 4, 15, 2.75, 24);
    createCliffBlock('cliff_n_west', 22, 5.5, 4, -15, 2.75, 24);

    // Fonction de création d'arbres low-poly décoratifs
    const createTree = (name, x, z, scale = 1) => {
      const treeNode = new TransformNode(name, this.scene);
      treeNode.position.set(x, 0, z);
      treeNode.scaling.setAll(scale);
      treeNode.parent = this.root;

      const trunk = MeshBuilder.CreateCylinder(`${name}_trunk`, {
        height: 1.4,
        diameter: 0.42
      }, this.scene);
      trunk.material = woodMat;
      trunk.position.y = 0.7;
      trunk.parent = treeNode;
      trunk.freezeWorldMatrix();

      const foliage = MeshBuilder.CreateCylinder(`${name}_foliage`, {
        height: 2.8,
        diameterTop: 0,
        diameterBottom: 2.2,
        tessellation: 6
      }, this.scene);
      foliage.material = foliageMat;
      foliage.position.y = 2.4;
      foliage.parent = treeNode;
      foliage.freezeWorldMatrix();
    };

    // Répartition d'arbres le long des falaises et en bosquets rétro
    const treePositions = [
      { x: -18, z: -16, s: 1.1 },
      { x: -14, z: -18, s: 0.9 },
      { x: 16, z: -16, s: 1.2 },
      { x: 19, z: -14, s: 0.9 },
      { x: -12, z: 12, s: 1.15 },
      { x: -15, z: 15, s: 0.85 },
      { x: 14, z: 12, s: 1.0 },
      { x: 17, z: 15, s: 1.2 },
      { x: -8, z: -10, s: 0.8 },
      { x: 9, z: -8, s: 0.85 }
    ];

    treePositions.forEach((pos, idx) => {
      createTree(`tree_${idx}`, pos.x, pos.z, pos.s);
    });
  }
}
