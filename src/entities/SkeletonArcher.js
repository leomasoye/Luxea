import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';
import { Arrow } from './Arrow.js';

/**
 * SkeletonArcher.js — Squelette Archer de la Caverne du Gardien.
 * Conforme à AGENT.md & GDD.md :
 * - Modèle low-poly rétro articulé (crâne, cage thoracique, colonne, membres, arc + carquois).
 * - Animations complètes : patrouille/marche, visée/tension de l'arc (télégraphie lisible),
 *   tir avec recul, réaction d'impact (1er coup) et effondrement/éclatement d'os (2e coup).
 * - IA équilibrée : patrouille locale, détection du joueur, ligne de vue, maintien d'une
 *   distance d'archer (recule si Zelya approche trop, contourne les obstacles), télégraphie claire.
 * - Meurt en 2 coups d'épée, collisions propres avec le CollisionManager.
 */
export class SkeletonArcher {
  constructor(scene, parentNode, config, getGroundHeightFn) {
    this.scene = scene;
    this.parentNode = parentNode;
    this.id = config.id || 'skeleton';
    this.getGroundHeight = getGroundHeightFn || (() => 0);

    // Position initiale & zone de patrouille
    this.spawnPos = new Vector3(config.x, this.getGroundHeight(config.x, config.z), config.z);
    this.waypoints = (config.waypoints || [{ x: config.x, z: config.z }]).map(
      wp => new Vector3(wp.x, this.getGroundHeight(wp.x, wp.z), wp.z)
    );
    this.currentWaypointIdx = 0;
    this.maxLeashDist = config.leashRadius || 9.5;

    // Caractéristiques de combat (meurt en 2 coups)
    this.maxHealth = 2;
    this.health = 2;
    this.radius = 0.48;
    this.isDead = false;
    this.isDisposed = false;

    // Machine à états IA
    // 'PATROL' | 'REPOSITION' | 'AIMING' | 'COOLDOWN' | 'HURT' | 'DYING' | 'DEAD'
    this.state = 'PATROL';
    this.stateTimer = 0;
    this.patrolWaitTimer = 0.8 + Math.random() * 1.2;

    // Paramètres IA équilibrés ("intelligent mais pas trop fort")
    this.detectRange = 14.5;
    this.loseAggroRange = 18.5;
    this.preferredMinDist = 5.0;
    this.preferredMaxDist = 11.5;
    this.moveSpeed = 2.8;
    this.aimDuration = 0.90;        // Temps de télégraphie clair pour permettre l'esquive
    this.shootCooldownMin = 1.55;
    this.shootCooldownMax = 2.05;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;

    // Orientation & animation
    this.facingAngle = config.facingAngle || 0;
    this.lockedAimDir = new Vector3(0, 0, 1);
    this.walkAnimTimer = Math.random() * 5;
    this.idleAnimTimer = Math.random() * 5;
    this.hitCooldown = 0;
    this.hurtFlashTimer = 0;
    this.recoilTimer = 0;

    // Knockback
    this.knockbackVel = new Vector3(0, 0, 0);

    // Nœuds 3D
    this.root = new TransformNode(`skeleton_root_${this.id}`, this.scene);
    this.root.position.copyFrom(this.spawnPos);
    if (this.parentNode) {
      this.root.parent = this.parentNode;
    }

    this.visualRoot = new TransformNode(`skeleton_visual_${this.id}`, this.scene);
    this.visualRoot.parent = this.root;
    this.visualRoot.rotation.y = this.facingAngle;

    this.initMaterials();
    this.initMeshes();
  }

