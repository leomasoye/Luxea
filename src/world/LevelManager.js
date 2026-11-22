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

  // --- 1. Chemin 1 (Est) : La Caverne du Gardien (Ouvert) ---
  initPassageEast() {
    const archMat = new StandardMaterial('mat_cave_arch', this.scene);
    archMat.diffuseColor = new Color3(0.35, 0.35, 0.4);
    archMat.freeze();

    // Arche de pierre robuste parfaitement encastrée dans la brèche de la falaise (z = -0.5 à 4.5)
    const pillarL = MeshBuilder.CreateBox('arch_e_l', { width: 2.2, height: 4.8, depth: 1.6 }, this.scene);
    pillarL.material = archMat;
    pillarL.position.set(24.0, 2.25, 0.3);
    pillarL.parent = this.root;
    pillarL.freezeWorldMatrix();

    const pillarR = MeshBuilder.CreateBox('arch_e_r', { width: 2.2, height: 4.8, depth: 1.6 }, this.scene);
    pillarR.material = archMat;
    pillarR.position.set(24.0, 2.25, 3.7);
    pillarR.parent = this.root;
    pillarR.freezeWorldMatrix();

    const topBeam = MeshBuilder.CreateBox('arch_e_top', { width: 2.4, height: 1.3, depth: 5.0 }, this.scene);
    topBeam.material = archMat;
    topBeam.position.set(24.0, 4.4, 2.0);
    topBeam.parent = this.root;
    topBeam.freezeWorldMatrix();

    // Entrée sombre vers l'intérieur (Fond obscur 3D)
    const darkMat = new StandardMaterial('mat_cave_darkness', this.scene);
    darkMat.diffuseColor = new Color3(0.01, 0.01, 0.02);
    darkMat.specularColor = new Color3(0, 0, 0);

    const darkBacking = MeshBuilder.CreateBox('cave_dark_chamber', { width: 2.6, height: 4.4, depth: 3.4 }, this.scene);
    darkBacking.material = darkMat;
    darkBacking.position.set(25.5, 2.1, 2.0);
    darkBacking.parent = this.root;
    darkBacking.freezeWorldMatrix();

    // Déclencheur interactif
    this.interactables.push({
      id: 'east_cave',
      title: "Caverne du Gardien",
      position: new Vector3(22.0, 1.2, 2.0),
      radius: 2.0,
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

    // Déclencheur interactif
    this.interactables.push({
      id: 'west_sanctuary',
      title: "Sanctuaire des Ruines",
      position: new Vector3(-21.8, 1.2, 2.0),
      radius: 2.0,
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

    // Déclencheur interactif narratif majeur
    this.interactables.push({
      id: 'north_boss_door',
      title: "Chambre de Gallen",
      position: new Vector3(0, 1.2, 22.6),
      radius: 2.0,
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
      radius: 1.8,
      promptText: "[E] Lire le panneau",
      speaker: "Panneau d'information",
      text: "Bienvenue dans la Plaine d'Eveil ! Deplacez-vous avec ZQSD / WASD / Fleches. Tournez la camera avec [Clic Droit] ou [Molette] (recentrage avec [R]). Tranchez les buissons avec [Espace] ou [J]. Brandissez la Lumiere avec [Shift]. Lyo est retenu au Nord !"
    });
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
        const hit = weapon.checkHit(playerPos, playerFacingAngle, bush.getPosition(), bush.radius);
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
        const hit = weapon.checkHit(playerPos, playerFacingAngle, thornBush.getPosition(), thornBush.radius);
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
      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= item.radius && dist < minDist) {
        // Si un angle de regard est fourni, vérifier que Zelya regarde globalement vers l'objet (exclut le dos)
        if (playerFacingAngle !== null && playerFacingAngle !== undefined) {
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
  }

  /**
   * Enregistre les hitboxes du panneau, des portes/grilles, du mannequin et des buissons dans le CollisionManager.
   */
  initColliders(collisionManager) {
    if (!collisionManager) return;

    // 1. Panneau en bois au spawn
    collisionManager.addCircle(2.4, -3.2, 0.45, 'spawn_sign');

    // 2. Portes & Passages
    // Grille de bronze scellée (Ouest) & colonnes
    collisionManager.addBox(-25.2, -22.8, -0.6, 1.1, 'west_col_l');
    collisionManager.addBox(-25.2, -22.8, 2.9, 4.6, 'west_col_r');
    collisionManager.addBox(-24.4, -23.6, 0.6, 3.4, 'west_gate');

    // Porte imposante du Boss (Nord) & monolithes
    collisionManager.addBox(-2.0, 2.0, 23.6, 24.8, 'boss_door');
    collisionManager.addBox(-3.8, -1.8, 22.2, 25.4, 'boss_post_l');
    collisionManager.addBox(1.8, 3.8, 22.2, 25.4, 'boss_post_r');

    // Piliers de l'arche de la Caverne (Est) & fond obscur
    collisionManager.addBox(22.8, 25.2, -0.6, 1.1, 'east_pillar_l');
    collisionManager.addBox(22.8, 25.2, 2.9, 4.6, 'east_pillar_r');
    collisionManager.addBox(24.2, 26.8, 0.6, 3.4, 'east_cave_darkness');

    // 3. Mannequin d'entraînement (solide)
    if (this.trainingDummy) {
      collisionManager.addCircle(
        this.trainingDummy.root.position.x,
        this.trainingDummy.root.position.z,
        0.52,
        'training_dummy'
      );
    }

    // 4. Buissons tranchables & ronces : actifs uniquement tant qu'ils ne sont pas coupés
    collisionManager.addDynamicSource(() => {
      const colliders = [];
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

  /**
   * Réinitialise les buissons, ronces et pickups (appelé lors d'un respawn ou reset).
   */
  reset() {
    this.bushes.forEach(b => b.reset());
    this.thornBushes.forEach(tb => tb.reset());
    this.pickups.forEach(p => p.dispose());
    this.pickups = [];
  }
}

