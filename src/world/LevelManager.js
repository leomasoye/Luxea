import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Bush } from '../entities/Bush.js';

/**
 * LevelManager.js — Hub de la Plaine d'Éveil et les 3 Passages.
 * Conforme à GDD.md (Section 2 & 4) :
 * - Chemin 1 (Est) : Arche Ouverte de la Caverne du Gardien (Transition d'obscurité).
 * - Chemin 2 (Ouest) : Grille de bronze verrouillée (Nécessite Clé simple).
 * - Chemin 3 (Nord) : Porte imposante du Boss (Bruits étouffés de Lyo, aura d'ombre).
 * - Panneau interactif au Spawn (Tutoriel commandes).
 * - Buissons tranchables et pickups de cœurs.
 */
export class LevelManager {
  constructor(scene, audioManager, saveState) {
    this.scene = scene;
    this.audio = audioManager;
    this.saveState = saveState;

    this.root = new TransformNode('LevelManagerRoot', this.scene);

    // Collections
    this.bushes = [];
    this.pickups = [];

    // Points d'intérêt et déclencheurs interactifs
    this.interactables = [];

    // Éléments spécifiques
    this.bossDoorKnockTimer = 2.5; // Déclenche les bruits de Lyo périodiquement
    this.bossDoorParticles = [];

    this.initPassageEast();
    this.initPassageWest();
    this.initPassageNorth();
    this.initSpawnSign();
    this.initBushes();
  }

  // --- 1. Chemin 1 (Est) : La Caverne du Gardien (Ouvert) ---
  initPassageEast() {
    const archMat = new StandardMaterial('mat_cave_arch', this.scene);
    archMat.diffuseColor = new Color3(0.35, 0.35, 0.4);
    archMat.freeze();

    // Arche de pierre
    const pillarL = MeshBuilder.CreateBox('arch_e_l', { width: 1.5, height: 4.5, depth: 3 }, this.scene);
    pillarL.material = archMat;
    pillarL.position.set(23, 2.25, 0.2);
    pillarL.parent = this.root;
    pillarL.freezeWorldMatrix();

    const pillarR = MeshBuilder.CreateBox('arch_e_r', { width: 1.5, height: 4.5, depth: 3 }, this.scene);
    pillarR.material = archMat;
    pillarR.position.set(23, 2.25, 3.8);
    pillarR.parent = this.root;
    pillarR.freezeWorldMatrix();

    const topBeam = MeshBuilder.CreateBox('arch_e_top', { width: 1.8, height: 1.2, depth: 5.2 }, this.scene);
    topBeam.material = archMat;
    topBeam.position.set(23, 4.2, 2);
    topBeam.parent = this.root;
    topBeam.freezeWorldMatrix();

    // Entrée sombre vers l'intérieur (Fond obscur)
    const darkMat = new StandardMaterial('mat_cave_darkness', this.scene);
    darkMat.diffuseColor = new Color3(0.02, 0.02, 0.04);
    darkMat.specularColor = new Color3(0, 0, 0);

    const darkBacking = MeshBuilder.CreatePlane('cave_dark_plane', { width: 4.8, height: 4.2 }, this.scene);
    darkBacking.rotation.y = Math.PI / 2;
    darkBacking.material = darkMat;
    darkBacking.position.set(24.5, 2.1, 2);
    darkBacking.parent = this.root;
    darkBacking.freezeWorldMatrix();

    // Déclencheur interactif
    this.interactables.push({
      id: 'east_cave',
      title: "Caverne du Gardien",
      position: new Vector3(22.5, 1.2, 2),
      radius: 2.8,
      promptText: "[E] Examiner l'entree",
      speaker: "Zelya",
      text: "L'entrée de la Caverne du Gardien. Une brise fraîche et une obscurité dense s'en échappent... Mon épée se met à luire doucement. C'est ici que repose la première clé !"
    });
  }

