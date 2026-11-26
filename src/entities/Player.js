import {
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';
import { Weapon } from './Weapon.js';

/**
 * Player.js — Héroïne Zelya.
 * Conforme à AGENT.md & GDD.md :
 * - Modèle low-poly rétro original (silhouette lisible, tunique, cheveux stylisés).
 * - Maniement nerveux (ZQSD/WASD/Flèches, pas de sur-vitesse en diagonale).
 * - Roulade / Esquive (K) avec invulnérabilité.
 * - Mode Torche (Shift/Clic Droit) avec jauge de lumière.
 * - Frappe lumineuse à l'épée avec knockback et retours visuels.
 */
export class Player {
  constructor(scene, audioManager, lightingManager, cameraManager, collisionManager = null) {
    this.scene = scene;
    this.audio = audioManager;
    this.lighting = lightingManager;
    this.camera = cameraManager;
    this.collision = collisionManager;
    this.radius = 0.38; // Rayon de la hitbox circulaire de Zelya

    this.root = new TransformNode('PlayerRoot', this.scene);
    this.root.position = new Vector3(0, 0, -4); // Point d'apparition au sud du Hub

    // Pivot de roulade au sol (maintient la rotation au-dessus du sol sans jamais s'enfoncer)
    this.rollNode = new TransformNode('PlayerRollNode', this.scene);
    this.rollNode.parent = this.root;

    this.visualRoot = new TransformNode('PlayerVisual', this.scene);
    this.visualRoot.parent = this.rollNode;

    // Composants visuels du corps
    this.bodyMesh = null;
    this.headMesh = null;
    this.hairMesh = null;
    this.hairBack = null;
    this.armLRoot = null;
    this.armRRoot = null;
    this.sleeveL = null;
    this.sleeveR = null;
    this.handL = null;
    this.handR = null;
    this.legLRoot = null;
    this.legRRoot = null;
    this.legL = null;
    this.legR = null;
    this.shadowDisc = null;

    // Matériaux de la tenue (robe de combat blanche et bleue) et flash de dégâts
    this.tunicMaterial = null;
    this.dressBlueMaterial = null;
    this.hurtMaterial = null;
    this.dressWhiteMeshes = [];
    this.dressBlueMeshes = [];

    // Arme
    this.weapon = new Weapon(this.scene, this.visualRoot);

    // Paramètres physiques & caractéristiques
    this.speed = 8.5;
    this.torchSpeedMultiplier = 0.65;
    this.facingAngle = 0; // Regarde vers le Nord au départ
    this.targetFacingAngle = 0;
    this.isMoving = false;

    // Animation procédurale de marche
    this.walkAnimTimer = 0;
    this.stepAudioTimer = 0;

    // Esquive / Roulade (K) — 0.75s de pause entre les roulades
    this.isDodgeRolling = false;
    this.dodgeDuration = 0.38;
    this.dodgeTimer = 0;
    this.dodgeSpeed = 15.0;
    this.dodgeCooldown = 0;
    this.dodgeDirection = new Vector3(0, 0, 1);

    // Recul physique lors des dégâts (Knockback dynamique)
    this.isKnockedBack = false;
    this.knockbackTimer = 0;
    this.knockbackDuration = 0.28; // Durée du recul (glissement franc et amorti)
    this.knockbackDirection = new Vector3(0, 0, 0);
    this.knockbackSpeed = 13.5;

    // Combat — 0.5s de cooldown entre les coups d'épée
    this.attackCooldown = 0;

    // Effet visuel de soin
    this.healFlashTimer = 0;
    this.ui = null;

    // Système de vie (6 demi-cœurs = 3 cœurs pleins)
    this.maxHealth = 6;
    this.health = 6;
    this.invulnerableTimer = 0;

    // Jauge de Lumière de l'Épée (0.0 à maxLightGauge)
    this.hasLegendarySword = false;
    this.maxLightGauge = 1.0;
    this.lightGauge = 1.0;
    this.isTorchMode = false;
    this.torchRechargeRate = 0.12; // Rechargement à la lumière du soleil dans la plaine
    this.torchDrainRate = 0.08;

    // État d'animation spécifique : extraction de l'Épée Légendaire & coup d'épée en roulade
    this.isPullingSword = false;
    this.pendingRollSlashHit = false;

    // Bornes de collision de la plaine (couvrent l'ensemble du terrain jusqu'aux falaises)
    this.bounds = {
      minX: -26,
      maxX: 26,
      minZ: -23,
      maxZ: 26
    };

    this.initMeshes();
  }

  initMeshes() {
    // Matériau Robe de combat - Blanc pur
    this.tunicMaterial = new StandardMaterial('mat_zelya_dress_white', this.scene);
    this.tunicMaterial.diffuseColor = new Color3(0.95, 0.97, 1.0);
    this.tunicMaterial.specularColor = new Color3(0.15, 0.18, 0.25);

    // Matériau Robe de combat - Bleu royal
    this.dressBlueMaterial = new StandardMaterial('mat_zelya_dress_blue', this.scene);
    this.dressBlueMaterial.diffuseColor = new Color3(0.14, 0.38, 0.86);
    this.dressBlueMaterial.specularColor = new Color3(0.18, 0.28, 0.45);

    // Matériau Liseré bleu ciel lumineux (accents de la robe)
    const dressTrimMat = new StandardMaterial('mat_zelya_dress_trim', this.scene);
    dressTrimMat.diffuseColor = new Color3(0.40, 0.78, 1.0);
    dressTrimMat.emissiveColor = new Color3(0.14, 0.36, 0.62);
    dressTrimMat.specularColor = new Color3(0.3, 0.5, 0.7);

    // Matériau Peau
    const skinMaterial = new StandardMaterial('mat_zelya_skin', this.scene);
    skinMaterial.diffuseColor = new Color3(0.98, 0.82, 0.70);
    skinMaterial.specularColor = new Color3(0, 0, 0);

    // Matériau Cheveux (Blond doré lumineux)
    const hairMaterial = new StandardMaterial('mat_zelya_hair', this.scene);
    hairMaterial.diffuseColor = new Color3(0.96, 0.82, 0.34);
    hairMaterial.emissiveColor = new Color3(0.10, 0.08, 0.02);
    hairMaterial.specularColor = new Color3(0.28, 0.22, 0.08);

    // Matériaux Diadème lumineux (Blanc éclatant & Cristal bleu lumineux)
    const diademWhiteMat = new StandardMaterial('mat_zelya_diadem_white', this.scene);
    diademWhiteMat.diffuseColor = new Color3(0.98, 0.99, 1.0);
    diademWhiteMat.emissiveColor = new Color3(0.45, 0.58, 0.72);
    diademWhiteMat.specularColor = new Color3(0.5, 0.6, 0.8);

    const diademBlueMat = new StandardMaterial('mat_zelya_diadem_blue', this.scene);
    diademBlueMat.diffuseColor = new Color3(0.28, 0.80, 1.0);
    diademBlueMat.emissiveColor = new Color3(0.25, 0.78, 1.0);
    diademBlueMat.specularColor = new Color3(0.6, 0.9, 1.0);

    // Matériau Bottes de combat (Bleu nuit / saphir)
    const bootMaterial = new StandardMaterial('mat_zelya_boots', this.scene);
    bootMaterial.diffuseColor = new Color3(0.12, 0.28, 0.66);
    bootMaterial.specularColor = new Color3(0.15, 0.22, 0.35);

    // Matériau de dégâts (flash rouge)
    this.hurtMaterial = new StandardMaterial('mat_zelya_hurt', this.scene);
    this.hurtMaterial.diffuseColor = new Color3(1.0, 0.2, 0.2);
    this.hurtMaterial.emissiveColor = new Color3(0.6, 0.0, 0.0);

    this.dressWhiteMeshes = [];
    this.dressBlueMeshes = [];

    // 1. Torse (Corsage de la robe de combat blanche et bleue)
    this.bodyMesh = MeshBuilder.CreateBox('zelya_body', {
      width: 0.62,
      height: 0.72,
      depth: 0.42
    }, this.scene);
    this.bodyMesh.material = this.tunicMaterial;
    this.bodyMesh.position.y = 0.82;
    this.bodyMesh.parent = this.visualRoot;
    this.dressWhiteMeshes.push(this.bodyMesh);

    // Plastron bleu royal sur le buste (avant & arrière)
    const chestPanel = MeshBuilder.CreateBox('zelya_chest_blue', {
      width: 0.36,
      height: 0.48,
      depth: 0.44
    }, this.scene);
    chestPanel.material = this.dressBlueMaterial;
    chestPanel.position.set(0, 0.06, 0);
    chestPanel.parent = this.bodyMesh;
    this.dressBlueMeshes.push(chestPanel);

    // Col / liseré lumineux bleu ciel
    const collarTrim = MeshBuilder.CreateBox('zelya_collar_trim', {
      width: 0.44,
      height: 0.08,
      depth: 0.45
    }, this.scene);
    collarTrim.material = dressTrimMat;
    collarTrim.position.set(0, 0.32, 0);
    collarTrim.parent = this.bodyMesh;

    // Ceinture / ruban de taille bleu royal
    const belt = MeshBuilder.CreateBox('zelya_belt', {
      width: 0.66,
      height: 0.12,
      depth: 0.46
    }, this.scene);
    belt.material = this.dressBlueMaterial;
    belt.position.set(0, -0.22, 0);
    belt.parent = this.bodyMesh;
    this.dressBlueMeshes.push(belt);

    // Boucle de ceinture (blanche et gemme bleue lumineuse)
    const buckle = MeshBuilder.CreateBox('zelya_buckle', {
      width: 0.16,
      height: 0.13,
      depth: 0.48
    }, this.scene);
    buckle.material = diademWhiteMat;
    buckle.position.set(0, -0.22, 0.01);
    buckle.parent = this.bodyMesh;

    const buckleGem = MeshBuilder.CreateBox('zelya_buckle_gem', {
      width: 0.08,
      height: 0.08,
      depth: 0.05
    }, this.scene);
    buckleGem.material = diademBlueMat;
    buckleGem.rotation.z = Math.PI / 4;
    buckleGem.position.set(0, -0.22, 0.25);
    buckleGem.parent = this.bodyMesh;

    // Jupe de combat évasée (blanche avec bordure et pan bleu royal)
    const skirtUpper = MeshBuilder.CreateBox('zelya_skirt_upper', {
      width: 0.72,
      height: 0.22,
      depth: 0.52
    }, this.scene);
    skirtUpper.material = this.tunicMaterial;
    skirtUpper.position.set(0, -0.35, 0);
    skirtUpper.parent = this.bodyMesh;
    this.dressWhiteMeshes.push(skirtUpper);

    const skirtLower = MeshBuilder.CreateBox('zelya_skirt_lower', {
      width: 0.80,
      height: 0.16,
      depth: 0.58
    }, this.scene);
    skirtLower.material = this.dressBlueMaterial;
    skirtLower.position.set(0, -0.48, 0);
    skirtLower.parent = this.bodyMesh;
    this.dressBlueMeshes.push(skirtLower);

    // Pan central blanc sur le devant de la robe (style tabard de combat)
    const frontTabard = MeshBuilder.CreateBox('zelya_front_tabard', {
      width: 0.28,
      height: 0.30,
      depth: 0.06
    }, this.scene);
    frontTabard.material = this.tunicMaterial;
    frontTabard.position.set(0, -0.41, 0.28);
    frontTabard.parent = this.bodyMesh;
    this.dressWhiteMeshes.push(frontTabard);

    const frontTabardTrim = MeshBuilder.CreateBox('zelya_front_tabard_trim', {
      width: 0.30,
      height: 0.05,
      depth: 0.07
    }, this.scene);
    frontTabardTrim.material = dressTrimMat;
    frontTabardTrim.position.set(0, -0.55, 0.285);
    frontTabardTrim.parent = this.bodyMesh;

    // 2. Tête (articulée)
    this.headMesh = MeshBuilder.CreateBox('zelya_head', {
      width: 0.52,
      height: 0.52,
      depth: 0.50
    }, this.scene);
    this.headMesh.material = skinMaterial;
    this.headMesh.position.y = 1.48;
    this.headMesh.parent = this.visualRoot;

    // Yeux rétro (bleu profond, attachés au visage)
    const eyeMat = new StandardMaterial('mat_eye', this.scene);
    eyeMat.diffuseColor = new Color3(0.08, 0.22, 0.52);
    const leftEye = MeshBuilder.CreateBox('eye_l', { width: 0.08, height: 0.1, depth: 0.05 }, this.scene);
    leftEye.material = eyeMat;
    leftEye.position.set(-0.14, 0.02, 0.26);
    leftEye.parent = this.headMesh;

    const rightEye = MeshBuilder.CreateBox('eye_r', { width: 0.08, height: 0.1, depth: 0.05 }, this.scene);
    rightEye.material = eyeMat;
    rightEye.position.set(0.14, 0.02, 0.26);
    rightEye.parent = this.headMesh;

    // 3. Chevelure blonde rétro (attachée à la tête)
    this.hairMesh = MeshBuilder.CreateBox('zelya_hair_top', {
      width: 0.58,
      height: 0.24,
      depth: 0.56
    }, this.scene);
    this.hairMesh.material = hairMaterial;
    this.hairMesh.position.set(0, 0.26, 0);
    this.hairMesh.parent = this.headMesh;

    // Mèches latérales encadrant le visage
    const hairSideL = MeshBuilder.CreateBox('zelya_hair_side_l', {
      width: 0.12,
      height: 0.36,
      depth: 0.16
    }, this.scene);
    hairSideL.material = hairMaterial;
    hairSideL.position.set(-0.27, 0.02, 0.12);
    hairSideL.parent = this.headMesh;

    const hairSideR = MeshBuilder.CreateBox('zelya_hair_side_r', {
      width: 0.12,
      height: 0.36,
      depth: 0.16
    }, this.scene);
    hairSideR.material = hairMaterial;
    hairSideR.position.set(0.27, 0.02, 0.12);
    hairSideR.parent = this.headMesh;

    this.hairBack = MeshBuilder.CreateBox('zelya_hair_back', {
      width: 0.58,
      height: 0.64,
      depth: 0.20
    }, this.scene);
    this.hairBack.material = hairMaterial;
    this.hairBack.position.set(0, -0.04, -0.22);
    this.hairBack.parent = this.headMesh;

    // 3b. Diadème blanc et bleu lumineux (attaché à la tête)
    const diademBand = MeshBuilder.CreateBox('zelya_diadem_band', {
      width: 0.60,
      height: 0.07,
      depth: 0.58
    }, this.scene);
    diademBand.material = diademWhiteMat;
    diademBand.position.set(0, 0.21, 0.01);
    diademBand.parent = this.headMesh;

    const diademCenterPeak = MeshBuilder.CreateBox('zelya_diadem_peak_center', {
      width: 0.16,
      height: 0.14,
      depth: 0.07
    }, this.scene);
    diademCenterPeak.material = diademWhiteMat;
    diademCenterPeak.position.set(0, 0.27, 0.285);
    diademCenterPeak.parent = this.headMesh;

    const diademWingL = MeshBuilder.CreateBox('zelya_diadem_wing_l', {
      width: 0.11,
      height: 0.09,
      depth: 0.06
    }, this.scene);
    diademWingL.material = diademWhiteMat;
    diademWingL.position.set(-0.17, 0.245, 0.28);
    diademWingL.rotation.z = 0.22;
    diademWingL.parent = this.headMesh;

    const diademWingR = MeshBuilder.CreateBox('zelya_diadem_wing_r', {
      width: 0.11,
      height: 0.09,
      depth: 0.06
    }, this.scene);
    diademWingR.material = diademWhiteMat;
    diademWingR.position.set(0.17, 0.245, 0.28);
    diademWingR.rotation.z = -0.22;
    diademWingR.parent = this.headMesh;

    // Gemme centrale bleue lumineuse du diadème
    const diademGemCenter = MeshBuilder.CreateBox('zelya_diadem_gem_center', {
      width: 0.095,
      height: 0.095,
      depth: 0.06
    }, this.scene);
    diademGemCenter.material = diademBlueMat;
    diademGemCenter.rotation.z = Math.PI / 4;
    diademGemCenter.position.set(0, 0.275, 0.31);
    diademGemCenter.parent = this.headMesh;

    // Petites gemmes latérales bleues lumineuses
    const diademGemL = MeshBuilder.CreateBox('zelya_diadem_gem_l', {
      width: 0.055,
      height: 0.055,
      depth: 0.05
    }, this.scene);
    diademGemL.material = diademBlueMat;
    diademGemL.rotation.z = Math.PI / 4;
    diademGemL.position.set(-0.17, 0.24, 0.30);
    diademGemL.parent = this.headMesh;

    const diademGemR = MeshBuilder.CreateBox('zelya_diadem_gem_r', {
      width: 0.055,
      height: 0.055,
      depth: 0.05
    }, this.scene);
    diademGemR.material = diademBlueMat;
    diademGemR.rotation.z = Math.PI / 4;
    diademGemR.position.set(0.17, 0.24, 0.30);
    diademGemR.parent = this.headMesh;

    // 4. Jambes / Bottes de combat articulées (pivots aux hanches à y = 0.44)
    this.legLRoot = new TransformNode('zelya_leg_l_root', this.scene);
    this.legLRoot.position.set(-0.18, 0.44, 0);
    this.legLRoot.parent = this.visualRoot;

    this.legL = MeshBuilder.CreateBox('zelya_leg_l', { width: 0.20, height: 0.44, depth: 0.24 }, this.scene);
    this.legL.material = bootMaterial;
    this.legL.position.set(0, -0.22, 0);
    this.legL.parent = this.legLRoot;

    const bootCuffL = MeshBuilder.CreateBox('zelya_boot_cuff_l', { width: 0.23, height: 0.08, depth: 0.27 }, this.scene);
    bootCuffL.material = this.tunicMaterial;
    bootCuffL.position.set(0, -0.08, 0);
    bootCuffL.parent = this.legLRoot;
    this.dressWhiteMeshes.push(bootCuffL);

    this.legRRoot = new TransformNode('zelya_leg_r_root', this.scene);
    this.legRRoot.position.set(0.18, 0.44, 0);
    this.legRRoot.parent = this.visualRoot;

    this.legR = MeshBuilder.CreateBox('zelya_leg_r', { width: 0.20, height: 0.44, depth: 0.24 }, this.scene);
    this.legR.material = bootMaterial;
    this.legR.position.set(0, -0.22, 0);
    this.legR.parent = this.legRRoot;

    const bootCuffR = MeshBuilder.CreateBox('zelya_boot_cuff_r', { width: 0.23, height: 0.08, depth: 0.27 }, this.scene);
    bootCuffR.material = this.tunicMaterial;
    bootCuffR.position.set(0, -0.08, 0);
    bootCuffR.parent = this.legRRoot;
    this.dressWhiteMeshes.push(bootCuffR);

    // 5. Bras articulés (pivots aux épaules à y = 1.05)
    this.armLRoot = new TransformNode('zelya_arm_l_root', this.scene);
    this.armLRoot.position.set(-0.42, 1.05, 0);
    this.armLRoot.parent = this.visualRoot;

    const pauldronL = MeshBuilder.CreateBox('zelya_pauldron_l', { width: 0.23, height: 0.12, depth: 0.26 }, this.scene);
    pauldronL.material = this.dressBlueMaterial;
    pauldronL.position.set(0, -0.02, 0);
    pauldronL.parent = this.armLRoot;
    this.dressBlueMeshes.push(pauldronL);

    this.sleeveL = MeshBuilder.CreateBox('zelya_sleeve_l', { width: 0.18, height: 0.30, depth: 0.22 }, this.scene);
    this.sleeveL.material = this.tunicMaterial;
    this.sleeveL.position.set(0, -0.17, 0);
    this.sleeveL.parent = this.armLRoot;
    this.dressWhiteMeshes.push(this.sleeveL);

    this.handL = MeshBuilder.CreateBox('zelya_hand_l', { width: 0.14, height: 0.15, depth: 0.16 }, this.scene);
    this.handL.material = skinMaterial;
    this.handL.position.set(0, -0.36, 0);
    this.handL.parent = this.armLRoot;

    this.armRRoot = new TransformNode('zelya_arm_r_root', this.scene);
    this.armRRoot.position.set(0.42, 1.05, 0);
    this.armRRoot.parent = this.visualRoot;

    const pauldronR = MeshBuilder.CreateBox('zelya_pauldron_r', { width: 0.23, height: 0.12, depth: 0.26 }, this.scene);
    pauldronR.material = this.dressBlueMaterial;
    pauldronR.position.set(0, -0.02, 0);
    pauldronR.parent = this.armRRoot;
    this.dressBlueMeshes.push(pauldronR);

    this.sleeveR = MeshBuilder.CreateBox('zelya_sleeve_r', { width: 0.18, height: 0.30, depth: 0.22 }, this.scene);
    this.sleeveR.material = this.tunicMaterial;
    this.sleeveR.position.set(0, -0.17, 0);
    this.sleeveR.parent = this.armRRoot;
    this.dressWhiteMeshes.push(this.sleeveR);

    this.handR = MeshBuilder.CreateBox('zelya_hand_r', { width: 0.14, height: 0.15, depth: 0.16 }, this.scene);
    this.handR.material = skinMaterial;
    this.handR.position.set(0, -0.36, 0);
    this.handR.parent = this.armRRoot;

    // Point d'ancrage (socket) pour tenir l'épée fermement dans le poing fermé
    this.handRSocket = new TransformNode('zelya_hand_r_socket', this.scene);
    this.handRSocket.position.set(0, -0.04, 0.04);
    // Angle dans la main : le manche traverse le poing fermé, la lame pointe en avant et vers le haut
    this.handRSocket.rotation.set(Math.PI / 2.3, 0.08, -0.12);
    this.handRSocket.parent = this.handR;

    if (this.weapon) {
      this.weapon.attachToHand(this.handRSocket);
    }

    // 6. Blob-Shadow rétro au sol (très économique en GPU)
    const shadowMat = new StandardMaterial('mat_blob_shadow', this.scene);
    shadowMat.diffuseColor = new Color3(0, 0, 0);
    shadowMat.alpha = 0.38;
    this.shadowDisc = MeshBuilder.CreateDisc('zelya_shadow', {
      radius: 0.65,
      tessellation: 16
    }, this.scene);
    this.shadowDisc.rotation.x = Math.PI / 2;
    this.shadowDisc.position.y = 0.03;
    this.shadowDisc.material = shadowMat;
    this.shadowDisc.parent = this.root;
  }

  setCollisionManager(collisionManager) {
    this.collision = collisionManager;
  }

  setUIManager(ui) {
    this.ui = ui;
  }

  setBounds(bounds) {
    if (bounds) {
      this.bounds = { ...bounds };
    }
  }

  setZone(zoneName) {
    this.currentZone = zoneName || 'plaine';
  }

  setGroundHeightProvider(providerFn) {
    this.groundHeightProvider = typeof providerFn === 'function' ? providerFn : null;
  }

  // Position absolue dans l'espace 3D
  getPosition() {
    return this.root.position;
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  // Déclenche l'attaque à l'épée avec cooldown anti-spam (plus rapide avec l'Épée Légendaire)
  attack() {
    if (this.isPullingSword || this.isDodgeRolling || this.attackCooldown > 0 || this.weapon.isSlashing) return false;

    const started = this.weapon.startSlash();
    if (started) {
      // Cooldown plus agile avec l'Épée Légendaire Bleue
      const pause = this.hasLegendarySword ? 0.34 : 0.50;
      this.attackCooldown = this.weapon.slashDuration + pause;
      this.audio.playSwordSwing();

      // Dépense une petite quantité de lumière si disponible
      if (this.lightGauge > 0.05) {
        const cost = this.hasLegendarySword ? 0.025 : 0.035;
        this.lightGauge = Math.max(0, this.lightGauge - cost);
        this.audio.playSwordLightBurst();
      }
    }
    return started;
  }

  /**
   * Équipe définitivement l'Épée Légendaire Bleue (remplace l'ancienne épée).
   * - Modèle bleu royal & traînée céleste
   * - Plus puissante, plus maniable (coup d'épée en roulade)
   * - Réserve de lumière doublée (maxLightGauge = 2.0)
   * - Lumière plus puissante et constante dans le temps
   */
  equipLegendarySword(silent = false) {
    this.hasLegendarySword = true;
    this.maxLightGauge = 2.0;
    this.lightGauge = this.maxLightGauge;

    if (this.weapon) {
      this.weapon.setLegendary(true);
      this.weapon.root.setEnabled(true);
    }
    if (this.lighting) {
      this.lighting.setLegendarySword(true);
    }
    if (this.ui) {
      this.ui.setLegendarySwordUI(true);
    }
    if (!silent) {
      this.audio.playSwordLightBurst();
    }
  }

  resetToDefaultSword() {
    this.hasLegendarySword = false;
    this.maxLightGauge = 1.0;
    this.lightGauge = 1.0;
    this.isPullingSword = false;
    this.pendingRollSlashHit = false;

    if (this.weapon) {
      this.weapon.setLegendary(false);
      this.weapon.root.setEnabled(true);
    }
    if (this.lighting) {
      this.lighting.setLegendarySword(false);
    }
    if (this.ui) {
      this.ui.setLegendarySwordUI(false);
    }
  }

  getLightGaugeRatio() {
    return this.maxLightGauge > 0 ? Math.max(0, Math.min(1, this.lightGauge / this.maxLightGauge)) : 0;
  }

  /**
   * Démarre l'animation dédiée d'extraction de l'Épée Légendaire du socle.
   */
  beginSwordPull() {
    this.isPullingSword = true;
    this.isDodgeRolling = false;
    this.isKnockedBack = false;
    this.isMoving = false;
    this.isTorchMode = false;
    if (this.weapon) {
      this.weapon.isSlashing = false;
      this.weapon.isRollSlashing = false;
      if (this.weapon.trailMesh) this.weapon.trailMesh.setEnabled(false);
      // Masque l'ancienne épée pendant que Zelya saisit celle du socle à deux mains
      this.weapon.root.setEnabled(false);
    }
    if (this.rollNode) {
      this.rollNode.position.set(0, 0, 0);
      this.rollNode.rotation.set(0, 0, 0);
    }
  }

  /**
   * Met à jour la posture corporelle de Zelya pendant la séquence d'extraction ('GRIP' | 'STRUGGLE' | 'TRIUMPH').
   */
  updateSwordPullPose(phase, p, strain = 0) {
    this.visualRoot.rotation.set(0, this.facingAngle, 0);
    this.visualRoot.scaling.set(1, 1, 1);

    if (phase === 'GRIP') {
      // Zelya s'approche et tend les deux mains vers la poignée de l'épée dans le socle
      this.visualRoot.position.set(0, 0, 0);
      if (this.bodyMesh) {
        this.bodyMesh.position.set(0, 0.82 - p * 0.04, p * 0.06);
        this.bodyMesh.rotation.set(p * 0.16, 0, 0);
      }
      if (this.headMesh) {
        this.headMesh.position.set(0, 1.48 - p * 0.04, p * 0.06);
        this.headMesh.rotation.set(-p * 0.18, 0, 0);
      }
      if (this.armLRoot) {
        this.armLRoot.position.set(-0.42 + p * 0.12, 1.05, p * 0.12);
        this.armLRoot.rotation.set(-p * 1.95, p * 0.35, -p * 0.15);
      }
      if (this.armRRoot) {
        this.armRRoot.position.set(0.42 - p * 0.12, 1.05, p * 0.12);
        this.armRRoot.rotation.set(-p * 1.95, -p * 0.35, p * 0.15);
      }
      if (this.legLRoot) { this.legLRoot.rotation.set(p * 0.15, 0, 0); }
      if (this.legRRoot) { this.legRRoot.rotation.set(-p * 0.15, 0, 0); }
    } else if (phase === 'STRUGGLE') {
      // Quelques secondes de galère : Zelya se penche en arrière, jambes fléchies, tremblant en tirant de toutes ses forces !
      const tremble = Math.sin(p * 75.0) * 0.045 * strain;
      const pullBack = 0.25 + strain * 0.42;

      this.visualRoot.position.set(0, -0.08 - strain * 0.06, 0);
      this.visualRoot.rotation.z = tremble * 1.4;

      if (this.bodyMesh) {
        this.bodyMesh.position.set(0, 0.78 - strain * 0.04, -pullBack * 0.16);
        this.bodyMesh.rotation.set(-pullBack * 0.55, tremble * 1.6, tremble);
      }
      if (this.headMesh) {
        this.headMesh.position.set(0, 1.44 - strain * 0.05, -pullBack * 0.22);
        this.headMesh.rotation.set(-0.28 - strain * 0.26, tremble * 2.0, 0);
      }
      if (this.hairBack) {
        this.hairBack.rotation.x = -0.25 - strain * 0.35;
      }
      // Les deux mains restent agrippées à la poignée et tirent vers le haut / arrière
      const armLift = -2.05 - p * 0.38 - strain * 0.16;
      if (this.armLRoot) {
        this.armLRoot.position.set(-0.30, 1.03, 0.10 - pullBack * 0.08);
        this.armLRoot.rotation.set(armLift, 0.38 + tremble, -0.16);
      }
      if (this.armRRoot) {
        this.armRRoot.position.set(0.30, 1.03, 0.10 - pullBack * 0.08);
        this.armRRoot.rotation.set(armLift, -0.38 - tremble, 0.16);
      }
      // Appui solide des jambes écartées/fléchies
      if (this.legLRoot) {
        this.legLRoot.position.set(-0.22, 0.40, 0.08);
        this.legLRoot.rotation.set(-0.42 - strain * 0.14, 0, -0.10);
      }
      if (this.legRRoot) {
        this.legRRoot.position.set(0.22, 0.40, -0.06);
        this.legRRoot.rotation.set(0.36 + strain * 0.12, 0, 0.10);
      }
    } else if (phase === 'TRIUMPH') {
      // Triomphe : Zelya brandit fièrement la nouvelle Épée Légendaire Bleue vers le ciel !
      const ease = 1.0 - Math.pow(1.0 - p, 2.2);
      this.visualRoot.position.set(0, Math.sin(Math.min(1, p * 2.0) * Math.PI) * 0.10, 0);
      this.visualRoot.rotation.z = 0;

      if (this.bodyMesh) {
        this.bodyMesh.position.set(0, 0.82, 0);
        this.bodyMesh.rotation.set(-0.08 * ease, 0, 0);
      }
      if (this.headMesh) {
        this.headMesh.position.set(0, 1.48, 0);
        this.headMesh.rotation.set(-0.22 * ease, 0, 0);
      }
      if (this.hairBack) {
        this.hairBack.rotation.x = -0.15 * ease;
      }
      if (this.armRRoot) {
        this.armRRoot.position.set(0.42, 1.05, 0);
        this.armRRoot.rotation.set(-2.95 * ease, -0.10, 0.18 * ease);
      }
      if (this.armLRoot) {
        this.armLRoot.position.set(-0.42, 1.05, 0);
        this.armLRoot.rotation.set(0.15 * ease, 0, -0.35 * ease);
      }
      if (this.legLRoot) {
        this.legLRoot.position.set(-0.18, 0.44, 0);
        this.legLRoot.rotation.set(0, 0, 0);
      }
      if (this.legRRoot) {
        this.legRRoot.position.set(0.18, 0.44, 0);
        this.legRRoot.rotation.set(0, 0, 0);
      }
    }
  }

  endSwordPull() {
    this.isPullingSword = false;
    this.visualRoot.position.set(0, 0, 0);
    this.visualRoot.rotation.set(0, this.facingAngle, 0);
    if (this.bodyMesh) { this.bodyMesh.position.set(0, 0.82, 0); this.bodyMesh.rotation.set(0, 0, 0); }
    if (this.headMesh) { this.headMesh.position.set(0, 1.48, 0); this.headMesh.rotation.set(0, 0, 0); }
    if (this.hairBack) { this.hairBack.rotation.x = 0; }
    if (this.legLRoot) { this.legLRoot.position.set(-0.18, 0.44, 0); this.legLRoot.rotation.set(0, 0, 0); }
    if (this.legRRoot) { this.legRRoot.position.set(0.18, 0.44, 0); this.legRRoot.rotation.set(0, 0, 0); }
    if (this.armLRoot) { this.armLRoot.position.set(-0.42, 1.05, 0); this.armLRoot.rotation.set(0, 0, 0); }
    if (this.armRRoot) { this.armRRoot.position.set(0.42, 1.05, 0); this.armRRoot.rotation.set(-0.30, 0.10, 0.12); }
    if (this.weapon) { this.weapon.root.setEnabled(true); }
  }

  // Déclenche la roulade / esquive (K) avec cooldown strict de 0.75s entre les roulades
  dodge(moveVector) {
    if (this.isPullingSword || this.isDodgeRolling || this.dodgeCooldown > 0) return false;

    this.isDodgeRolling = true;
    this.dodgeTimer = this.dodgeDuration;
    // 0.75s entre les roulades : durée de roulade + 0.75s
    this.dodgeCooldown = this.dodgeDuration + 0.75;

    // Direction de l'esquive : soit la direction du déplacement actuel (relative à la caméra), soit la direction de regard
    if (moveVector && (moveVector.x !== 0 || moveVector.z !== 0)) {
      const worldDir = this.camera ? this.camera.getWorldDirection(moveVector.x, moveVector.z) : moveVector;
      this.dodgeDirection.set(worldDir.x, 0, worldDir.z).normalize();
    } else {
      this.dodgeDirection.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    }

    // Alignement immédiat du modèle vers la trajectoire pour une roulade au sol parfaitement orientée
    this.facingAngle = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
    this.targetFacingAngle = this.facingAngle;
    if (this.rollNode) this.rollNode.rotation.y = this.facingAngle;
    this.visualRoot.rotation.y = 0;

    // Avec l'Épée Légendaire Bleue (plus maniable), Zelya donne un coup d'épée acrobatique en même temps que la roulade !
    if (this.hasLegendarySword && this.weapon) {
      this.weapon.startRollSlash(this.dodgeDuration);
      this.pendingRollSlashHit = true;
      this.audio.playSwordSwing();
    }

    // Particules de poussière (teintées d'étincelles bleues avec l'Épée Légendaire) au démarrage de la roulade
    this.spawnRollDust();

    this.audio.playRoll();
    return true;
  }

  /**
   * Consomme le déclencheur de frappe d'épée pendant la roulade (Épée Légendaire).
   */
  consumeRollSlashHit() {
    if (!this.pendingRollSlashHit) return false;
    // Déclenche l'impact dès que la lame balaie en pleine roulade
    const progress = this.isDodgeRolling ? (1.0 - this.dodgeTimer / this.dodgeDuration) : 1.0;
    if (progress >= 0.22) {
      this.pendingRollSlashHit = false;
      return true;
    }
    return false;
  }

  // Particules de poussière rétro au départ d'une roulade (étincelles bleues avec l'Épée Légendaire)
  spawnRollDust() {
    const dustMat = new StandardMaterial('mat_roll_dust', this.scene);
    if (this.hasLegendarySword) {
      dustMat.diffuseColor = new Color3(0.45, 0.88, 1.0);
      dustMat.emissiveColor = new Color3(0.20, 0.65, 0.95);
    } else {
      dustMat.diffuseColor = new Color3(0.72, 0.65, 0.52);
    }
    dustMat.specularColor = new Color3(0, 0, 0);

    const pos = this.root.position;
    for (let i = 0; i < 4; i++) {
      const puff = MeshBuilder.CreateBox('roll_dust', { width: 0.16, height: 0.14, depth: 0.16 }, this.scene);
      puff.material = dustMat;
      puff.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        0.08 + Math.random() * 0.12,
        pos.z + (Math.random() - 0.5) * 0.4
      );

      const velX = -this.dodgeDirection.x * 1.5 + (Math.random() - 0.5) * 0.8;
      const velZ = -this.dodgeDirection.z * 1.5 + (Math.random() - 0.5) * 0.8;
      let life = 0.28;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        puff.position.x += velX * dt;
        puff.position.z += velZ * dt;
        puff.position.y += 0.4 * dt;
        const scale = Math.max(0.01, life / 0.28);
        puff.scaling.set(scale, scale, scale);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          puff.dispose();
          if (dustMat) dustMat.dispose();
        }
      });
    }
  }

  // Reçoit des dégâts
  takeDamage(amount = 1, knockbackDir = null) {
    if (this.invulnerableTimer > 0 || this.isDodgeRolling) return false;

    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.85; // 0.85s d'invulnérabilité
    this.audio.playHurt();

    // Secousse d'écran fluide et contenue (vibration brève sans saut brutal)
    if (this.camera) {
      this.camera.shake(0.14, 0.20);
    }

    // Déclenchement du recul physique progressif sur plusieurs frames (glissement fluide)
    if (knockbackDir && (knockbackDir.x !== 0 || knockbackDir.z !== 0)) {
      const len = Math.hypot(knockbackDir.x, knockbackDir.z) || 1.0;
      this.knockbackDirection.set(knockbackDir.x / len, 0, knockbackDir.z / len);
      this.isKnockedBack = true;
      this.knockbackTimer = this.knockbackDuration;
    }

    return true;
  }

  // Soin avec effets visuels (particules étincelantes 3D, aura d'émeraude et feedback HUD)
  heal(amount = 2) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.healFlashTimer = 0.55; // Durée de l'aura de guérison verte sur la tunique
    this.spawnHealingParticles();
    this.audio.playHeartPickup();

    if (this.ui) {
      this.ui.triggerHealEffect();
    }
  }

  // Gerbe de particules étincelantes 3D montant en spirale autour de Zelya lors du soin
  spawnHealingParticles() {
    const healMat = new StandardMaterial('mat_heal_sparkle', this.scene);
    healMat.diffuseColor = new Color3(0.2, 0.95, 0.4);
    healMat.emissiveColor = new Color3(0.3, 1.0, 0.5); // Brillance magique rétro
    healMat.specularColor = new Color3(1, 1, 1);

    const pos = this.root.position;
    const count = 12;

    for (let i = 0; i < count; i++) {
      const sparkle = MeshBuilder.CreateBox('heal_sparkle', {
        width: 0.12,
        height: 0.12,
        depth: 0.12
      }, this.scene);
      sparkle.material = healMat;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.35 + Math.random() * 0.45;
      let curY = 0.15 + Math.random() * 0.35;

      sparkle.position.set(
        pos.x + Math.cos(angle) * radius,
        curY,
        pos.z + Math.sin(angle) * radius
      );

      let life = 0.65;
      let rotSpeed = 3.5 + Math.random() * 2.5;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        curY += 1.8 * dt; // Montée gracieuse
        sparkle.position.y = curY;
        sparkle.position.x += Math.cos(angle + (0.65 - life) * rotSpeed) * 0.6 * dt;
        sparkle.position.z += Math.sin(angle + (0.65 - life) * rotSpeed) * 0.6 * dt;
        sparkle.rotation.y += 4 * dt;
        sparkle.rotation.x += 3 * dt;

        const s = Math.max(0.001, (life / 0.65) * 1.2);
        sparkle.scaling.set(s, s, s);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          sparkle.dispose();
          if (i === count - 1 && healMat) healMat.dispose();
        }
      });
    }
  }

  reset(x = 0, y = 0, z = -4) {
    this.health = this.maxHealth;
    this.lightGauge = this.maxLightGauge;
    this.isDodgeRolling = false;
    this.isPullingSword = false;
    this.pendingRollSlashHit = false;
    this.isKnockedBack = false;
    this.knockbackTimer = 0;
    this.isMoving = false;
    this.invulnerableTimer = 0;
    this.setPosition(x, y, z);
    if (this.rollNode) {
      this.rollNode.position.set(0, 0, 0);
      this.rollNode.rotation.set(0, 0, 0);
    }
    this.visualRoot.rotation.x = 0;
    this.visualRoot.rotation.z = 0;
    this.visualRoot.position.y = 0;
    this.visualRoot.position.z = 0;
    this.visualRoot.scaling.set(1, 1, 1);
    if (this.weapon) this.weapon.root.scaling.set(1, 1, 1);
    if (this.legLRoot) { this.legLRoot.position.set(-0.18, 0.44, 0); this.legLRoot.rotation.set(0, 0, 0); }
    if (this.legRRoot) { this.legRRoot.position.set(0.18, 0.44, 0); this.legRRoot.rotation.set(0, 0, 0); }
    if (this.armLRoot) { this.armLRoot.position.set(-0.42, 1.05, 0); this.armLRoot.rotation.set(0, 0, 0); }
    if (this.armRRoot) {
      this.armRRoot.position.set(0.42, 1.05, 0);
      this.armRRoot.rotation.x = -0.30;
      this.armRRoot.rotation.y = 0.10;
      this.armRRoot.rotation.z = 0.12;
    }
    if (this.bodyMesh) { this.bodyMesh.position.set(0, 0.82, 0); this.bodyMesh.rotation.set(0, 0, 0); }
    if (this.headMesh) { this.headMesh.position.set(0, 1.48, 0); this.headMesh.rotation.set(0, 0, 0); }
    if (this.hairBack) { this.hairBack.rotation.x = 0; }
  }

  update(input, dt) {
    // 0. Pendant la cinématique d'extraction de l'Épée Légendaire, ForestManager pilote la posture
    if (this.isPullingSword) {
      const swordTip = this.weapon.getTipWorldPosition();
      this.lighting.update(swordTip, this.getLightGaugeRatio(), true, false, dt);
      return;
    }

    // 1. Gestion des timers (cooldowns & invulnérabilité)
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      // Clignotement visuel de dégâts sur toute la robe de combat
      const flash = Math.floor(this.invulnerableTimer * 15) % 2 === 0;
      for (const m of this.dressWhiteMeshes) {
        m.material = flash ? this.hurtMaterial : this.tunicMaterial;
      }
      for (const m of this.dressBlueMeshes) {
        m.material = flash ? this.hurtMaterial : this.dressBlueMaterial;
      }
    } else if (this.healFlashTimer > 0) {
      this.healFlashTimer -= dt;
      // Lueur d'émeraude régénérante sur la robe
      const glow = Math.sin(Math.min(1.0, this.healFlashTimer / 0.55) * Math.PI);
      this.tunicMaterial.emissiveColor.set(0.12 * glow, 0.78 * glow, 0.28 * glow);
      this.dressBlueMaterial.emissiveColor.set(0.10 * glow, 0.65 * glow, 0.25 * glow);
      for (const m of this.dressWhiteMeshes) m.material = this.tunicMaterial;
      for (const m of this.dressBlueMeshes) m.material = this.dressBlueMaterial;
    } else {
      this.tunicMaterial.emissiveColor.set(0, 0, 0);
      this.dressBlueMaterial.emissiveColor.set(0, 0, 0);
      for (const m of this.dressWhiteMeshes) m.material = this.tunicMaterial;
      for (const m of this.dressBlueMeshes) m.material = this.dressBlueMaterial;
    }

    // 2. Gestion de l'état Mode Torche
    this.isTorchMode = input.torchHeld && !this.isDodgeRolling;

    // Gestion de la jauge de lumière selon la zone (réserve étendue jusqu'à maxLightGauge avec l'Épée Légendaire)
    const rechargeRate = this.hasLegendarySword ? this.torchRechargeRate * 1.5 : this.torchRechargeRate;
    if (this.currentZone === 'cavern') {
      if (this.isTorchMode) {
        // Consommation en mode torche dans l'obscurité (plancher de sécurité à 0.08)
        this.lightGauge = Math.max(0.08, this.lightGauge - this.torchDrainRate * dt);
      } else if (this.root.position.x < 184) {
        // Rechargement près de l'ouverture lumineuse de sortie de la caverne
        this.lightGauge = Math.min(this.maxLightGauge, this.lightGauge + rechargeRate * dt);
      }
    } else {
      // Rechargement naturel au soleil dans la Plaine d'Éveil et la Forêt Sacrée
      if (!this.isTorchMode) {
        this.lightGauge = Math.min(this.maxLightGauge, this.lightGauge + rechargeRate * dt);
      } else {
        this.lightGauge = Math.max(0.05, this.lightGauge - this.torchDrainRate * dt);
      }
    }

    // 3. Déplacement, Recul de dégâts & Roulade au sol
    if (this.isKnockedBack) {
      this.isMoving = false;
      this.knockbackTimer -= dt;
      const progress = Math.max(0, this.knockbackTimer / this.knockbackDuration); // 1.0 -> 0.0

      // Décroissance douce et progressive de la vitesse (recul franc puis amorti)
      const speed = this.knockbackSpeed * Math.pow(progress, 1.35);

      const moveDelta = {
        x: this.knockbackDirection.x * speed * dt,
        z: this.knockbackDirection.z * speed * dt
      };

      if (this.collision) {
        const resolved = this.collision.resolveMove(this.root.position, moveDelta, this.radius);
        this.root.position.x = resolved.x;
        this.root.position.z = resolved.z;
      } else {
        this.root.position.x += moveDelta.x;
        this.root.position.z += moveDelta.z;
      }

      // Posture de réaction au coup (léger recul du torse et bras écartés pour l'équilibre)
      if (this.bodyMesh) {
        this.bodyMesh.rotation.x = -0.22 * progress;
      }
      if (this.armLRoot) {
        this.armLRoot.rotation.x = 0.40 * progress;
        this.armLRoot.rotation.z = -0.30 * progress;
      }
      if (this.armRRoot && !this.weapon.isSlashing) {
        this.armRRoot.rotation.x = 0.40 * progress;
        this.armRRoot.rotation.z = 0.30 * progress;
      }

      if (this.knockbackTimer <= 0) {
        this.isKnockedBack = false;
        if (this.bodyMesh) this.bodyMesh.rotation.x = 0;
        if (this.armLRoot) { this.armLRoot.rotation.x = 0; this.armLRoot.rotation.z = 0; }
        if (this.armRRoot && !this.weapon.isSlashing) {
          this.armRRoot.rotation.x = -0.30;
          this.armRRoot.rotation.y = 0.10;
          this.armRRoot.rotation.z = 0.12;
        }
      }
    } else if (this.isDodgeRolling) {
      this.dodgeTimer -= dt;
      const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.dodgeTimer / this.dodgeDuration)));

      // Courbe de vitesse sportive (accélération initiale, amorti en sortie)
      const speedMult = Math.sin(progress * Math.PI) * 1.35 + 0.35;
      const currentDodgeSpeed = this.dodgeSpeed * speedMult;

      // Translation rapide avec résolution de collisions
      const moveDelta = {
        x: this.dodgeDirection.x * currentDodgeSpeed * dt,
        z: this.dodgeDirection.z * currentDodgeSpeed * dt
      };

      if (this.collision) {
        const resolved = this.collision.resolveMove(this.root.position, moveDelta, this.radius);
        this.root.position.x = resolved.x;
        this.root.position.z = resolved.z;
      } else {
        this.root.position.x += moveDelta.x;
        this.root.position.z += moveDelta.z;
      }

      // Mise en boule compacte SUR le sol sans rétrécissement (échelle 100% conservée) :
      // Transition rapide au début (0 à 0.10) et maintien en boule jusqu'à la fin (0.90 à 1.0)
      const tuckIn = Math.min(1.0, progress / 0.10);
      const tuckOut = Math.min(1.0, (1.0 - progress) / 0.10);
      const ball = Math.min(tuckIn, tuckOut);

      // Rayon naturel du corps recroquevillé en boule (~0.52m sans aucun rapetissement)
      const R = 0.52;

      // A. Le pivot de rotation rollNode est placé au centre de gravité de la boule au sol
      // Le bas du personnage reste STRICTEMENT au niveau du sol (aucun enfoncement)
      this.rollNode.position.set(0, (R + 0.02) * ball, 0);
      this.rollNode.rotation.y = this.facingAngle;
      // Rotation complète 360° vers l'avant SUR le sol autour du centre de la boule
      this.rollNode.rotation.x = progress * Math.PI * 2;

      // B. Le personnage est centré dans la boule
      this.visualRoot.position.set(0, -R * ball, 0);
      this.visualRoot.rotation.set(0, 0, 0);

      // C. CONSERVATION TOTALE DE LA TAILLE ET DU VOLUME : Zéro rétrécissement artificiel
      this.visualRoot.scaling.set(1.0, 1.0, 1.0);
      if (this.weapon) this.weapon.root.scaling.set(1.0, 1.0, 1.0);

      // D. Tous les membres se recroquevillent de manière anatomique naturelle en boule serrée
      if (this.legLRoot) {
        this.legLRoot.position.set(-0.18, 0.44 + ball * 0.16, -ball * 0.08);
        this.legLRoot.rotation.x = -ball * 2.2;
      }
      if (this.legRRoot) {
        this.legRRoot.position.set(0.18, 0.44 + ball * 0.16, -ball * 0.08);
        this.legRRoot.rotation.x = -ball * 2.2;
      }
      if (this.armLRoot) {
        this.armLRoot.position.set(-0.42, 1.05 - ball * 0.32, ball * 0.12);
        this.armLRoot.rotation.x = -ball * 2.1;
        this.armLRoot.rotation.z = -ball * 0.25;
      }
      if (this.armRRoot) {
        if (this.hasLegendarySword) {
          // Coup d'épée agile et tranchant intégré à la roulade avec l'Épée Légendaire Bleue !
          const slashArc = Math.min(1.0, Math.max(0.0, (progress - 0.08) / 0.78));
          const sweep = 1.0 - Math.pow(1.0 - slashArc, 2.0);
          this.armRRoot.position.set(0.42, 1.05 - ball * 0.24, ball * 0.14);
          this.armRRoot.rotation.x = -1.35 + sweep * 1.15;
          this.armRRoot.rotation.y = 0.85 - sweep * 2.45;
          this.armRRoot.rotation.z = 0.75 - sweep * 1.25;
        } else {
          this.armRRoot.position.set(0.42, 1.05 - ball * 0.32, ball * 0.12);
          this.armRRoot.rotation.x = -ball * 2.1;
          this.armRRoot.rotation.z = ball * 0.25;
        }
      }
      if (this.bodyMesh) {
        this.bodyMesh.position.set(0, 0.82 - ball * 0.32, ball * 0.08);
        this.bodyMesh.rotation.x = ball * 0.75;
      }
      if (this.headMesh) {
        this.headMesh.position.set(0, 1.48 - ball * 0.52, ball * 0.22);
        this.headMesh.rotation.x = ball * 1.20;
      }
      if (this.hairBack) {
        this.hairBack.rotation.x = -ball * 0.60;
      }

      if (this.dodgeTimer <= 0) {
        this.isDodgeRolling = false;
        this.rollNode.position.set(0, 0, 0);
        this.rollNode.rotation.set(0, 0, 0);
        this.visualRoot.position.set(0, 0, 0);
        this.visualRoot.rotation.set(0, this.facingAngle, 0);
        this.visualRoot.scaling.set(1, 1, 1);
        if (this.bodyMesh) { this.bodyMesh.position.set(0, 0.82, 0); this.bodyMesh.rotation.x = 0; }
        if (this.headMesh) { this.headMesh.position.set(0, 1.48, 0); this.headMesh.rotation.x = 0; }
        if (this.hairBack) { this.hairBack.rotation.x = 0; }
        if (this.legLRoot) { this.legLRoot.position.set(-0.18, 0.44, 0); this.legLRoot.rotation.x = 0; }
        if (this.legRRoot) { this.legRRoot.position.set(0.18, 0.44, 0); this.legRRoot.rotation.x = 0; }
        if (this.armLRoot) { this.armLRoot.position.set(-0.42, 1.05, 0); this.armLRoot.rotation.set(0, 0, 0); }
        if (this.armRRoot) { this.armRRoot.position.set(0.42, 1.05, 0); this.armRRoot.rotation.set(-0.30, 0.10, 0.12); }
        if (this.weapon) { this.weapon.root.scaling.set(1, 1, 1); }
      }
    } else {
      // Déplacement normal : rollNode reste neutre à l'origine
      if (this.rollNode) {
        this.rollNode.position.set(0, 0, 0);
        this.rollNode.rotation.set(0, 0, 0);
      }
      // Déplacement normal
      const mv = input.moveVector;
      const isMoving = mv.x !== 0 || mv.z !== 0;
      this.isMoving = isMoving;

      if (isMoving) {
        // Vitesse ajustée en mode torche ou pendant l'attaque
        let currentSpeed = this.speed;
        if (this.isTorchMode) currentSpeed *= this.torchSpeedMultiplier;
        if (this.weapon.isSlashing) currentSpeed *= 0.45;

        // Projection du vecteur de commande dans le repère de la caméra
        const worldDir = this.camera ? this.camera.getWorldDirection(mv.x, mv.z) : mv;

        const moveDelta = {
          x: worldDir.x * currentSpeed * dt,
          z: worldDir.z * currentSpeed * dt
        };

        if (this.collision) {
          const resolved = this.collision.resolveMove(this.root.position, moveDelta, this.radius);
          this.root.position.x = resolved.x;
          this.root.position.z = resolved.z;
        } else {
          this.root.position.x += moveDelta.x;
          this.root.position.z += moveDelta.z;
        }

        // Angle de rotation vers la direction du mouvement monde
        this.targetFacingAngle = Math.atan2(worldDir.x, worldDir.z);

        // Animation procédurale de marche fluide, dynamique et expressive (style Zelda)
        this.walkAnimTimer += dt * 11.5;

        // 1. Balancement opposé et naturel des jambes
        const legSwing = Math.sin(this.walkAnimTimer) * 0.62;
        if (this.legLRoot) {
          this.legLRoot.rotation.x = legSwing;
          // Soulèvement léger du pied qui avance
          this.legLRoot.position.y = 0.44 + Math.max(0, -Math.sin(this.walkAnimTimer)) * 0.06;
        }
        if (this.legRRoot) {
          this.legRRoot.rotation.x = -legSwing;
          this.legRRoot.position.y = 0.44 + Math.max(0, Math.sin(this.walkAnimTimer)) * 0.06;
        }

        // 2. Balancement coordonné des bras (en opposition aux jambes)
        if (this.armLRoot && !this.weapon.isSlashing) {
          this.armLRoot.rotation.x = -legSwing * 0.72;
          this.armLRoot.rotation.y = 0;
          this.armLRoot.rotation.z = -0.08;
        }
        if (this.armRRoot && !this.weapon.isSlashing) {
          if (!this.isTorchMode) {
            // L'épée est fermement tenue dans la main droite, oscillant avec le pas
            this.armRRoot.rotation.x = -0.30 + legSwing * 0.38;
            this.armRRoot.rotation.y = 0.10;
            this.armRRoot.rotation.z = 0.12 + Math.abs(legSwing) * 0.04;
          } else {
            // Mode Torche : bras levé haut vers le ciel brandissant l'épée de lumière
            this.armRRoot.rotation.x = -2.25;
            this.armRRoot.rotation.y = -0.15;
            this.armRRoot.rotation.z = 0.25;
          }
        }

        // 3. Rebond vertical doux de la démarche et léger déhanchement
        this.visualRoot.position.y = Math.abs(Math.sin(this.walkAnimTimer)) * 0.07;
        this.visualRoot.rotation.z = Math.sin(this.walkAnimTimer) * 0.035;

        // 4. Inclinaison athlétique vers l'avant (élan de course)
        if (this.bodyMesh && !this.weapon.isSlashing) {
          this.bodyMesh.rotation.x = 0.09;
          this.bodyMesh.rotation.y = 0;
          this.bodyMesh.rotation.z = 0;
        }

        // 5. Flottement physique secondaire de la chevelure
        if (this.hairBack && !this.weapon.isSlashing) {
          this.hairBack.rotation.x = -0.16 + Math.sin(this.walkAnimTimer * 2) * 0.05;
        }

        // Bruit de pas
        this.stepAudioTimer += dt;
        if (this.stepAudioTimer > 0.28) {
          this.stepAudioTimer = 0;
          this.audio.playStep();
        }
      } else {
        // Au repos : transition douce vers la pose neutre avec respiration
        const returnSpeed = Math.min(1.0, dt * 12);
        if (this.legLRoot && !this.weapon.isSlashing) {
          this.legLRoot.rotation.x *= (1 - returnSpeed);
          this.legLRoot.position.y += (0.44 - this.legLRoot.position.y) * returnSpeed;
        }
        if (this.legRRoot && !this.weapon.isSlashing) {
          this.legRRoot.rotation.x *= (1 - returnSpeed);
          this.legRRoot.position.y += (0.44 - this.legRRoot.position.y) * returnSpeed;
        }
        if (this.armLRoot && !this.weapon.isSlashing) {
          this.armLRoot.rotation.x *= (1 - returnSpeed);
          this.armLRoot.rotation.y *= (1 - returnSpeed);
          this.armLRoot.rotation.z *= (1 - returnSpeed);
        }
        if (this.armRRoot && !this.weapon.isSlashing) {
          if (!this.isTorchMode) {
            this.armRRoot.rotation.x += (-0.30 - this.armRRoot.rotation.x) * returnSpeed;
            this.armRRoot.rotation.y += (0.10 - this.armRRoot.rotation.y) * returnSpeed;
            this.armRRoot.rotation.z += (0.12 - this.armRRoot.rotation.z) * returnSpeed;
          } else {
            this.armRRoot.rotation.x += (-2.25 - this.armRRoot.rotation.x) * returnSpeed;
            this.armRRoot.rotation.y += (-0.15 - this.armRRoot.rotation.y) * returnSpeed;
            this.armRRoot.rotation.z += (0.25 - this.armRRoot.rotation.z) * returnSpeed;
          }
        }
        if (this.bodyMesh && !this.weapon.isSlashing) {
          this.bodyMesh.rotation.x *= (1 - returnSpeed);
          this.bodyMesh.rotation.y *= (1 - returnSpeed);
          this.bodyMesh.rotation.z *= (1 - returnSpeed);
        }
        if (this.headMesh && !this.weapon.isSlashing) {
          this.headMesh.rotation.x *= (1 - returnSpeed);
          this.headMesh.rotation.y *= (1 - returnSpeed);
        }
        if (this.hairBack && !this.weapon.isSlashing) {
          this.hairBack.rotation.x *= (1 - returnSpeed);
        }

        this.idleTimer = (this.idleTimer || 0) + dt * 2.2;
        if (!this.weapon.isSlashing) {
          this.visualRoot.position.y = Math.sin(this.idleTimer) * 0.018;
          this.visualRoot.rotation.z = 0;
        }
        this.stepAudioTimer = 0.2;
      }

      // Interpolation douce de l'orientation
      let angleDiff = this.targetFacingAngle - this.facingAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      this.facingAngle += angleDiff * Math.min(1.0, dt * 18);
      this.visualRoot.rotation.y = this.facingAngle;

      // === CINÉTIQUE CORPORELLE MARTIALE LORS DU COUP D'ÉPÉE ===
      // Tout le corps réagit naturellement : enroulement, fente, découpe circulaire du bras droit
      // avec l'épée fermement en main, contrepoids du bras gauche, regard fixé et amorti progressif.
      if (this.weapon.isSlashing) {
        const slashP = this.weapon.getProgress();

        if (slashP < 0.12) {
          // --- 1. ARMEMENT / WINDUP (0.0 à 0.12) ---
          const w = slashP / 0.12;

          this.visualRoot.position.y = -w * 0.05;
          this.visualRoot.position.z = -w * 0.05;
          this.visualRoot.rotation.x = -w * 0.06;
          this.visualRoot.rotation.y = this.facingAngle + w * 0.28;
          this.visualRoot.rotation.z = w * 0.04;

          if (this.bodyMesh) {
            this.bodyMesh.rotation.y = w * 0.22;
            this.bodyMesh.rotation.x = -w * 0.08;
            this.bodyMesh.rotation.z = 0;
          }

          if (this.headMesh) {
            this.headMesh.rotation.y = -w * 0.20;
            this.headMesh.rotation.x = 0;
          }

          // Bras droit armé en haut à droite en arrière
          if (this.armRRoot) {
            this.armRRoot.rotation.x = -w * 1.35;
            this.armRRoot.rotation.y = w * 0.55;
            this.armRRoot.rotation.z = w * 0.40;
          }

          // Bras gauche en avant pour la garde
          if (this.armLRoot) {
            this.armLRoot.rotation.x = -w * 0.60;
            this.armLRoot.rotation.y = w * 0.25;
            this.armLRoot.rotation.z = -w * 0.18;
          }

          // Jambes fléchies pour l'élan
          if (this.legLRoot) {
            this.legLRoot.rotation.x = w * 0.25;
            this.legLRoot.position.y = 0.44 - w * 0.04;
          }
          if (this.legRRoot) {
            this.legRRoot.rotation.x = -w * 0.20;
            this.legRRoot.position.y = 0.44 - w * 0.04;
          }

          if (this.hairBack) {
            this.hairBack.rotation.x = w * 0.08;
          }
        } else if (slashP < 0.62) {
          // --- 2. LA FRAPPE TRANCHANTE (0.12 à 0.62) ---
          const u = (slashP - 0.12) / 0.50;
          const e = 1.0 - Math.pow(1.0 - u, 2.4); // Accélération explosive
          const lunge = Math.sin(u * Math.PI);

          // Rotation dynamique du corps entier de droite à gauche
          this.visualRoot.rotation.y = this.facingAngle + 0.28 - e * 0.73;
          this.visualRoot.position.z = lunge * 0.16;
          this.visualRoot.position.y = -0.05 - lunge * 0.06;
          this.visualRoot.rotation.x = lunge * 0.12;
          this.visualRoot.rotation.z = -lunge * 0.06;

          // Torse : inclinaison vers l'avant et torsion
          if (this.bodyMesh) {
            this.bodyMesh.rotation.x = lunge * 0.22;
            this.bodyMesh.rotation.y = 0.22 - e * 0.58;
            this.bodyMesh.rotation.z = -lunge * 0.10;
          }

          // Tête : regard maintenu sur la cible
          if (this.headMesh) {
            this.headMesh.rotation.y = (0.22 - e * 0.58) * -0.5;
            this.headMesh.rotation.x = -lunge * 0.14;
          }

          // Bras droit : découpe circulaire énergique balayant le champ frontal
          if (this.armRRoot) {
            this.armRRoot.rotation.x = -1.35 + 1.05 * e; // De l'armement haut à la coupe horizontale
            this.armRRoot.rotation.y = 0.55 - 1.90 * e;  // De droite (+0.55) vers la gauche (-1.35)
            this.armRRoot.rotation.z = 0.40 - 0.85 * e;  // Extension dynamique
          }

          // Bras gauche : contrepoids cinétique jeté en arrière
          if (this.armLRoot) {
            this.armLRoot.rotation.x = -0.60 + 1.45 * e;
            this.armLRoot.rotation.y = 0.25 - 0.45 * e;
            this.armLRoot.rotation.z = -0.18 - lunge * 0.30;
          }

          // Jambes : fente martiale stable
          if (this.legLRoot) {
            this.legLRoot.rotation.x = 0.25 - 0.55 * e;
            this.legLRoot.position.y = 0.44 - lunge * 0.05;
          }
          if (this.legRRoot) {
            this.legRRoot.rotation.x = -0.20 + 0.50 * e;
            this.legRRoot.position.y = 0.44 - lunge * 0.04;
          }

          // Cheveux : fouettent en arrière avec la vitesse de frappe
          if (this.hairBack) {
            this.hairBack.rotation.x = -0.15 - lunge * 0.32;
          }
        } else {
          // --- 3. AMORTI & RETOUR EN GARDE (0.62 à 1.0) ---
          const u = (slashP - 0.62) / 0.38;
          const r = 1.0 - Math.sin(u * Math.PI * 0.5);

          this.visualRoot.rotation.y = this.facingAngle - r * 0.45;
          this.visualRoot.position.z = r * 0.04;
          this.visualRoot.position.y = -r * 0.03;
          this.visualRoot.rotation.x = r * 0.03;
          this.visualRoot.rotation.z = 0;

          if (this.bodyMesh) {
            this.bodyMesh.rotation.x = r * 0.06;
            this.bodyMesh.rotation.y = -r * 0.36;
            this.bodyMesh.rotation.z = 0;
          }

          if (this.headMesh) {
            this.headMesh.rotation.y = r * 0.15;
            this.headMesh.rotation.x = 0;
          }

          if (this.armRRoot) {
            this.armRRoot.rotation.x = -0.30 * r + (-0.30) * (1 - r);
            this.armRRoot.rotation.y = -1.35 * r + 0.10 * (1 - r);
            this.armRRoot.rotation.z = -0.45 * r + 0.12 * (1 - r);
          }

          if (this.armLRoot) {
            this.armLRoot.rotation.x = 0.85 * r;
            this.armLRoot.rotation.y = -0.20 * r;
            this.armLRoot.rotation.z = -0.18 * r;
          }

          if (this.legLRoot) {
            this.legLRoot.rotation.x = -0.30 * r;
            this.legLRoot.position.y = 0.44;
          }
          if (this.legRRoot) {
            this.legRRoot.rotation.x = 0.30 * r;
            this.legRRoot.position.y = 0.44;
          }

          if (this.hairBack) {
            this.hairBack.rotation.x = -0.15 * r;
          }
        }
      } else {
        this.visualRoot.position.z = 0;
        this.visualRoot.rotation.x = 0;
      }
    }

    // 4. Bornage dans les limites de la zone active
    this.root.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.root.position.x));
    this.root.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.root.position.z));

    // 4b. Ajustement fluide de la hauteur verticale (relief, rampes, terrasses surélevées)
    if (this.groundHeightProvider) {
      const targetY = this.groundHeightProvider(this.root.position.x, this.root.position.z);
      this.root.position.y += (targetY - this.root.position.y) * Math.min(1.0, dt * 14);
    } else {
      this.root.position.y += (0 - this.root.position.y) * Math.min(1.0, dt * 14);
    }

    // 5. Mise à jour de l'arme
    this.weapon.update(dt, this.isTorchMode);

    // 6. Mise à jour de la lumière dynamique de l'épée
    const swordTip = this.weapon.getTipWorldPosition();
    this.lighting.update(
      swordTip,
      this.getLightGaugeRatio(),
      this.isTorchMode,
      this.weapon.isSlashing || this.weapon.isRollSlashing,
      dt
    );
  }
}