  initMaterials() {
    // Os ivoire vieilli
    this.boneMat = new StandardMaterial(`mat_skel_bone_${this.id}`, this.scene);
    this.boneMat.diffuseColor = new Color3(0.86, 0.83, 0.74);
    this.boneMat.specularColor = new Color3(0.12, 0.11, 0.09);
    this.boneMat.maxSimultaneousLights = 8;

    // Os légèrement plus sombre (articulations / côtes intérieures)
    this.boneDarkMat = new StandardMaterial(`mat_skel_bone_dark_${this.id}`, this.scene);
    this.boneDarkMat.diffuseColor = new Color3(0.62, 0.58, 0.50);
    this.boneDarkMat.specularColor = new Color3(0.06, 0.06, 0.05);
    this.boneDarkMat.maxSimultaneousLights = 8;

    // Flash d'impact (blanc/rouge)
    this.hurtMat = new StandardMaterial(`mat_skel_hurt_${this.id}`, this.scene);
    this.hurtMat.diffuseColor = new Color3(1.0, 0.32, 0.25);
    this.hurtMat.emissiveColor = new Color3(0.85, 0.15, 0.10);
    this.hurtMat.specularColor = new Color3(0, 0, 0);

    // Yeux spectraux ambrés/rouges (très lisibles dans la caverne sombre)
    this.eyeMat = new StandardMaterial(`mat_skel_eye_${this.id}`, this.scene);
    this.eyeMat.diffuseColor = new Color3(1.0, 0.42, 0.15);
    this.eyeMat.emissiveColor = new Color3(1.0, 0.35, 0.08);
    this.eyeMat.specularColor = new Color3(0, 0, 0);

    // Bois sombre pour l'arc et le carquois
    this.woodMat = new StandardMaterial(`mat_skel_wood_${this.id}`, this.scene);
    this.woodMat.diffuseColor = new Color3(0.36, 0.22, 0.11);
    this.woodMat.specularColor = new Color3(0.05, 0.04, 0.02);
    this.woodMat.maxSimultaneousLights = 8;

    // Corde d'arc
    this.stringMat = new StandardMaterial(`mat_skel_string_${this.id}`, this.scene);
    this.stringMat.diffuseColor = new Color3(0.82, 0.80, 0.72);
    this.stringMat.emissiveColor = new Color3(0.2, 0.2, 0.18);

    // Flèche encochée lumineuse (télégraphie du tir)
    this.notchedTipMat = new StandardMaterial(`mat_skel_ntip_${this.id}`, this.scene);
    this.notchedTipMat.diffuseColor = new Color3(1.0, 0.88, 0.40);
    this.notchedTipMat.emissiveColor = new Color3(1.0, 0.55, 0.12);
  }

