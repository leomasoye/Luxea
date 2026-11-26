import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode
} from '@babylonjs/core';

/**
 * Construit le modèle 3D de l'Épée Légendaire Bleue (partagé entre le socle de la forêt et la main de Zelya).
 */
export function buildLegendarySwordMeshes(scene, parentNode, prefix = 'leg_sword') {
  const swordGroup = new TransformNode(`${prefix}_group`, scene);
  if (parentNode) {
    swordGroup.parent = parentNode;
  }

  // Matériaux nobles bleu royal / azur lumineux / or céleste
  const bladeBlueMat = new StandardMaterial(`${prefix}_mat_blade`, scene);
  bladeBlueMat.diffuseColor = new Color3(0.28, 0.68, 1.0);
  bladeBlueMat.emissiveColor = new Color3(0.10, 0.36, 0.72);
  bladeBlueMat.specularColor = new Color3(0.85, 0.96, 1.0);

  const coreCyanMat = new StandardMaterial(`${prefix}_mat_core`, scene);
  coreCyanMat.diffuseColor = new Color3(0.75, 0.97, 1.0);
  coreCyanMat.emissiveColor = new Color3(0.42, 0.88, 1.0);
  coreCyanMat.specularColor = new Color3(1.0, 1.0, 1.0);

  const guardRoyalMat = new StandardMaterial(`${prefix}_mat_guard`, scene);
  guardRoyalMat.diffuseColor = new Color3(0.14, 0.32, 0.78);
  guardRoyalMat.emissiveColor = new Color3(0.05, 0.14, 0.38);
  guardRoyalMat.specularColor = new Color3(0.65, 0.82, 1.0);

  const goldTrimMat = new StandardMaterial(`${prefix}_mat_gold`, scene);
  goldTrimMat.diffuseColor = new Color3(0.96, 0.82, 0.32);
  goldTrimMat.emissiveColor = new Color3(0.32, 0.24, 0.05);
  goldTrimMat.specularColor = new Color3(1.0, 0.92, 0.55);

  const gripMat = new StandardMaterial(`${prefix}_mat_grip`, scene);
  gripMat.diffuseColor = new Color3(0.10, 0.20, 0.48);
  gripMat.specularColor = new Color3(0.25, 0.35, 0.60);

  // 1. Pommeau doré facetté
  const pommel = MeshBuilder.CreateCylinder(`${prefix}_pommel`, {
    height: 0.12,
    diameterTop: 0.14,
    diameterBottom: 0.06,
    tessellation: 6
  }, scene);
  pommel.material = goldTrimMat;
  pommel.position.y = -0.02;
  pommel.parent = swordGroup;

  // 2. Poignée bleu nuit gainée
  const handle = MeshBuilder.CreateCylinder(`${prefix}_handle`, {
    height: 0.36,
    diameter: 0.088,
    tessellation: 8
  }, scene);
  handle.material = gripMat;
  handle.position.y = 0.17;
  handle.parent = swordGroup;

  // Bague dorée centrale de poignée
  const gripRing = MeshBuilder.CreateCylinder(`${prefix}_grip_ring`, {
    height: 0.05,
    diameter: 0.105,
    tessellation: 8
  }, scene);
  gripRing.material = goldTrimMat;
  gripRing.position.y = 0.18;
  gripRing.parent = swordGroup;

  // 3. Garde ailée royale (style Master Sword rétro low-poly)
  const guardCenter = MeshBuilder.CreateBox(`${prefix}_guard_center`, {
    width: 0.26,
    height: 0.14,
    depth: 0.15
  }, scene);
  guardCenter.material = guardRoyalMat;
  guardCenter.position.y = 0.37;
  guardCenter.parent = swordGroup;

  const wingL = MeshBuilder.CreateBox(`${prefix}_wing_l`, {
    width: 0.28,
    height: 0.09,
    depth: 0.11
  }, scene);
  wingL.material = guardRoyalMat;
  wingL.position.set(-0.22, 0.42, 0);
  wingL.rotation.z = -0.42;
  wingL.parent = swordGroup;

  const wingR = MeshBuilder.CreateBox(`${prefix}_wing_r`, {
    width: 0.28,
    height: 0.09,
    depth: 0.11
  }, scene);
  wingR.material = guardRoyalMat;
  wingR.position.set(0.22, 0.42, 0);
  wingR.rotation.z = 0.42;
  wingR.parent = swordGroup;

  const wingTipL = MeshBuilder.CreateBox(`${prefix}_wing_tip_l`, {
    width: 0.12,
    height: 0.07,
    depth: 0.09
  }, scene);
  wingTipL.material = goldTrimMat;
  wingTipL.position.set(-0.34, 0.49, 0);
  wingTipL.rotation.z = -0.75;
  wingTipL.parent = swordGroup;

  const wingTipR = MeshBuilder.CreateBox(`${prefix}_wing_tip_r`, {
    width: 0.12,
    height: 0.07,
    depth: 0.09
  }, scene);
  wingTipR.material = goldTrimMat;
  wingTipR.position.set(0.34, 0.49, 0);
  wingTipR.rotation.z = 0.75;
  wingTipR.parent = swordGroup;

  // 4. Gemme saphir lumineuse au cœur de la garde
  const gem = MeshBuilder.CreateSphere(`${prefix}_gem`, {
    diameter: 0.15,
    segments: 6
  }, scene);
  gem.material = coreCyanMat;
  gem.scaling.set(0.85, 1.15, 0.75);
  gem.position.set(0, 0.38, 0.07);
  gem.parent = swordGroup;

  // 5. Base sculptée de la lame (ricasso doré)
  const ricasso = MeshBuilder.CreateBox(`${prefix}_ricasso`, {
    width: 0.21,
    height: 0.16,
    depth: 0.07
  }, scene);
  ricasso.material = goldTrimMat;
  ricasso.position.y = 0.49;
  ricasso.parent = swordGroup;

  // 6. Grande lame d'azur lumineuse
  const blade = MeshBuilder.CreateBox(`${prefix}_blade`, {
    width: 0.19,
    height: 1.02,
    depth: 0.055
  }, scene);
  blade.material = bladeBlueMat;
  blade.position.y = 1.04;
  blade.parent = swordGroup;

  // Cœur énergétique cyan courant le long de la lame
  const bladeCore = MeshBuilder.CreateBox(`${prefix}_blade_core`, {
    width: 0.065,
    height: 1.00,
    depth: 0.068
  }, scene);
  bladeCore.material = coreCyanMat;
  bladeCore.position.y = 1.04;
  bladeCore.parent = swordGroup;

  // Pointe effilée facettée en diamant
  const bladeTip = MeshBuilder.CreateCylinder(`${prefix}_blade_tip`, {
    height: 0.28,
    diameterTop: 0.01,
    diameterBottom: 0.22,
    tessellation: 4
  }, scene);
  bladeTip.material = bladeBlueMat;
  bladeTip.scaling.set(1.0, 1.0, 0.35);
  bladeTip.rotation.y = Math.PI / 4;
  bladeTip.position.y = 1.68;
  bladeTip.parent = swordGroup;

  return {
    root: swordGroup,
    bladeMesh: blade,
    coreMesh: bladeCore,
    coreMat: coreCyanMat,
    bladeMat: bladeBlueMat
  };
}