  // --- 2. Chemin 2 (Ouest) : Le Sanctuaire des Ruines (Verrouillé) ---
  initPassageWest() {
    const ruinMat = new StandardMaterial('mat_ruins_arch', this.scene);
    ruinMat.diffuseColor = new Color3(0.48, 0.42, 0.38);
    ruinMat.freeze();

    // Colonnes antiques
    const colL = MeshBuilder.CreateCylinder('ruin_col_l', { height: 4.5, diameter: 1.3, tessellation: 8 }, this.scene);
    colL.material = ruinMat;
    colL.position.set(-23, 2.25, 0.2);
    colL.parent = this.root;
    colL.freezeWorldMatrix();

    const colR = MeshBuilder.CreateCylinder('ruin_col_r', { height: 4.5, diameter: 1.3, tessellation: 8 }, this.scene);
    colR.material = ruinMat;
    colR.position.set(-23, 2.25, 3.8);
    colR.parent = this.root;
    colR.freezeWorldMatrix();

    // Grille de bronze scellée
    const gateMat = new StandardMaterial('mat_bronze_gate', this.scene);
    gateMat.diffuseColor = new Color3(0.55, 0.38, 0.18);
    gateMat.specularColor = new Color3(0.6, 0.4, 0.2);

    const gate = MeshBuilder.CreateBox('west_gate', { width: 0.3, height: 3.8, depth: 4.2 }, this.scene);
    gate.material = gateMat;
    gate.position.set(-23, 1.9, 2);
    gate.parent = this.root;
    this.westGateMesh = gate;

    // Déclencheur interactif
    this.interactables.push({
      id: 'west_sanctuary',
      title: "Sanctuaire des Ruines",
      position: new Vector3(-21.8, 1.2, 2),
      radius: 2.8,
      promptText: "[E] Examiner la grille",
      speaker: "Grille Scellee",
      getText: () => {
        if (this.saveState.simpleKey) {
          return "La Clé simple brille dans votre sacoche ! Vous pouvez insérer la clé pour déverrouiller la grille vers le Sanctuaire des Ruines.";
        }
        return "La grille de bronze est fermement verrouillée. Une gravure ancienne indique qu'une Clé simple est requise pour entrer. Elle doit se trouver dans la Caverne à l'Est.";
      }
    });
  }

  // --- 3. Chemin 3 (Nord) : La Porte du Boss & Bruits de Lyo ---
  initPassageNorth() {
    const portalMat = new StandardMaterial('mat_boss_portal', this.scene);
    portalMat.diffuseColor = new Color3(0.28, 0.25, 0.35);
    portalMat.freeze();

    // Grande arche monolithique
    const postL = MeshBuilder.CreateBox('boss_p_l', { width: 2.2, height: 6.0, depth: 3.0 }, this.scene);
    postL.material = portalMat;
    postL.position.set(-3.2, 3.0, 23.5);
    postL.parent = this.root;
    postL.freezeWorldMatrix();

    const postR = MeshBuilder.CreateBox('boss_p_r', { width: 2.2, height: 6.0, depth: 3.0 }, this.scene);
    postR.material = portalMat;
    postR.position.set(3.2, 3.0, 23.5);
    postR.parent = this.root;
    postR.freezeWorldMatrix();

    const topLintel = MeshBuilder.CreateBox('boss_p_top', { width: 8.6, height: 1.8, depth: 3.2 }, this.scene);
    topLintel.material = portalMat;
    topLintel.position.set(0, 5.8, 23.5);
    topLintel.parent = this.root;
    topLintel.freezeWorldMatrix();

    // Battant de la porte massive en fer sombre
    const ironDoorMat = new StandardMaterial('mat_boss_door_iron', this.scene);
    ironDoorMat.diffuseColor = new Color3(0.18, 0.16, 0.22);
    ironDoorMat.specularColor = new Color3(0.3, 0.3, 0.4);

    const doorMesh = MeshBuilder.CreateBox('boss_door_mesh', { width: 5.2, height: 5.0, depth: 0.6 }, this.scene);
    doorMesh.material = ironDoorMat;
    doorMesh.position.set(0, 2.5, 23.6);
    doorMesh.parent = this.root;

    // Serrure du Boss ornée d'un crâne / orbe violet
    const lockMat = new StandardMaterial('mat_boss_lock', this.scene);
    lockMat.diffuseColor = new Color3(0.85, 0.7, 0.15);
    lockMat.emissiveColor = new Color3(0.4, 0.1, 0.4); // Aura de ténèbres

    const lockMesh = MeshBuilder.CreateSphere('boss_lock_orb', { diameter: 0.75 }, this.scene);
    lockMesh.material = lockMat;
    lockMesh.position.set(0, 2.5, 23.2);
    lockMesh.parent = this.root;

    // Déclencheur interactif narratif majeur
    this.interactables.push({
      id: 'north_boss_door',
      title: "Chambre de Gallen",
      position: new Vector3(0, 1.2, 21.5),
      radius: 3.2,
      promptText: "[E] Ecouter a la porte",
      speaker: "Lyo & Gallen",
      getText: () => {
        if (this.saveState.bossKey) {
          return "Vous tenez la Clé du Boss ! Le sanctuaire tremble... Il est temps d'affronter Gallen et de délivrer Lyo !";
        }
        return "Des coups sourds et une voix étouffée retentissent derrière le battant : « Zelya ! C'est moi, Lyo ! Gallen m'a enfermé ici... Trouve la Clé du Boss pour briser le sceau ! »";
      }
    });
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

    // Déclencheur interactif
    this.interactables.push({
      id: 'spawn_sign',
      title: "Panneau de la Plaine d'Eveil",
      position: new Vector3(2.4, 1.0, -3.2),
      radius: 2.2,
      promptText: "[E] Lire le panneau",
      speaker: "Panneau d'information",
      text: "Bienvenue dans la Plaine d'Eveil ! Deplacez-vous avec ZQSD / WASD / Fleches. Tournez la camera avec [Clic Droit] ou [Molette] (recentrage avec [R]). Tranchez les buissons avec [Espace] ou [J]. Brandissez la Lumiere avec [Shift]. Lyo est retenu au Nord !"
    });
  }