  initMeshes() {
    this.boneMeshes = [];
    const registerBone = (mesh) => {
      this.boneMeshes.push(mesh);
      return mesh;
    };

    // --- 1. Bassin ---
    this.pelvis = registerBone(MeshBuilder.CreateBox(`skel_pelvis_${this.id}`, {
      width: 0.44, height: 0.16, depth: 0.24
    }, this.scene));
    this.pelvis.material = this.boneMat;
    this.pelvis.position.set(0, 0.66, 0);
    this.pelvis.parent = this.visualRoot;

    // --- 2. Torse (Colonne + Cage thoracique) ---
    this.torsoRoot = new TransformNode(`skel_torso_${this.id}`, this.scene);
    this.torsoRoot.position.set(0, 0.74, 0);
    this.torsoRoot.parent = this.visualRoot;

    const spine = registerBone(MeshBuilder.CreateBox(`skel_spine_${this.id}`, {
      width: 0.12, height: 0.56, depth: 0.12
    }, this.scene));
    spine.material = this.boneDarkMat;
    spine.position.set(0, 0.28, -0.03);
    spine.parent = this.torsoRoot;

    // 3 paires de côtes stylisées
    for (let r = 0; r < 3; r++) {
      const rib = registerBone(MeshBuilder.CreateBox(`skel_rib_${r}_${this.id}`, {
        width: 0.46 - r * 0.04,
        height: 0.07,
        depth: 0.26
      }, this.scene));
      rib.material = this.boneMat;
      rib.position.set(0, 0.44 - r * 0.12, 0.02);
      rib.parent = this.torsoRoot;
    }

    // Clavicules / Épaules
    const shoulders = registerBone(MeshBuilder.CreateBox(`skel_shoulders_${this.id}`, {
      width: 0.64, height: 0.09, depth: 0.16
    }, this.scene));
    shoulders.material = this.boneMat;
    shoulders.position.set(0, 0.54, 0);
    shoulders.parent = this.torsoRoot;

    // Carquois dans le dos
    const quiver = MeshBuilder.CreateCylinder(`skel_quiver_${this.id}`, {
      height: 0.52,
      diameterTop: 0.18,
      diameterBottom: 0.12,
      tessellation: 6
    }, this.scene);
    quiver.material = this.woodMat;
    quiver.position.set(-0.10, 0.34, -0.18);
    quiver.rotation.z = 0.28;
    quiver.parent = this.torsoRoot;

    // --- 3. Crâne articulé ---
    this.headRoot = new TransformNode(`skel_head_root_${this.id}`, this.scene);
    this.headRoot.position.set(0, 0.64, 0.02);
    this.headRoot.parent = this.torsoRoot;

    const cranium = registerBone(MeshBuilder.CreateBox(`skel_cranium_${this.id}`, {
      width: 0.42, height: 0.36, depth: 0.40
    }, this.scene));
    cranium.material = this.boneMat;
    cranium.position.set(0, 0.20, 0);
    cranium.parent = this.headRoot;

    const jaw = registerBone(MeshBuilder.CreateBox(`skel_jaw_${this.id}`, {
      width: 0.28, height: 0.12, depth: 0.26
    }, this.scene));
    jaw.material = this.boneDarkMat;
    jaw.position.set(0, -0.02, 0.05);
    jaw.parent = this.headRoot;

    // Orbites sombres + yeux spectraux brillants
    const eyeL = MeshBuilder.CreateBox(`skel_eye_l_${this.id}`, { width: 0.09, height: 0.08, depth: 0.04 }, this.scene);
    eyeL.material = this.eyeMat;
    eyeL.position.set(-0.10, 0.20, 0.20);
    eyeL.parent = this.headRoot;

    const eyeR = MeshBuilder.CreateBox(`skel_eye_r_${this.id}`, { width: 0.09, height: 0.08, depth: 0.04 }, this.scene);
    eyeR.material = this.eyeMat;
    eyeR.position.set(0.10, 0.20, 0.20);
    eyeR.parent = this.headRoot;

    // --- 4. Jambes articulées ---
    this.legLRoot = new TransformNode(`skel_leg_l_${this.id}`, this.scene);
    this.legLRoot.position.set(-0.15, 0.60, 0);
    this.legLRoot.parent = this.visualRoot;

    const legLBone = registerBone(MeshBuilder.CreateBox(`skel_leg_l_b_${this.id}`, {
      width: 0.11, height: 0.56, depth: 0.11
    }, this.scene));
    legLBone.material = this.boneMat;
    legLBone.position.set(0, -0.28, 0);
    legLBone.parent = this.legLRoot;

    const footL = registerBone(MeshBuilder.CreateBox(`skel_foot_l_${this.id}`, {
      width: 0.14, height: 0.08, depth: 0.22
    }, this.scene));
    footL.material = this.boneDarkMat;
    footL.position.set(0, -0.56, 0.05);
    footL.parent = this.legLRoot;

    this.legRRoot = new TransformNode(`skel_leg_r_${this.id}`, this.scene);
    this.legRRoot.position.set(0.15, 0.60, 0);
    this.legRRoot.parent = this.visualRoot;

    const legRBone = registerBone(MeshBuilder.CreateBox(`skel_leg_r_b_${this.id}`, {
      width: 0.11, height: 0.56, depth: 0.11
    }, this.scene));
    legRBone.material = this.boneMat;
    legRBone.position.set(0, -0.28, 0);
    legRBone.parent = this.legRRoot;

    const footR = registerBone(MeshBuilder.CreateBox(`skel_foot_r_${this.id}`, {
      width: 0.14, height: 0.08, depth: 0.22
    }, this.scene));
    footR.material = this.boneDarkMat;
    footR.position.set(0, -0.56, 0.05);
    footR.parent = this.legRRoot;

    // --- 5. Bras articulés (Bras gauche porte l'arc, bras droit bande la corde) ---
    this.armLRoot = new TransformNode(`skel_arm_l_${this.id}`, this.scene);
    this.armLRoot.position.set(-0.36, 0.52, 0);
    this.armLRoot.parent = this.torsoRoot;

    const armLBone = registerBone(MeshBuilder.CreateBox(`skel_arm_l_b_${this.id}`, {
      width: 0.10, height: 0.50, depth: 0.10
    }, this.scene));
    armLBone.material = this.boneMat;
    armLBone.position.set(0, -0.24, 0);
    armLBone.parent = this.armLRoot;

    this.armRRoot = new TransformNode(`skel_arm_r_${this.id}`, this.scene);
    this.armRRoot.position.set(0.36, 0.52, 0);
    this.armRRoot.parent = this.torsoRoot;

    const armRBone = registerBone(MeshBuilder.CreateBox(`skel_arm_r_b_${this.id}`, {
      width: 0.10, height: 0.50, depth: 0.10
    }, this.scene));
    armRBone.material = this.boneMat;
    armRBone.position.set(0, -0.24, 0);
    armRBone.parent = this.armRRoot;

    // --- 6. Arc en bois (attaché à la main gauche) ---
    this.bowRoot = new TransformNode(`skel_bow_${this.id}`, this.scene);
    this.bowRoot.position.set(0, -0.48, 0.12);
    this.bowRoot.rotation.x = Math.PI / 2;
    this.bowRoot.parent = this.armLRoot;

    const bowGrip = MeshBuilder.CreateBox(`skel_bow_grip_${this.id}`, {
      width: 0.07, height: 0.24, depth: 0.08
    }, this.scene);
    bowGrip.material = this.woodMat;
    bowGrip.parent = this.bowRoot;

    const bowTop = MeshBuilder.CreateBox(`skel_bow_top_${this.id}`, {
      width: 0.06, height: 0.44, depth: 0.06
    }, this.scene);
    bowTop.material = this.woodMat;
    bowTop.position.set(0, 0.28, -0.10);
    bowTop.rotation.x = 0.42;
    bowTop.parent = this.bowRoot;

    const bowBot = MeshBuilder.CreateBox(`skel_bow_bot_${this.id}`, {
      width: 0.06, height: 0.44, depth: 0.06
    }, this.scene);
    bowBot.material = this.woodMat;
    bowBot.position.set(0, -0.28, -0.10);
    bowBot.rotation.x = -0.42;
    bowBot.parent = this.bowRoot;

    this.bowString = MeshBuilder.CreateBox(`skel_bow_str_${this.id}`, {
      width: 0.02, height: 0.90, depth: 0.02
    }, this.scene);
    this.bowString.material = this.stringMat;
    this.bowString.position.set(0, 0, -0.22);
    this.bowString.parent = this.bowRoot;

    // Flèche encochée (visible uniquement pendant la visée)
    this.notchedArrow = new TransformNode(`skel_notched_arrow_${this.id}`, this.scene);
    this.notchedArrow.position.set(0, 0, 0.05);
    this.notchedArrow.parent = this.bowRoot;

    const nShaft = MeshBuilder.CreateBox(`skel_na_shaft_${this.id}`, {
      width: 0.05, height: 0.05, depth: 0.72
    }, this.scene);
    nShaft.material = this.woodMat;
    nShaft.parent = this.notchedArrow;

    const nTip = MeshBuilder.CreateCylinder(`skel_na_tip_${this.id}`, {
      height: 0.20, diameterTop: 0.01, diameterBottom: 0.15, tessellation: 4
    }, this.scene);
    nTip.material = this.notchedTipMat;
    nTip.rotation.x = Math.PI / 2;
    nTip.position.z = 0.40;
    nTip.parent = this.notchedArrow;

    this.notchedArrow.setEnabled(false);

    // --- 7. Blob-Shadow rétro au sol ---
    const shadowMat = new StandardMaterial(`mat_skel_shadow_${this.id}`, this.scene);
    shadowMat.diffuseColor = new Color3(0, 0, 0);
    shadowMat.alpha = 0.36;
    shadowMat.freeze();

    this.shadowDisc = MeshBuilder.CreateDisc(`skel_shadow_${this.id}`, {
      radius: 0.56, tessellation: 14
    }, this.scene);
    this.shadowDisc.rotation.x = Math.PI / 2;
    this.shadowDisc.position.y = 0.03;
    this.shadowDisc.material = shadowMat;
    this.shadowDisc.parent = this.root;
  }