/**
 * Weapon.js — Épée courte de Zelya & Épée Légendaire Bleue.
 * Conforme à AGENT.md & GDD.md :
 * - Modèle low-poly original avec gemme lumineuse.
 * - Remplacement complet par l'Épée Légendaire Bleue (plus belle, plus puissante, plus maniable).
 * - Arc de cercle tranchant (sweep ~180°) & attaque acrobatique pendant la roulade.
 * - Hitbox circulaire sectorielle.
 */
export class Weapon {
  constructor(scene, parentNode, handSocket = null) {
    this.scene = scene;
    this.parentNode = parentNode;

    this.root = new TransformNode('WeaponRoot', this.scene);
    if (handSocket) {
      this.root.parent = handSocket;
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.parent = parentNode;
      this.setRestPose();
    }

    this.defaultSwordNode = null;
    this.legendarySwordNode = null;
    this.bladeMesh = null;
    this.trailMesh = null;
    this.trailMat = null;
    this.basePath = [];
    this.tipPath = [];
    this.tipNode = null;

    // Caractéristiques de l'arme (améliorées avec l'Épée Légendaire)
    this.isLegendary = false;
    this.damage = 1;
    this.hitRange = 2.2;

    this.isSlashing = false;
    this.slashTimer = 0;
    this.slashDuration = 0.30; // Durée de l'animation d'attaque complète (windup + frappe + recovery)

    // Coup d'épée intégré à la roulade (Épée Légendaire uniquement)
    this.isRollSlashing = false;
    this.rollSlashTimer = 0;
    this.rollSlashDuration = 0.38;

    this.initMeshes();
  }

