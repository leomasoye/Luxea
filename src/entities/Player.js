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

    this.visualRoot = new TransformNode('PlayerVisual', this.scene);
    this.visualRoot.parent = this.root;

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

    // Matériau pour le flash de dégâts (rouge/blanc)
    this.tunicMaterial = null;
    this.hurtMaterial = null;

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

    // Esquive / Roulade (K)
    this.isDodgeRolling = false;
    this.dodgeDuration = 0.28;
    this.dodgeTimer = 0;
    this.dodgeSpeed = 16.0;
    this.dodgeCooldown = 0;
    this.dodgeDirection = new Vector3(0, 0, 1);

    // Système de vie (6 demi-cœurs = 3 cœurs pleins)
    this.maxHealth = 6;
    this.health = 6;
    this.invulnerableTimer = 0;

    // Jauge de Lumière de l'Épée (0.0 à 1.0)
    this.lightGauge = 1.0;
    this.isTorchMode = false;
    this.torchRechargeRate = 0.12; // Rechargement à la lumière du soleil dans la plaine
    this.torchDrainRate = 0.08;

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
    // Matériau Tunique (Vert émeraude aventurier rétro)
    this.tunicMaterial = new StandardMaterial('mat_zelya_tunic', this.scene);
    this.tunicMaterial.diffuseColor = new Color3(0.12, 0.65, 0.42);
    this.tunicMaterial.specularColor = new Color3(0.1, 0.2, 0.1);

    // Matériau Peau
    const skinMaterial = new StandardMaterial('mat_zelya_skin', this.scene);
    skinMaterial.diffuseColor = new Color3(0.98, 0.8, 0.68);
    skinMaterial.specularColor = new Color3(0, 0, 0);

    // Matériau Cheveux (Auburn rétro chaud)
    const hairMaterial = new StandardMaterial('mat_zelya_hair', this.scene);
    hairMaterial.diffuseColor = new Color3(0.65, 0.28, 0.12);
    hairMaterial.specularColor = new Color3(0.1, 0.05, 0);

    // Matériau Bottes / Ceinture (Cuir brun)
    const leatherMaterial = new StandardMaterial('mat_zelya_leather', this.scene);
    leatherMaterial.diffuseColor = new Color3(0.42, 0.26, 0.14);

    // Matériau de dégâts (flash rouge)
    this.hurtMaterial = new StandardMaterial('mat_zelya_hurt', this.scene);
    this.hurtMaterial.diffuseColor = new Color3(1.0, 0.2, 0.2);
    this.hurtMaterial.emissiveColor = new Color3(0.6, 0.0, 0.0);

    // 1. Torse (Tunique)
    this.bodyMesh = MeshBuilder.CreateBox('zelya_body', {
      width: 0.65,
      height: 0.75,
      depth: 0.45
    }, this.scene);
    this.bodyMesh.material = this.tunicMaterial;
    this.bodyMesh.position.y = 0.82;
    this.bodyMesh.parent = this.visualRoot;

    // Ceinture
    const belt = MeshBuilder.CreateBox('zelya_belt', {
      width: 0.67,
      height: 0.12,
      depth: 0.47
    }, this.scene);
    belt.material = leatherMaterial;
    belt.position.y = 0.58;
    belt.parent = this.visualRoot;

    // Boucle de ceinture (dorée)
    const buckleMat = new StandardMaterial('mat_buckle', this.scene);
    buckleMat.diffuseColor = new Color3(0.95, 0.8, 0.2);
    const buckle = MeshBuilder.CreateBox('zelya_buckle', {
      width: 0.18,
      height: 0.14,
      depth: 0.50
    }, this.scene);
    buckle.material = buckleMat;
    buckle.position.y = 0.58;
    buckle.parent = this.visualRoot;

    // 2. Tête
    this.headMesh = MeshBuilder.CreateBox('zelya_head', {
      width: 0.52,
      height: 0.52,
      depth: 0.50
    }, this.scene);
    this.headMesh.material = skinMaterial;
    this.headMesh.position.y = 1.48;
    this.headMesh.parent = this.visualRoot;

    // Yeux rétro
    const eyeMat = new StandardMaterial('mat_eye', this.scene);
    eyeMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
    const leftEye = MeshBuilder.CreateBox('eye_l', { width: 0.08, height: 0.1, depth: 0.05 }, this.scene);
    leftEye.material = eyeMat;
    leftEye.position.set(-0.14, 1.5, 0.26);
    leftEye.parent = this.visualRoot;

    const rightEye = MeshBuilder.CreateBox('eye_r', { width: 0.08, height: 0.1, depth: 0.05 }, this.scene);
    rightEye.material = eyeMat;
    rightEye.position.set(0.14, 1.5, 0.26);
    rightEye.parent = this.visualRoot;

    // 3. Chevelure rétro avec mèche stylisée
    this.hairMesh = MeshBuilder.CreateBox('zelya_hair_top', {
      width: 0.58,
      height: 0.24,
      depth: 0.56
    }, this.scene);
    this.hairMesh.material = hairMaterial;
    this.hairMesh.position.y = 1.76;
    this.hairMesh.parent = this.visualRoot;

    this.hairBack = MeshBuilder.CreateBox('zelya_hair_back', {
      width: 0.58,
      height: 0.55,
      depth: 0.2
    }, this.scene);
    this.hairBack.material = hairMaterial;
    this.hairBack.position.set(0, 1.48, -0.22);
    this.hairBack.parent = this.visualRoot;

    // 4. Jambes / Bottes articulées (pivots aux hanches à y = 0.44)
    this.legLRoot = new TransformNode('zelya_leg_l_root', this.scene);
    this.legLRoot.position.set(-0.18, 0.44, 0);
    this.legLRoot.parent = this.visualRoot;

    this.legL = MeshBuilder.CreateBox('zelya_leg_l', { width: 0.22, height: 0.44, depth: 0.26 }, this.scene);
    this.legL.material = leatherMaterial;
    this.legL.position.set(0, -0.22, 0);
    this.legL.parent = this.legLRoot;

    this.legRRoot = new TransformNode('zelya_leg_r_root', this.scene);
    this.legRRoot.position.set(0.18, 0.44, 0);
    this.legRRoot.parent = this.visualRoot;

    this.legR = MeshBuilder.CreateBox('zelya_leg_r', { width: 0.22, height: 0.44, depth: 0.26 }, this.scene);
    this.legR.material = leatherMaterial;
    this.legR.position.set(0, -0.22, 0);
    this.legR.parent = this.legRRoot;

    // 5. Bras articulés (pivots aux épaules à y = 1.05)
    this.armLRoot = new TransformNode('zelya_arm_l_root', this.scene);
    this.armLRoot.position.set(-0.42, 1.05, 0);
    this.armLRoot.parent = this.visualRoot;

    this.sleeveL = MeshBuilder.CreateBox('zelya_sleeve_l', { width: 0.18, height: 0.32, depth: 0.22 }, this.scene);
    this.sleeveL.material = this.tunicMaterial;
    this.sleeveL.position.set(0, -0.16, 0);
    this.sleeveL.parent = this.armLRoot;

    this.handL = MeshBuilder.CreateBox('zelya_hand_l', { width: 0.14, height: 0.15, depth: 0.16 }, this.scene);
    this.handL.material = skinMaterial;
    this.handL.position.set(0, -0.36, 0);
    this.handL.parent = this.armLRoot;

    this.armRRoot = new TransformNode('zelya_arm_r_root', this.scene);
    this.armRRoot.position.set(0.42, 1.05, 0);
    this.armRRoot.parent = this.visualRoot;

    this.sleeveR = MeshBuilder.CreateBox('zelya_sleeve_r', { width: 0.18, height: 0.32, depth: 0.22 }, this.scene);
    this.sleeveR.material = this.tunicMaterial;
    this.sleeveR.position.set(0, -0.16, 0);
    this.sleeveR.parent = this.armRRoot;

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

  // Position absolue dans l'espace 3D
  getPosition() {
    return this.root.position;
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  // Déclenche l'attaque à l'épée
  attack() {
    if (this.isDodgeRolling) return false;

    const started = this.weapon.startSlash();
    if (started) {
      this.audio.playSwordSwing();

      // Dépense une petite quantité de lumière si disponible
      if (this.lightGauge > 0.05) {
        this.lightGauge = Math.max(0, this.lightGauge - 0.035);
        this.audio.playSwordLightBurst();
      }
    }
    return started;
  }

  // Déclenche la roulade / esquive (K)
  dodge(moveVector) {
    if (this.isDodgeRolling || this.dodgeCooldown > 0) return false;

    this.isDodgeRolling = true;
    this.dodgeTimer = this.dodgeDuration;
    this.dodgeCooldown = 0.48; // Temps d'attente avant la prochaine esquive

    // Direction de l'esquive : soit la direction du déplacement actuel (relative à la caméra), soit la direction de regard
    if (moveVector && (moveVector.x !== 0 || moveVector.z !== 0)) {
      const worldDir = this.camera ? this.camera.getWorldDirection(moveVector.x, moveVector.z) : moveVector;
      this.dodgeDirection.set(worldDir.x, 0, worldDir.z).normalize();
    } else {
      this.dodgeDirection.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    }

    this.audio.playRoll();
    return true;
  }

  // Reçoit des dégâts
  takeDamage(amount = 1, knockbackDir = null) {
    if (this.invulnerableTimer > 0 || this.isDodgeRolling) return false;

    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.8; // 0.8s d'invulnérabilité
    this.audio.playHurt();
    this.camera.shake(0.35, 0.22);

    // Knockback
    if (knockbackDir) {
      const kbDelta = {
        x: knockbackDir.x * 0.8,
        z: knockbackDir.z * 0.8
      };
      if (this.collision) {
        const resolved = this.collision.resolveMove(this.root.position, kbDelta, this.radius);
        this.root.position.x = resolved.x;
        this.root.position.z = resolved.z;
      } else {
        this.root.position.x += kbDelta.x;
        this.root.position.z += kbDelta.z;
      }
    }

    return true;
  }

  heal(amount = 2) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.audio.playHeartPickup();
  }

  reset(x = 0, y = 0, z = -4) {
    this.health = this.maxHealth;
    this.lightGauge = 1.0;
    this.isDodgeRolling = false;
    this.isMoving = false;
    this.invulnerableTimer = 0;
    this.setPosition(x, y, z);
    this.visualRoot.rotation.x = 0;
    this.visualRoot.rotation.z = 0;
    this.visualRoot.position.z = 0;
    if (this.legLRoot) { this.legLRoot.rotation.x = 0; this.legLRoot.position.y = 0.44; }
    if (this.legRRoot) { this.legRRoot.rotation.x = 0; this.legRRoot.position.y = 0.44; }
    if (this.armLRoot) { this.armLRoot.rotation.x = 0; this.armLRoot.rotation.y = 0; this.armLRoot.rotation.z = 0; }
    if (this.armRRoot) {
      this.armRRoot.rotation.x = -0.30;
      this.armRRoot.rotation.y = 0.10;
      this.armRRoot.rotation.z = 0.12;
    }
    if (this.bodyMesh) { this.bodyMesh.rotation.x = 0; this.bodyMesh.rotation.y = 0; this.bodyMesh.rotation.z = 0; }
    if (this.headMesh) { this.headMesh.rotation.x = 0; this.headMesh.rotation.y = 0; }
    if (this.hairBack) { this.hairBack.rotation.x = 0; }
  }

  update(input, dt) {
    // 1. Gestion des timers (cooldowns & invulnérabilité)
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      // Clignotement visuel de dégâts
      const flash = Math.floor(this.invulnerableTimer * 15) % 2 === 0;
      const mat = flash ? this.hurtMaterial : this.tunicMaterial;
      this.bodyMesh.material = mat;
      if (this.sleeveL) this.sleeveL.material = mat;
      if (this.sleeveR) this.sleeveR.material = mat;
    } else {
      this.bodyMesh.material = this.tunicMaterial;
      if (this.sleeveL) this.sleeveL.material = this.tunicMaterial;
      if (this.sleeveR) this.sleeveR.material = this.tunicMaterial;
    }

    // 2. Gestion de l'état Mode Torche
    this.isTorchMode = input.torchHeld && !this.isDodgeRolling;

    // Rechargement naturel de la lumière dans la plaine ensoleillée (Hub)
    if (!this.isTorchMode) {
      this.lightGauge = Math.min(1.0, this.lightGauge + this.torchRechargeRate * dt);
    } else {
      // Consommation légère en mode torche
      this.lightGauge = Math.max(0.05, this.lightGauge - this.torchDrainRate * dt);
    }

    // 3. Déplacement & Roulade
    if (this.isDodgeRolling) {
      this.dodgeTimer -= dt;
      const progress = 1 - (this.dodgeTimer / this.dodgeDuration);

      // Translation rapide avec résolution de collisions
      const moveDelta = {
        x: this.dodgeDirection.x * this.dodgeSpeed * dt,
        z: this.dodgeDirection.z * this.dodgeSpeed * dt
      };

      if (this.collision) {
        const resolved = this.collision.resolveMove(this.root.position, moveDelta, this.radius);
        this.root.position.x = resolved.x;
        this.root.position.z = resolved.z;
      } else {
        this.root.position.x += moveDelta.x;
        this.root.position.z += moveDelta.z;
      }

      // Animation procédurale de roulade (plongeon avant + compression)
      this.visualRoot.rotation.x = progress * Math.PI * 2;
      this.visualRoot.scaling.set(0.85, 0.7, 0.85);

      if (this.legLRoot) this.legLRoot.rotation.x = 0;
      if (this.legRRoot) this.legRRoot.rotation.x = 0;
      if (this.armLRoot) { this.armLRoot.rotation.x = 0.5; this.armLRoot.rotation.z = -0.1; }
      if (this.armRRoot && !this.weapon.isSlashing) { this.armRRoot.rotation.x = 0.5; this.armRRoot.rotation.z = 0.1; }

      if (this.dodgeTimer <= 0) {
        this.isDodgeRolling = false;
        this.visualRoot.rotation.x = 0;
        this.visualRoot.scaling.set(1, 1, 1);
      }
    } else {
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

    // 4. Bornage dans les limites de la plaine
    this.root.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.root.position.x));
    this.root.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.root.position.z));

    // 5. Mise à jour de l'arme
    this.weapon.update(dt, this.isTorchMode);

    // 6. Mise à jour de la lumière dynamique de l'épée
    const swordTip = this.weapon.getTipWorldPosition();
    this.lighting.update(
      swordTip,
      this.lightGauge,
      this.isTorchMode,
      this.weapon.isSlashing,
      dt
    );
  }
}