  getPosition() {
    return this.root.position;
  }

  /**
   * Retourne le collider dynamique tant que le squelette est vivant.
   */
  getCollider() {
    if (this.isDead || this.state === 'DYING' || this.state === 'DEAD') return null;
    return {
      type: 'circle',
      x: this.root.position.x,
      z: this.root.position.z,
      radius: this.radius,
      tag: `skeleton_${this.id}`,
      zone: 'cavern'
    };
  }

  /**
   * Vérifie si un coup d'épée de Zelya touche ce squelette.
   */
  checkSwordHit(playerPos, playerFacingAngle, weapon, cameraManager = null) {
    if (this.isDead || this.state === 'DYING' || this.state === 'DEAD') return false;
    if (this.hitCooldown > 0) return false;

    // Tolérance verticale (pour éviter de frapper à travers la falaise)
    if (Math.abs(playerPos.y - this.root.position.y) > 1.3) return false;

    const hit = weapon.checkHit(playerPos, playerFacingAngle, this.root.position, this.radius + 0.15, weapon.isRollSlashing);
    if (!hit) return false;

    this.takeDamage(weapon.damage || 1, playerPos, cameraManager);
    return true;
  }

  takeDamage(amount, attackerPos, cameraManager = null) {
    if (this.isDead || this.state === 'DYING') return;

    this.health = Math.max(0, this.health - amount);
    this.hitCooldown = 0.32;
    this.hurtFlashTimer = 0.26;
    this.notchedArrow.setEnabled(false);

    // Direction du recul depuis Zelya vers le squelette
    const dx = this.root.position.x - attackerPos.x;
    const dz = this.root.position.z - attackerPos.z;
    const dist = Math.hypot(dx, dz) || 1.0;
    const nx = dx / dist;
    const nz = dz / dist;

    this.knockbackVel.set(nx * 9.0, 0, nz * 9.0);

    if (cameraManager) {
      cameraManager.shake(0.16, 0.16);
    }

    this.spawnBoneParticles(this.health <= 0 ? 12 : 6, nx, nz);

    if (this.health <= 0) {
      this.state = 'DYING';
      this.stateTimer = 0.65;
      this.isDead = true;
    } else {
      this.state = 'HURT';
      this.stateTimer = 0.38;
      // Changer légèrement la couleur des yeux pour montrer qu'il est fissuré (1 PV restant)
      this.eyeMat.emissiveColor.set(1.0, 0.12, 0.05);
    }
  }