  attachToHand(handSocket) {
    if (!handSocket) return;
    this.root.parent = handSocket;
    this.root.position.set(0, -0.15, 0);
    this.root.rotation.set(0, 0, 0);
  }

  initMeshes() {
    // --- A. ÉPÉE DE DÉPART ---
    this.defaultSwordNode = new TransformNode('DefaultSwordGroup', this.scene);
    this.defaultSwordNode.parent = this.root;

    // 1. Matériaux de l'épée
    const steelMat = new StandardMaterial('mat_steel', this.scene);
    steelMat.diffuseColor = new Color3(0.88, 0.92, 0.98);
    steelMat.specularColor = new Color3(0.9, 0.9, 1.0);

    const goldMat = new StandardMaterial('mat_guard', this.scene);
    goldMat.diffuseColor = new Color3(0.9, 0.75, 0.2);
    goldMat.specularColor = new Color3(0.8, 0.6, 0.1);

    const gemMat = new StandardMaterial('mat_gem', this.scene);
    gemMat.diffuseColor = new Color3(0.4, 0.85, 1.0);
    gemMat.emissiveColor = new Color3(0.3, 0.7, 1.0);

    // 2. Poignée (centrée au creux de la main)
    const handle = MeshBuilder.CreateCylinder('swordHandle', {
      height: 0.35,
      diameter: 0.08
    }, this.scene);
    handle.material = goldMat;
    handle.parent = this.defaultSwordNode;
    handle.position.y = 0.15;

    // 3. Garde (repose juste au-dessus des phalanges)
    const guard = MeshBuilder.CreateBox('swordGuard', {
      width: 0.42,
      height: 0.08,
      depth: 0.12
    }, this.scene);
    guard.material = goldMat;
    guard.parent = this.defaultSwordNode;
    guard.position.y = 0.35;

    // 4. Lame d'acier biseautée
    this.bladeMesh = MeshBuilder.CreateBox('swordBlade', {
      width: 0.16,
      height: 1.0,
      depth: 0.05
    }, this.scene);
    this.bladeMesh.material = steelMat;
    this.bladeMesh.parent = this.defaultSwordNode;
    this.bladeMesh.position.y = 0.90;

    // 5. Gemme incrustée dans la garde (source de l'énergie lumineuse)
    const gem = MeshBuilder.CreateSphere('swordGem', {
      diameter: 0.12
    }, this.scene);
    gem.material = gemMat;
    gem.parent = this.defaultSwordNode;
    gem.position.y = 0.35;
    gem.position.z = 0.05;

    // --- B. ÉPÉE LÉGENDAIRE BLEUE (masquée tant qu'elle n'est pas obtenue) ---
    const legendary = buildLegendarySwordMeshes(this.scene, this.root, 'zelya_leg_sword');
    this.legendarySwordNode = legendary.root;
    this.legendarySwordNode.setEnabled(false);

    // 6. Point d'attache de la lumière dynamique (pointe de l'épée)
    this.tipNode = new TransformNode('swordTip', this.scene);
    this.tipNode.parent = this.root;
    this.tipNode.position.y = 1.40;

    // 7. Sillage dynamique de lame lumineuse (Ruban 3D synchronisé sur la lame)
    this.initSlashTrail();
  }

  /**
   * Remplace l'épée de départ par l'Épée Légendaire Bleue (ou rétablit l'épée de départ).
   */
  setLegendary(enabled) {
    this.isLegendary = !!enabled;
    this.damage = this.isLegendary ? 2 : 1;
    this.hitRange = this.isLegendary ? 2.65 : 2.2;

    if (this.defaultSwordNode) {
      this.defaultSwordNode.setEnabled(!this.isLegendary);
    }
    if (this.legendarySwordNode) {
      this.legendarySwordNode.setEnabled(this.isLegendary);
    }
    if (this.tipNode) {
      this.tipNode.position.y = this.isLegendary ? 1.76 : 1.40;
    }
    if (this.trailMat) {
      if (this.isLegendary) {
        this.trailMat.diffuseColor = new Color3(0.55, 0.94, 1.0);
        this.trailMat.emissiveColor = new Color3(0.20, 0.78, 1.0);
      } else {
        this.trailMat.diffuseColor = new Color3(1.0, 0.98, 0.65);
        this.trailMat.emissiveColor = new Color3(1.0, 0.88, 0.28);
      }
    }
  }

