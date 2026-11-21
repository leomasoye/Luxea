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
    this.leftArm = null;
    this.rightArm = null;
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

    const hairBack = MeshBuilder.CreateBox('zelya_hair_back', {
      width: 0.58,
      height: 0.55,
      depth: 0.2
    }, this.scene);
    hairBack.material = hairMaterial;
    hairBack.position.set(0, 1.48, -0.22);
    hairBack.parent = this.visualRoot;

    // 4. Jambes / Bottes
    const legL = MeshBuilder.CreateBox('zelya_leg_l', { width: 0.22, height: 0.45, depth: 0.26 }, this.scene);
    legL.material = leatherMaterial;
    legL.position.set(-0.18, 0.22, 0);
    legL.parent = this.visualRoot;

    const legR = MeshBuilder.CreateBox('zelya_leg_r', { width: 0.22, height: 0.45, depth: 0.26 }, this.scene);
    legR.material = leatherMaterial;
    legR.position.set(0.18, 0.22, 0);
    legR.parent = this.visualRoot;

    // 5. Blob-Shadow rétro au sol (très économique en GPU)
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

    // Direction de l'esquive : soit la direction du déplacement actuel, soit la direction de regard
    if (moveVector && (moveVector.x !== 0 || moveVector.z !== 0)) {
      this.dodgeDirection.set(moveVector.x, 0, moveVector.z).normalize();
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
    this.invulnerableTimer = 0;
    this.setPosition(x, y, z);
    this.visualRoot.rotation.x = 0;
    this.visualRoot.rotation.z = 0;
  }

  update(input, dt) {
    // 1. Gestion des timers (cooldowns & invulnérabilité)
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      // Clignotement visuel de dégâts
      const flash = Math.floor(this.invulnerableTimer * 15) % 2 === 0;
      this.bodyMesh.material = flash ? this.hurtMaterial : this.tunicMaterial;
    } else {
      this.bodyMesh.material = this.tunicMaterial;
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

      if (this.dodgeTimer <= 0) {
        this.isDodgeRolling = false;
        this.visualRoot.rotation.x = 0;
        this.visualRoot.scaling.set(1, 1, 1);
      }
    } else {
      // Déplacement normal
      const mv = input.moveVector;
      const isMoving = mv.x !== 0 || mv.z !== 0;

      if (isMoving) {
        // Vitesse ajustée en mode torche ou pendant l'attaque
        let currentSpeed = this.speed;
        if (this.isTorchMode) currentSpeed *= this.torchSpeedMultiplier;
        if (this.weapon.isSlashing) currentSpeed *= 0.45;

        const moveDelta = {
          x: mv.x * currentSpeed * dt,
          z: mv.z * currentSpeed * dt
        };

        if (this.collision) {
          const resolved = this.collision.resolveMove(this.root.position, moveDelta, this.radius);
          this.root.position.x = resolved.x;
          this.root.position.z = resolved.z;
        } else {
          this.root.position.x += moveDelta.x;
          this.root.position.z += moveDelta.z;
        }

        // Angle de rotation vers la direction du mouvement
        this.targetFacingAngle = Math.atan2(mv.x, mv.z);

        // Animation procédurale de marche (balancement rétro)
        this.walkAnimTimer += dt * 14;
        this.visualRoot.position.y = Math.abs(Math.sin(this.walkAnimTimer)) * 0.12;
        this.visualRoot.rotation.z = Math.sin(this.walkAnimTimer) * 0.08;

        // Bruit de pas
        this.stepAudioTimer += dt;
        if (this.stepAudioTimer > 0.28) {
          this.stepAudioTimer = 0;
          this.audio.playStep();
        }
      } else {
        // Au repos
        this.visualRoot.position.y = 0;
        this.visualRoot.rotation.z = 0;
        this.stepAudioTimer = 0.2;
      }

      // Interpolation douce de l'orientation
      let angleDiff = this.targetFacingAngle - this.facingAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      this.facingAngle += angleDiff * Math.min(1.0, dt * 18);
      this.visualRoot.rotation.y = this.facingAngle;

      // Cinétique corporelle dynamique lors de la frappe à l'épée
      if (this.weapon.isSlashing) {
        const slashP = this.weapon.getProgress();
        if (slashP >= 0.14 && slashP < 0.64) {
          const u = (slashP - 0.14) / 0.50;
          const lunge = Math.sin(u * Math.PI);
          // Fente vers l'avant et inclinaison du torse avec le coup
          this.visualRoot.position.z = lunge * 0.16;
          this.visualRoot.rotation.x = lunge * 0.12;
          this.visualRoot.rotation.y = this.facingAngle - (1.0 - 2.0 * u) * 0.22;
        } else {
          this.visualRoot.position.z = 0;
          this.visualRoot.rotation.x = 0;
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