  spawnBoneParticles(count, nx, nz) {
    const pMat = new StandardMaterial(`mat_bone_shard_${this.id}`, this.scene);
    pMat.diffuseColor = new Color3(0.90, 0.86, 0.76);
    pMat.emissiveColor = new Color3(0.20, 0.18, 0.14);
    pMat.specularColor = new Color3(0, 0, 0);

    const origin = this.root.position.clone();
    origin.y += 1.0;

    for (let i = 0; i < count; i++) {
      const shard = MeshBuilder.CreateBox('bone_shard', {
        width: 0.10 + Math.random() * 0.08,
        height: 0.08,
        depth: 0.16 + Math.random() * 0.10
      }, this.scene);
      shard.material = pMat;
      shard.position.set(
        origin.x + (Math.random() - 0.5) * 0.4,
        origin.y + (Math.random() - 0.5) * 0.4,
        origin.z + (Math.random() - 0.5) * 0.4
      );

      const vx = nx * 2.4 + (Math.random() - 0.5) * 3.8;
      let vy = 2.2 + Math.random() * 2.4;
      const vz = nz * 2.4 + (Math.random() - 0.5) * 3.8;
      let life = 0.55;

      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = 0.016;
        life -= dt;
        vy -= 9.5 * dt;
        shard.position.x += vx * dt;
        shard.position.y = Math.max(this.root.position.y + 0.05, shard.position.y + vy * dt);
        shard.position.z += vz * dt;
        shard.rotation.x += 7 * dt;
        shard.rotation.y += 6 * dt;

        const s = Math.max(0.01, life / 0.55);
        shard.scaling.set(s, s, s);

        if (life <= 0) {
          this.scene.onBeforeRenderObservable.remove(obs);
          shard.dispose();
          if (i === count - 1 && pMat) pMat.dispose();
        }
      });
    }
  }

  /**
   * Vérifie si la ligne de vue entre le squelette et le joueur est dégagée des murs statiques.
   */
  hasLineOfSight(playerPos, collisionManager) {
    if (!collisionManager) return true;

    const startX = this.root.position.x;
    const startZ = this.root.position.z;
    const dx = playerPos.x - startX;
    const dz = playerPos.z - startZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.5) return true;

    const steps = Math.ceil(dist / 0.65);
    const colliders = collisionManager.staticColliders;
    const zone = collisionManager.currentZone;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = startX + dx * t;
      const pz = startZ + dz * t;
      const py = this.root.position.y + 1.15 + (playerPos.y - this.root.position.y) * t;

      for (let i = 0; i < colliders.length; i++) {
        const col = colliders[i];
        if (col.zone && col.zone !== zone) continue;
        // Les parapets bas et bordures de rampe ne bloquent pas la vue
        if (col.tag && (col.tag.startsWith('terrace_parapet') || col.tag.startsWith('ramp_curb') || col.tag.startsWith('torch_'))) {
          continue;
        }
        if (col.type === 'box') {
          if (px >= col.minX && px <= col.maxX && pz >= col.minZ && pz <= col.maxZ) {
            return false;
          }
        } else if (col.type === 'circle') {
          const cdx = px - col.x;
          const cdz = pz - col.z;
          if (cdx * cdx + cdz * cdz < (col.radius * 0.85) * (col.radius * 0.85)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Déplace le squelette en résolvant les collisions contre les obstacles statiques de la caverne.
   */
  moveWithCollision(dx, dz, collisionManager) {
    const newX = this.root.position.x + dx;
    const newZ = this.root.position.z + dz;

    // Vérifier qu'on ne sort pas trop loin de la zone d'origine (évite de tomber de la terrasse ou se perdre)
    const distFromSpawn = Math.hypot(newX - this.spawnPos.x, newZ - this.spawnPos.z);
    if (distFromSpawn > this.maxLeashDist) {
      return;
    }

    // Empêcher un squelette de changer brutalement d'altitude (ex: tomber de la falaise)
    const curY = this.getGroundHeight(this.root.position.x, this.root.position.z);
    const nextY = this.getGroundHeight(newX, newZ);
    if (Math.abs(nextY - curY) > 0.65) {
      return;
    }

    if (collisionManager) {
      const pos = { x: newX, z: newZ };
      const staticOnly = collisionManager.staticColliders.filter(c => !c.zone || c.zone === 'cavern');
      collisionManager.resolveCircleAll(pos, this.radius, staticOnly);
      this.root.position.x = pos.x;
      this.root.position.z = pos.z;
    } else {
      this.root.position.x = newX;
      this.root.position.z = newZ;
    }

    this.root.position.y = this.getGroundHeight(this.root.position.x, this.root.position.z);
  }

  rotateToward(targetAngle, dt, speed = 8.0) {
    let diff = targetAngle - this.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facingAngle += diff * Math.min(1.0, dt * speed);
    this.visualRoot.rotation.y = this.facingAngle;
  }

  /**
   * Boucle de mise à jour IA + Animations complètes.
   */
  update(dt, player, collisionManager, onFireArrow) {
    if (this.state === 'DEAD') return;

    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.recoilTimer > 0) this.recoilTimer -= dt;

    // Flash visuel de dégâts
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= dt;
      const flash = Math.floor(this.hurtFlashTimer * 24) % 2 === 0;
      const mat = flash ? this.hurtMat : this.boneMat;
      for (let i = 0; i < this.boneMeshes.length; i++) {
        this.boneMeshes[i].material = mat;
      }
    } else if (this.state !== 'DYING') {
      for (let i = 0; i < this.boneMeshes.length; i++) {
        this.boneMeshes[i].material = this.boneMat;
      }
    }

    // --- ÉTAT : DYING (Animation de mort / effondrement) ---
    if (this.state === 'DYING') {
      this.stateTimer -= dt;
      const progress = 1.0 - Math.max(0, this.stateTimer / 0.65);

      // Chute vers l'arrière + aplatissement/disparition
      this.visualRoot.rotation.x = -progress * (Math.PI * 0.48);
      this.visualRoot.position.y = -progress * 0.45;
      const scale = Math.max(0.01, 1.0 - Math.pow(progress, 2.2));
      this.visualRoot.scaling.set(scale, scale, scale);

      if (this.shadowDisc) {
        this.shadowDisc.scaling.set(scale, scale, scale);
      }

      if (this.stateTimer <= 0) {
        this.state = 'DEAD';
        this.root.setEnabled(false);
      }
      return;
    }

    // --- ÉTAT : HURT (Recul & étourdissement après 1er coup) ---
    if (this.state === 'HURT') {
      this.stateTimer -= dt;
      const decay = Math.max(0, this.stateTimer / 0.38);
      this.moveWithCollision(this.knockbackVel.x * decay * dt, this.knockbackVel.z * decay * dt, collisionManager);

      // Posture de recul
      this.torsoRoot.rotation.x = -0.35 * decay;
      this.headRoot.rotation.x = -0.25 * decay;

      if (this.stateTimer <= 0) {
        this.torsoRoot.rotation.x = 0;
        this.headRoot.rotation.x = 0;
        this.state = 'COOLDOWN';
        this.stateTimer = 0.75;
      }
      return;
    }

    const pPos = player ? player.getPosition() : null;
    const dxP = pPos ? pPos.x - this.root.position.x : 999;
    const dzP = pPos ? pPos.z - this.root.position.z : 999;
    const distToPlayer = Math.hypot(dxP, dzP);
    const angleToPlayer = Math.atan2(dxP, dzP);
    const canSeePlayer = pPos && distToPlayer <= this.detectRange && this.hasLineOfSight(pPos, collisionManager);

    let isWalking = false;

    // --- ÉTAT : PATROL ---
    if (this.state === 'PATROL') {
      this.notchedArrow.setEnabled(false);

      if (canSeePlayer) {
        this.state = 'REPOSITION';
        this.stateTimer = 0.5;
      } else if (this.waypoints.length > 1) {
        if (this.patrolWaitTimer > 0) {
          this.patrolWaitTimer -= dt;
        } else {
          const wp = this.waypoints[this.currentWaypointIdx];
          const wdx = wp.x - this.root.position.x;
          const wdz = wp.z - this.root.position.z;
          const wDist = Math.hypot(wdx, wdz);

          if (wDist < 0.45) {
            this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
            this.patrolWaitTimer = 1.2 + Math.random() * 1.4;
          } else {
            const wpAngle = Math.atan2(wdx, wdz);
            this.rotateToward(wpAngle, dt, 5.5);
            const step = this.moveSpeed * 0.65 * dt;
            this.moveWithCollision((wdx / wDist) * step, (wdz / wDist) * step, collisionManager);
            isWalking = true;
          }
        }
      }
    }
    // --- ÉTAT : REPOSITION (Maintient sa distance d'archer) ---
    else if (this.state === 'REPOSITION') {
      this.notchedArrow.setEnabled(false);

      if (!pPos || distToPlayer > this.loseAggroRange) {
        this.state = 'PATROL';
      } else {
        this.rotateToward(angleToPlayer, dt, 7.5);
        this.stateTimer -= dt;

        const hasLOS = this.hasLineOfSight(pPos, collisionManager);

        if (distToPlayer < this.preferredMinDist) {
          // Trop proche : recule en diagonale
          const backX = -dxP / distToPlayer;
          const backZ = -dzP / distToPlayer;
          const perpX = -backZ * this.strafeDir * 0.45;
          const perpZ = backX * this.strafeDir * 0.45;
          const len = Math.hypot(backX + perpX, backZ + perpZ) || 1;
          this.moveWithCollision(((backX + perpX) / len) * this.moveSpeed * dt, ((backZ + perpZ) / len) * this.moveSpeed * dt, collisionManager);
          isWalking = true;
        } else if (!hasLOS || distToPlayer > this.preferredMaxDist) {
          // Trop loin ou bloqué : avance / contourne
          const fwdX = dxP / distToPlayer;
          const fwdZ = dzP / distToPlayer;
          const perpX = -fwdZ * this.strafeDir * 0.55;
          const perpZ = fwdX * this.strafeDir * 0.55;
          const len = Math.hypot(fwdX + perpX, fwdZ + perpZ) || 1;
          this.moveWithCollision(((fwdX + perpX) / len) * this.moveSpeed * dt, ((fwdZ + perpZ) / len) * this.moveSpeed * dt, collisionManager);
          isWalking = true;
        }

        // Prêt à viser et tirer dès qu'on a une ligne de vue et une bonne distance
        if (hasLOS && this.stateTimer <= 0 && distToPlayer <= this.preferredMaxDist + 1.5) {
          this.state = 'AIMING';
          this.stateTimer = this.aimDuration;
          this.notchedArrow.setEnabled(true);
        }
      }
    }
    // --- ÉTAT : AIMING (Télégraphie claire + tension de l'arc) ---
    else if (this.state === 'AIMING') {
      if (!pPos || distToPlayer > this.loseAggroRange) {
        this.notchedArrow.setEnabled(false);
        this.state = 'PATROL';
      } else {
        this.stateTimer -= dt;
        const progress = 1.0 - Math.max(0, this.stateTimer / this.aimDuration);

        // Suit Zelya pendant les 70% premiers de la visée, puis verrouille la trajectoire (esquivable !)
        if (progress < 0.72) {
          this.rotateToward(angleToPlayer, dt, 9.0);
          const originY = this.root.position.y + 1.15;
          const targetY = pPos.y + 0.95;
          this.lockedAimDir.set(
            pPos.x - this.root.position.x,
            targetY - originY,
            pPos.z - this.root.position.z
          ).normalize();
        }

        if (this.stateTimer <= 0) {
          // TIR DE LA FLÈCHE !
          this.notchedArrow.setEnabled(false);
          this.recoilTimer = 0.22;

          if (typeof onFireArrow === 'function') {
            const origin = new Vector3(
              this.root.position.x + Math.sin(this.facingAngle) * 0.55,
              this.root.position.y + 1.15,
              this.root.position.z + Math.cos(this.facingAngle) * 0.55
            );
            const arrow = new Arrow(this.scene, this.parentNode, origin, this.lockedAimDir, {
              speed: 11.5,
              damage: 1
            });
            onFireArrow(arrow);
          }

          this.strafeDir = Math.random() < 0.5 ? 1 : -1;
          this.state = 'COOLDOWN';
          this.stateTimer = this.shootCooldownMin + Math.random() * (this.shootCooldownMax - this.shootCooldownMin);
        }
      }
    }
    // --- ÉTAT : COOLDOWN (Récupération entre deux tirs) ---
    else if (this.state === 'COOLDOWN') {
      this.notchedArrow.setEnabled(false);
      this.stateTimer -= dt;

      if (pPos && distToPlayer <= this.loseAggroRange) {
        this.rotateToward(angleToPlayer, dt, 5.5);
      }

      if (this.stateTimer <= 0) {
        this.state = (pPos && distToPlayer <= this.loseAggroRange) ? 'REPOSITION' : 'PATROL';
        this.stateTimer = 0.45;
      }
    }

    // --- ANIMATIONS COMPLÈTES DU SQUELETTE ---
    this.updateAnimations(dt, isWalking);
  }

  updateAnimations(dt, isWalking) {
    this.idleAnimTimer += dt * 3.0;

    // 1. Jambes & marche
    if (isWalking) {
      this.walkAnimTimer += dt * 9.5;
      const swing = Math.sin(this.walkAnimTimer) * 0.58;
      this.legLRoot.rotation.x = swing;
      this.legRRoot.rotation.x = -swing;
      this.visualRoot.position.y = Math.abs(Math.sin(this.walkAnimTimer)) * 0.06;
    } else {
      this.legLRoot.rotation.x *= 0.85;
      this.legRRoot.rotation.x *= 0.85;
      this.visualRoot.position.y = Math.sin(this.idleAnimTimer) * 0.025;
    }

    // 2. Bras, Arc & Torse selon l'état
    if (this.state === 'AIMING') {
      const drawProgress = 1.0 - Math.max(0, this.stateTimer / this.aimDuration);
      // Bras gauche tendu en avant portant l'arc
      this.armLRoot.rotation.x = -1.48;
      this.armLRoot.rotation.y = 0.25;
      this.armLRoot.rotation.z = 0.08;

      // Bras droit tirant la corde vers l'arrière
      this.armRRoot.rotation.x = -1.42 + drawProgress * 0.35;
      this.armRRoot.rotation.y = -0.45;
      this.armRRoot.rotation.z = -0.15;

      // Corde & flèche qui se tendent
      this.bowString.position.z = -0.22 - drawProgress * 0.22;
      this.notchedArrow.position.z = 0.05 - drawProgress * 0.22;

      // Légère torsion du buste d'archer
      this.torsoRoot.rotation.y = 0.25;
      this.headRoot.rotation.y = -0.22;
    } else if (this.recoilTimer > 0) {
      // Recul vif juste après avoir décoché la flèche
      const r = this.recoilTimer / 0.22;
      this.armLRoot.rotation.x = -1.48 - r * 0.22;
      this.armRRoot.rotation.x = -0.65;
      this.torsoRoot.rotation.x = -0.14 * r;
      this.bowString.position.z = -0.22;
    } else {
      // Posture de garde / patrouille
      const armSwing = isWalking ? Math.sin(this.walkAnimTimer) * 0.35 : Math.sin(this.idleAnimTimer) * 0.06;
      this.armLRoot.rotation.x = -0.45 - armSwing * 0.5;
      this.armLRoot.rotation.y = 0.12;
      this.armLRoot.rotation.z = 0.08;

      this.armRRoot.rotation.x = -0.15 + armSwing;
      this.armRRoot.rotation.y = 0;
      this.armRRoot.rotation.z = -0.08;

      this.bowString.position.z = -0.22;
      this.torsoRoot.rotation.x = 0;
      this.torsoRoot.rotation.y = 0;
      this.headRoot.rotation.y = Math.sin(this.idleAnimTimer * 0.7) * 0.12;
    }
  }

  /**
   * Réinitialise le squelette (ex: lors d'un respawn du joueur).
   */
  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.state = 'PATROL';
    this.stateTimer = 0;
    this.hitCooldown = 0;
    this.hurtFlashTimer = 0;
    this.recoilTimer = 0;
    this.eyeMat.emissiveColor.set(1.0, 0.35, 0.08);

    this.root.position.copyFrom(this.spawnPos);
    this.root.setEnabled(true);
    this.visualRoot.position.set(0, 0, 0);
    this.visualRoot.rotation.set(0, this.facingAngle, 0);
    this.visualRoot.scaling.set(1, 1, 1);
    if (this.shadowDisc) this.shadowDisc.scaling.set(1, 1, 1);
    if (this.notchedArrow) this.notchedArrow.setEnabled(false);
  }

  dispose() {
    this.isDisposed = true;
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
  }
}