  initSlashTrail() {
    this.trailMat = new StandardMaterial('mat_sword_trail', this.scene);
    this.trailMat.diffuseColor = new Color3(1.0, 0.98, 0.65);
    this.trailMat.emissiveColor = new Color3(1.0, 0.88, 0.28); // Lueur dorée intense rétro
    this.trailMat.specularColor = new Color3(1.0, 1.0, 1.0);
    this.trailMat.alpha = 0.95;
    this.trailMat.backFaceCulling = false;

    // 24 points d'échantillonnage pour un arc de cercle large et ultra-lisse
    this.trailSegments = 24;
    this.basePath = [];
    this.tipPath = [];
    for (let i = 0; i < this.trailSegments; i++) {
      this.basePath.push(new Vector3(0, 0, 0));
      this.tipPath.push(new Vector3(0, 0, 0));
    }

    this.trailMesh = MeshBuilder.CreateRibbon('swordTrail', {
      pathArray: [this.basePath, this.tipPath],
      updatable: true,
      sideOrientation: 2 // Mesh.DOUBLESIDE
    }, this.scene);
    this.trailMesh.material = this.trailMat;
    this.trailMesh.parent = this.parentNode;
    this.trailMesh.setEnabled(false);
  }

  getProgress() {
    if (!this.isSlashing) return 0;
    return Math.min(1.0, Math.max(0.0, 1.0 - (this.slashTimer / this.slashDuration)));
  }

  setRestPose() {
    if (this.root.parent !== this.parentNode) {
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.position.set(0.42, 0.5, 0.15);
      this.root.rotation.set(0.2, 0, -0.2);
    }
  }

  setTorchPose() {
    if (this.root.parent !== this.parentNode) {
      this.root.position.set(0, -0.15, 0);
      this.root.rotation.set(0, 0, 0);
    } else {
      this.root.position.set(0.32, 1.35, 0.55);
      this.root.rotation.set(0.2, 0.15, -0.1);
    }
  }

  startSlash() {
    if (this.isSlashing) return false;
    this.isSlashing = true;
    this.isRollSlashing = false;
    this.slashTimer = this.slashDuration;
    if (this.trailMesh) {
      this.trailMesh.setEnabled(false);
      this.trailMesh.material.alpha = 0.95;
    }
    return true;
  }

  /**
   * Lance le sillage circulaire acrobatique pendant la roulade avec l'Épée Légendaire.
   */
  startRollSlash(duration = 0.38) {
    if (!this.isLegendary) return false;
    this.isRollSlashing = true;
    this.isSlashing = false;
    this.rollSlashDuration = duration;
    this.rollSlashTimer = duration;
    if (this.trailMesh) {
      this.trailMesh.setEnabled(false);
      this.trailMesh.material.alpha = 0.95;
    }
    return true;
  }

  getTipWorldPosition() {
    return this.tipNode ? this.tipNode.getAbsolutePosition() : this.root.getAbsolutePosition();
  }