  // --- 5. Buissons tranchables dispersés ---
  initBushes() {
    const positions = [
      new Vector3(-3, 0, -2),
      new Vector3(-4.5, 0, -3.5),
      new Vector3(4, 0, -1),
      new Vector3(5.5, 0, -2.5),
      new Vector3(-7, 0, 4),
      new Vector3(-8.5, 0, 5.5),
      new Vector3(7, 0, 4.5),
      new Vector3(8.5, 0, 6),
      new Vector3(-2, 0, 8),
      new Vector3(2, 0, 9),
      new Vector3(-4, 0, 14),
      new Vector3(4, 0, 15)
    ];

    positions.forEach(pos => {
      const bush = new Bush(this.scene, pos, this.audio);
      this.bushes.push(bush);
    });
  }

  // Vérifie les coups d'épée contre tous les buissons
  checkSwordHits(playerPos, playerFacingAngle, weapon) {
    this.bushes.forEach(bush => {
      if (!bush.isCut) {
        const hit = weapon.checkHit(playerPos, playerFacingAngle, bush.getPosition(), 0.75);
        if (hit) {
          bush.cut(heartPickup => {
            this.pickups.push(heartPickup);
          });
        }
      }
    });
  }

  // Trouve l'élément interactif le plus proche du joueur
  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = Infinity;

    this.interactables.forEach(item => {
      const dx = playerPos.x - item.position.x;
      const dz = playerPos.z - item.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= item.radius && dist < minDist) {
        minDist = dist;
        nearest = item;
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
  }

  /**
   * Enregistre les hitboxes du panneau, des portes/grilles et des buissons dans le CollisionManager.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Panneau en bois au spawn
    collisionManager.addCircle(2.4, -3.2, 0.45, 'spawn_sign');

    // 2. Portes & Passages
    // Grille de bronze scellée (Ouest) & colonnes
    collisionManager.addBox(-23.4, -22.6, -0.1, 4.1, 'west_gate');
    collisionManager.addCircle(-23, 0.2, 0.65, 'west_col_l');
    collisionManager.addCircle(-23, 3.8, 0.65, 'west_col_r');

    // Porte imposante du Boss (Nord) & monolithes
    collisionManager.addBox(-2.6, 2.6, 23.2, 24.0, 'boss_door');
    collisionManager.addBox(-4.3, -2.1, 22.0, 25.0, 'boss_post_l');
    collisionManager.addBox(2.1, 4.3, 22.0, 25.0, 'boss_post_r');

    // Piliers de l'arche de la Caverne (Est) & fond obscur
    collisionManager.addBox(22.2, 23.8, -1.0, 1.2, 'east_pillar_l');
    collisionManager.addBox(22.2, 23.8, 2.8, 4.8, 'east_pillar_r');
    collisionManager.addBox(24.2, 25.5, -0.4, 4.4, 'east_cave_darkness');

    // 3. Buissons tranchables : actifs uniquement tant qu'ils ne sont pas coupés
    collisionManager.addDynamicSource(() => {
      return this.bushes
        .filter(b => !b.isCut)
        .map(b => ({
          type: 'circle',
          x: b.root.position.x,
          z: b.root.position.z,
          radius: 0.7,
          tag: 'bush'
        }));
    });
  }
}
