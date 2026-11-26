import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { RetroTextures } from '../rendering/RetroTextures.js';

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
    this.rockColliders = [];

    this.initTerrain();
    this.initPaths();
    this.initCliffsAndTrees();
    this.initRocks();
  }

  initTerrain() {
    // Matériau Herbe verte rétro pixel-art
    const grassMat = new StandardMaterial('mat_grass', this.scene);
    grassMat.diffuseColor = new Color3(0.28, 0.65, 0.32);
    grassMat.diffuseTexture = RetroTextures.get(this.scene, 'grass', 26, 26);
    grassMat.specularColor = new Color3(0.03, 0.06, 0.03);
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
    // Matériau Sentier de terre battue pixel-art
    const pathMat = new StandardMaterial('mat_path', this.scene);
    pathMat.diffuseColor = new Color3(0.68, 0.54, 0.36);
    pathMat.diffuseTexture = RetroTextures.get(this.scene, 'dirt', 8, 8);
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
    // Matériau Falaise rocheuse (Gris chaud low-poly pixel-art)
    const rockMat = new StandardMaterial('mat_cliff', this.scene);
    rockMat.diffuseColor = new Color3(0.48, 0.50, 0.54);
    rockMat.diffuseTexture = RetroTextures.get(this.scene, 'cliff', 6, 3);
    rockMat.specularColor = new Color3(0.06, 0.06, 0.06);
    rockMat.freeze();

    // Matériaux Arbres (Tronc bois & feuillage conique pixel-art)
    const woodMat = new StandardMaterial('mat_tree_wood', this.scene);
    woodMat.diffuseColor = new Color3(0.44, 0.27, 0.16);
    woodMat.diffuseTexture = RetroTextures.get(this.scene, 'bark', 2, 2);
    woodMat.freeze();

    const foliageMat = new StandardMaterial('mat_tree_foliage', this.scene);
    foliageMat.diffuseColor = new Color3(0.18, 0.56, 0.26);
    foliageMat.diffuseTexture = RetroTextures.get(this.scene, 'foliage', 3, 3);
    foliageMat.freeze();

    // Création des parois rocheuses périmétriques massives (Style forteresse / prison haute)
    const WALL_HEIGHT = 12.0;
    const WALL_Y = WALL_HEIGHT / 2; // 6.0

    const createCliffBlock = (name, w, h, d, x, y, z) => {
      const block = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
      block.material = rockMat;
      block.position.set(x, y, z);
      block.parent = this.root;
      block.freezeWorldMatrix();
    };

    // Parois Sud (fermée derrière le spawn)
    createCliffBlock('cliff_s', 54, WALL_HEIGHT, 4, 0, WALL_Y, -24);

    // Parois Est (avec brèche pour l'arche et mur plein sommital)
    // Brèche de z = -0.5 à z = 4.5 (largeur 5.0).
    createCliffBlock('cliff_e_south', 4, WALL_HEIGHT, 23.5, 25, WALL_Y, -12.25);
    createCliffBlock('cliff_e_north', 4, WALL_HEIGHT, 19.5, 25, WALL_Y, 14.25);
    // Haut de la porte Est (mur reliant les falaises au-dessus de l'arche)
    createCliffBlock('cliff_e_top_door', 4, WALL_HEIGHT - 5.0, 5.0, 25, 5.0 + (WALL_HEIGHT - 5.0) / 2, 2.0);

    // Parois Ouest (avec brèche pour le sanctuaire et mur plein sommital)
    createCliffBlock('cliff_w_south', 4, WALL_HEIGHT, 23.5, -25, WALL_Y, -12.25);
    createCliffBlock('cliff_w_north', 4, WALL_HEIGHT, 19.5, -25, WALL_Y, 14.25);
    // Haut de la porte Ouest (mur reliant les falaises au-dessus de la grille)
    createCliffBlock('cliff_w_top_door', 4, WALL_HEIGHT - 5.0, 5.0, -25, 5.0 + (WALL_HEIGHT - 5.0) / 2, 2.0);

    // Parois Nord (avec brèche pour la Porte du Boss et mur plein sommital)
    createCliffBlock('cliff_n_east', 22.5, WALL_HEIGHT, 4, 14.75, WALL_Y, 24);
    createCliffBlock('cliff_n_west', 22.5, WALL_HEIGHT, 4, -14.75, WALL_Y, 24);
    // Haut de la porte Nord (mur reliant les falaises au-dessus de la porte du Boss)
    createCliffBlock('cliff_n_top_door', 7.0, WALL_HEIGHT - 6.7, 4.0, 0, 6.7 + (WALL_HEIGHT - 6.7) / 2, 24);

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

  /**
   * Initialise des formations rocheuses low-poly incassables dans les 4 coins et le long des bordures.
   */
  initRocks() {
    const rockMat = new StandardMaterial('mat_rock_boulder', this.scene);
    rockMat.diffuseColor = new Color3(0.44, 0.47, 0.52); // Pierre granite ardoise rétro
    rockMat.diffuseTexture = RetroTextures.get(this.scene, 'cliff', 2, 2);
    rockMat.specularColor = new Color3(0.06, 0.06, 0.08);
    rockMat.freeze();

    // Positions stratégiques des rochers dans les coins et sur les côtés
    const rockData = [
      // 1. Coin Sud-Ouest (derrière et à gauche du spawn)
      { x: -19.5, z: -18.0, sx: 1.8, sy: 1.5, sz: 1.9, rotY: 0.6, r: 1.6 },
      { x: -21.2, z: -15.5, sx: 1.3, sy: 1.2, sz: 1.2, rotY: 1.4, r: 1.1 },
      { x: -17.2, z: -20.2, sx: 1.0, sy: 0.8, sz: 1.1, rotY: 2.1, r: 0.8 },

      // 2. Coin Sud-Est (derrière et à droite du spawn)
      { x: 19.5, z: -18.0, sx: 1.9, sy: 1.6, sz: 1.7, rotY: 0.9, r: 1.6 },
      { x: 21.5, z: -15.8, sx: 1.2, sy: 1.1, sz: 1.3, rotY: 2.3, r: 1.1 },
      { x: 17.5, z: -20.5, sx: 1.1, sy: 0.9, sz: 0.9, rotY: 1.1, r: 0.85 },

      // 3. Coin Nord-Ouest (près des falaises Nord-Ouest)
      { x: -18.5, z: 18.5, sx: 2.1, sy: 1.8, sz: 2.0, rotY: 1.2, r: 1.8 },
      { x: -21.0, z: 16.0, sx: 1.4, sy: 1.3, sz: 1.4, rotY: 0.4, r: 1.2 },
      { x: -15.8, z: 20.8, sx: 1.1, sy: 1.0, sz: 1.0, rotY: 2.8, r: 0.9 },

      // 4. Coin Nord-Est (près des falaises Nord-Est)
      { x: 18.5, z: 18.5, sx: 2.0, sy: 1.7, sz: 1.9, rotY: 1.8, r: 1.7 },
      { x: 21.0, z: 16.2, sx: 1.3, sy: 1.2, sz: 1.3, rotY: 0.7, r: 1.2 },
      { x: 15.6, z: 20.5, sx: 1.0, sy: 0.9, sz: 1.1, rotY: 2.2, r: 0.9 },

      // 5. Bordures Ouest (le long des falaises vers le sanctuaire)
      { x: -21.5, z: -3.5, sx: 1.5, sy: 1.4, sz: 1.6, rotY: 0.5, r: 1.3 },
      { x: -21.5, z: 7.5, sx: 1.6, sy: 1.3, sz: 1.5, rotY: 1.9, r: 1.3 },
      { x: -22.0, z: -8.5, sx: 1.3, sy: 1.1, sz: 1.4, rotY: 2.6, r: 1.1 },

      // 6. Bordures Est (le long des falaises vers la caverne)
      { x: 21.5, z: -3.5, sx: 1.5, sy: 1.3, sz: 1.6, rotY: 1.1, r: 1.3 },
      { x: 21.5, z: 7.5, sx: 1.6, sy: 1.4, sz: 1.5, rotY: 2.4, r: 1.3 },
      { x: 22.0, z: -8.5, sx: 1.3, sy: 1.0, sz: 1.3, rotY: 0.3, r: 1.1 },

      // 7. Bordures Nord (flanquant la Porte du Boss)
      { x: -6.5, z: 22.0, sx: 1.7, sy: 1.9, sz: 1.6, rotY: 0.8, r: 1.5 },
      { x: 6.5, z: 22.0, sx: 1.7, sy: 1.9, sz: 1.6, rotY: 2.2, r: 1.5 },

      // 8. Bordures Sud (derrière le spawn)
      { x: -8.0, z: -19.5, sx: 1.4, sy: 1.2, sz: 1.3, rotY: 1.5, r: 1.2 },
      { x: 8.0, z: -19.5, sx: 1.3, sy: 1.1, sz: 1.4, rotY: 2.0, r: 1.1 }
    ];

    rockData.forEach((d, idx) => {
      // Sphère basse résolution (segments: 4) = aspect bloc rocheux polyédrique facetté
      const rock = MeshBuilder.CreateSphere(`rock_boulder_${idx}`, {
        diameter: 1.8,
        segments: 4
      }, this.scene);
      rock.material = rockMat;
      rock.scaling.set(d.sx, d.sy, d.sz);
      rock.rotation.y = d.rotY;
      rock.rotation.x = 0.15;
      // Semi-enterré pour un ancrage naturel dans le sol
      rock.position.set(d.x, (d.sy * 0.9) * 0.42, d.z);
      rock.parent = this.root;
      rock.freezeWorldMatrix();

      this.rockColliders.push({ x: d.x, z: d.z, r: d.r });
    });
  }

  /**
   * Enregistre les hitboxes des murs, falaises, arbres et rochers dans le CollisionManager.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Falaises périmétriques (Murs)
    // Parois Sud (fermée derrière le spawn)
    collisionManager.addBox(-27, 27, -26, -22, 'cliff_s');

    // Parois Est (avec brèche centrée à z = 2)
    collisionManager.addBox(23, 27, 4.5, 25, 'cliff_e_north');
    collisionManager.addBox(23, 27, -24, -0.5, 'cliff_e_south');

    // Parois Ouest (avec brèche centrée à z = 2)
    collisionManager.addBox(-27, -23, 4.5, 25, 'cliff_w_north');
    collisionManager.addBox(-27, -23, -24, -0.5, 'cliff_w_south');

    // Parois Nord (avec brèche centrée à x = 0 pour la Porte du Boss)
    collisionManager.addBox(3.5, 27, 22, 26, 'cliff_n_east');
    collisionManager.addBox(-27, -3.5, 22, 26, 'cliff_n_west');

    // 2. Arbres (Troncs solides)
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

    treePositions.forEach(t => {
      collisionManager.addCircle(t.x, t.z, 0.65 * t.s, 'tree');
    });

    // 3. Rochers incassables (coins et bordures latérales)
    if (this.rockColliders) {
      this.rockColliders.forEach((rock, idx) => {
        collisionManager.addCircle(rock.x, rock.z, rock.r * 0.85, `rock_${idx}`);
      });
    }
  }
}