  update(dt, isTorchMode) {
    if (this.isRollSlashing) {
      this.rollSlashTimer -= dt;
      const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.rollSlashTimer / this.rollSlashDuration)));

      // Arc lumineux bleu tourbillonnant accompagnant la roulade acrobatique
      const z_c = 0.10;
      const R_base = 0.55;
      const R_tip = 1.65;
      const hy = 0.72;
      const phiStart = 2.0;
      const phiTotal = 4.4; // ~250° de balayage agile pendant la roulade

      if (progress < 0.12) {
        if (this.trailMesh) this.trailMesh.setEnabled(false);
      } else if (progress < 0.78) {
        const u = (progress - 0.12) / 0.66;
        const e = 1.0 - Math.pow(1.0 - u, 2.0);

        for (let i = 0; i < this.trailSegments; i++) {
          const k = i / (this.trailSegments - 1);
          const sampleE = e * k;
          const sPhi = phiStart - phiTotal * sampleE;

          const sinP = Math.sin(sPhi);
          const cosP = Math.cos(sPhi);
          const diagY = hy + Math.sin(sampleE * Math.PI) * 0.25;

          this.basePath[i].set(R_base * sinP, diagY, z_c + R_base * cosP);
          this.tipPath[i].set(R_tip * sinP, diagY + 0.12, z_c + R_tip * cosP);
        }

        MeshBuilder.CreateRibbon(null, {
          pathArray: [this.basePath, this.tipPath],
          instance: this.trailMesh
        });
        this.trailMesh.material.alpha = 0.92;
        this.trailMesh.setEnabled(true);
      } else {
        const u = (progress - 0.78) / 0.22;
        if (this.trailMesh) {
          this.trailMesh.material.alpha = 0.92 * (1.0 - u);
        }
      }

      if (this.rollSlashTimer <= 0) {
        this.isRollSlashing = false;
        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
      }
      return;
    }

    if (this.isSlashing) {
      this.slashTimer -= dt;
      const progress = this.getProgress(); // 0 à 1

      // Paramètres de l'arc de balayage du ruban lumineux
      const z_c = 0.15;
      const R_base = 0.45;
      const R_tip = this.isLegendary ? 1.72 : 1.45;
      const hy = 0.90;
      const phiStart = 1.65; // +95° droite
      const phiTotal = this.isLegendary ? 3.55 : 3.30; // Balayage encore plus ample pour l'Épée Légendaire

      // --- PHASE 1 : Préparation & Armement (0.0 à 0.12) ---
      if (progress < 0.12) {
        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
      }
      // --- PHASE 2 : Balayage circulaire tranchant (0.12 à 0.62) ---
      else if (progress < 0.62) {
        const u = (progress - 0.12) / 0.50;
        const e = 1.0 - Math.pow(1.0 - u, 2.4);

        // Mise à jour du ruban fendant l'air
        for (let i = 0; i < this.trailSegments; i++) {
          const k = i / (this.trailSegments - 1);
          const sampleE = e * k;
          const sPhi = phiStart - phiTotal * sampleE;

          const sinP = Math.sin(sPhi);
          const cosP = Math.cos(sPhi);

          this.basePath[i].set(R_base * sinP, hy, z_c + R_base * cosP);
          this.tipPath[i].set(R_tip * sinP, hy, z_c + R_tip * cosP);
        }

        MeshBuilder.CreateRibbon(null, {
          pathArray: [this.basePath, this.tipPath],
          instance: this.trailMesh
        });
        this.trailMesh.material.alpha = 0.95;
        this.trailMesh.setEnabled(true);
      }
      // --- PHASE 3 : Amorti & Retour en garde (0.62 à 1.0) ---
      else {
        const u = (progress - 0.62) / 0.38;
        const s = Math.sin(u * Math.PI * 0.5);

        // Évanouissement progressif de la traînée lumineuse
        if (this.trailMesh) {
          this.trailMesh.material.alpha = 0.95 * (1.0 - s);
        }
      }

      if (this.slashTimer <= 0) {
        this.isSlashing = false;
        if (this.trailMesh) {
          this.trailMesh.setEnabled(false);
        }
      }
    }
  }

  /**
   * Test de collision sectoriel circulaire devant le joueur.
   * Vérifie si une cible est dans l'arc de frappe (portée accrue avec l'Épée Légendaire).
   */
  checkHit(playerPos, playerFacingAngle, targetPos, targetRadius = 0.8, fullCircle = false) {
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const hitRange = this.hitRange + targetRadius;
    if (dist > hitRange) return false;

    if (fullCircle) return true;

    // Angle vers la cible
    const angleToTarget = Math.atan2(dx, dz);
    let diffAngle = angleToTarget - playerFacingAngle;

    // Normalisation de l'angle entre -PI et +PI
    while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
    while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

    // Arc de frappe de 190° (±95° / 1.66 rad), élargi avec l'Épée Légendaire
    const maxAngle = this.isLegendary ? 1.95 : 1.70;
    return Math.abs(diffAngle) < maxAngle;
  }
}
