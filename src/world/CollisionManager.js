/**
 * CollisionManager.js — Gestionnaire de collisions géométriques 2D/3D rétro.
 * Gère les hitboxes en AABB (murs, falaises, portes) et circulaires (arbres, buissons, poteaux).
 * Fournit un glissement (sliding) fluide sans accrochage pour le joueur.
 */
export class CollisionManager {
  constructor() {
    this.currentZone = 'plaine';
    this.staticColliders = [];
    this.dynamicSources = [];
  }

  /**
   * Définit la zone active de collision ('plaine', 'cavern', etc.).
   */
  setZone(zone) {
    this.currentZone = zone || 'plaine';
  }

  /**
   * Ajoute une boîte de collision alignée sur les axes (AABB) sur le plan XZ.
   */
  addBox(minX, maxX, minZ, maxZ, tag = 'box', zone = 'plaine') {
    this.staticColliders.push({
      type: 'box',
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      tag,
      zone
    });
  }

  /**
   * Ajoute un cylindre / cercle de collision sur le plan XZ.
   */
  addCircle(x, z, radius, tag = 'circle', zone = 'plaine') {
    this.staticColliders.push({
      type: 'circle',
      x,
      z,
      radius,
      tag,
      zone
    });
  }

  /**
   * Enregistre un fournisseur dynamique de colliders (ex: buissons non détruits).
   */
  addDynamicSource(sourceFn, zone = 'plaine') {
    if (typeof sourceFn === 'function') {
      this.dynamicSources.push({ fn: sourceFn, zone });
    }
  }

  /**
   * Récupère la liste complète des colliders actifs (statiques + dynamiques) pour la zone courante.
   */
  getAllColliders() {
    const list = [];
    for (let i = 0; i < this.staticColliders.length; i++) {
      const col = this.staticColliders[i];
      if (!col.zone || col.zone === this.currentZone) {
        list.push(col);
      }
    }
    for (let i = 0; i < this.dynamicSources.length; i++) {
      const src = this.dynamicSources[i];
      if (!src.zone || src.zone === this.currentZone) {
        const dynamicItems = src.fn();
        if (dynamicItems && dynamicItems.length > 0) {
          for (let j = 0; j < dynamicItems.length; j++) {
            list.push(dynamicItems[j]);
          }
        }
      }
    }
    return list;
  }

  /**
   * Pousse un cercle hors d'un collider donné.
   * Retourne true si une pénétration a été résolue.
   */
  resolveAgainstCollider(pos, radius, col) {
    if (col.type === 'circle') {
      const dx = pos.x - col.x;
      const dz = pos.z - col.z;
      const minDist = radius + col.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const pen = minDist - dist;
          pos.x += (dx / dist) * pen;
          pos.z += (dz / dist) * pen;
        } else {
          // Si parfaitement superposés, pousser le long de Z
          pos.z += minDist;
        }
        return true;
      }
    } else if (col.type === 'box') {
      const cx = Math.max(col.minX, Math.min(col.maxX, pos.x));
      const cz = Math.max(col.minZ, Math.min(col.maxZ, pos.z));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const pen = radius - dist;
          pos.x += (dx / dist) * pen;
          pos.z += (dz / dist) * pen;
        } else {
          // Le centre du cercle est à l'intérieur de la boîte : pousser vers l'arête la plus proche
          const dLeft = pos.x - col.minX;
          const dRight = col.maxX - pos.x;
          const dBottom = pos.z - col.minZ;
          const dTop = col.maxZ - pos.z;
          const minD = Math.min(dLeft, dRight, dBottom, dTop);

          if (minD === dLeft) pos.x = col.minX - radius;
          else if (minD === dRight) pos.x = col.maxX + radius;
          else if (minD === dBottom) pos.z = col.minZ - radius;
          else pos.z = col.maxZ + radius;
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Résout une position ponctuelle contre tous les colliders actifs.
   */
  resolveCircleAll(pos, radius, colliders) {
    let anyCollision = false;
    for (let i = 0; i < colliders.length; i++) {
      if (this.resolveAgainstCollider(pos, radius, colliders[i])) {
        anyCollision = true;
      }
    }
    return anyCollision;
  }

  /**
   * Déplace le joueur avec glissement parfait le long des surfaces (murs, arbres, buissons, portes).
   * L'avancement est décomposé par sous-étapes et axes séparés (X puis Z) pour garantir un sliding ultra-fluide.
   */
  resolveMove(oldPos, moveDelta, playerRadius = 0.38) {
    const moveDist = Math.sqrt(moveDelta.x * moveDelta.x + moveDelta.z * moveDelta.z);
    if (moveDist <= 0.0001) {
      const pos = { x: oldPos.x, z: oldPos.z };
      const colliders = this.getAllColliders();
      this.resolveCircleAll(pos, playerRadius, colliders);
      return pos;
    }

    // Découpage en sous-pas si la vitesse est élevée (ex: esquive/roulade ou lag dt)
    const stepCount = Math.max(1, Math.ceil(moveDist / 0.18));
    const subDeltaX = moveDelta.x / stepCount;
    const subDeltaZ = moveDelta.z / stepCount;

    const pos = { x: oldPos.x, z: oldPos.z };
    const colliders = this.getAllColliders();

    for (let s = 0; s < stepCount; s++) {
      // 1. Avancée sur l'axe X + résolution
      pos.x += subDeltaX;
      this.resolveCircleAll(pos, playerRadius, colliders);

      // 2. Avancée sur l'axe Z + résolution
      pos.z += subDeltaZ;
      this.resolveCircleAll(pos, playerRadius, colliders);
    }

    // Passe de relaxation finale pour les coins serrés
    for (let r = 0; r < 2; r++) {
      this.resolveCircleAll(pos, playerRadius, colliders);
    }

    return pos;
  }
}
