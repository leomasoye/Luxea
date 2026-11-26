import { DynamicTexture, Texture } from '@babylonjs/core';

/**
 * RetroTextures.js — Générateur de textures pixel-art procédurales (16x16, NEAREST_SAMPLINGMODE).
 * Transforme les aplats 3D en véritables textures N64 / PS1 / Zelda rétro sans aucun flou bilinéaire.
 */
export class RetroTextures {
  static _cache = new Map();

  /**
   * Hash déterministe léger pour générer un motif pixel-art stable.
   */
  static hash(x, y, seed = 1) {
    let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  /**
   * Crée (ou récupère du cache) une texture pixel-art 16x16 avec filtrage NEAREST strict.
   */
  static get(scene, type, uScale = 1, vScale = 1) {
    const key = `${type}_${uScale}_${vScale}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const size = 16;
    const tex = new DynamicTexture(
      `retro_tex_${key}`,
      { width: size, height: size },
      scene,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    const ctx = tex.getContext();

    if (type === 'grass') {
      this._drawGrass(ctx, size);
    } else if (type === 'dirt') {
      this._drawDirt(ctx, size);
    } else if (type === 'cliff') {
      this._drawCliff(ctx, size);
    } else if (type === 'bark') {
      this._drawBark(ctx, size);
    } else if (type === 'foliage') {
      this._drawFoliage(ctx, size);
    } else if (type === 'caveFloor') {
      this._drawCaveFloor(ctx, size);
    } else if (type === 'caveWall') {
      this._drawCaveWall(ctx, size);
    } else if (type === 'stone') {
      this._drawAncientStone(ctx, size);
    } else if (type === 'water') {
      this._drawWater(ctx, size);
    } else {
      this._drawAncientStone(ctx, size);
    }

    tex.update(false);
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    tex.uScale = uScale;
    tex.vScale = vScale;
    tex.anisotropicFilteringLevel = 1;

    this._cache.set(key, tex);
    return tex;
  }

  static _px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }

  static _drawGrass(ctx, size) {
    const palette = ['#b8d8a8', '#cce8bc', '#e2f5d2', '#9ec48e'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = this.hash(x, y, 11);
        let col = palette[1];
        if (r < 0.22) col = palette[0];
        else if (r > 0.82) col = palette[2];
        else if ((x + y * 3) % 7 === 0 && r < 0.45) col = palette[3];
        this._px(ctx, x, y, col);
      }
    }
    // Petits brins d'herbe pixel-art (motifs en V)
    const tufts = [[2, 3], [9, 6], [5, 12], [13, 11]];
    tufts.forEach(([tx, ty]) => {
      this._px(ctx, tx, ty, '#88b078');
      this._px(ctx, (tx + 1) % size, (ty + 1) % size, '#f0ffe4');
    });
  }

  static _drawDirt(ctx, size) {
    const palette = ['#c4b094', '#d8c4a6', '#e8d8bc', '#a89274'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = this.hash(x, y, 23);
        let col = palette[1];
        if (r < 0.18) col = palette[3];
        else if (r < 0.42) col = palette[0];
        else if (r > 0.84) col = palette[2];
        this._px(ctx, x, y, col);
      }
    }
  }

  static _drawCliff(ctx, size) {
    const palette = ['#9aa0a8', '#b4bac2', '#cfd5dd', '#7a808a'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = this.hash(x, y, 37);
        const strata = y % 5 === 0;
        let col = palette[1];
        if (strata && r < 0.7) col = palette[3];
        else if (r < 0.25) col = palette[0];
        else if (r > 0.80) col = palette[2];
        this._px(ctx, x, y, col);
      }
    }
    // Fissures verticales pixelisées
    for (let y = 2; y < 8; y++) this._px(ctx, 5, y, '#686e78');
    for (let y = 9; y < 15; y++) this._px(ctx, 12, y, '#686e78');
  }

  static _drawBark(ctx, size) {
    const palette = ['#9c8470', '#bc9f86', '#d6baa0', '#7c6452'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const groove = x % 4 === 0 || (x % 4 === 1 && this.hash(x, y, 51) < 0.35);
        const r = this.hash(x, y, 53);
        let col = palette[1];
        if (groove) col = palette[3];
        else if (r < 0.3) col = palette[0];
        else if (r > 0.78) col = palette[2];
        this._px(ctx, x, y, col);
      }
    }
  }

  static _drawFoliage(ctx, size) {
    const palette = ['#96c89a', '#b6e2b4', '#daf5d0', '#76a87c'];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const checker = (x + y) % 2 === 0;
        const r = this.hash(x, y, 71);
        let col = checker ? palette[1] : palette[0];
        if (r > 0.76) col = palette[2];
        else if (r < 0.22) col = palette[3];
        this._px(ctx, x, y, col);
      }
    }
  }

  static _drawCaveFloor(ctx, size) {
    // Dalles de donjon rétro 8x8 avec joints sombres
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isJoint = y === 0 || y === 8 || (y < 8 ? x === 0 || x === 8 : x === 4 || x === 12);
        const r = this.hash(x, y, 89);
        if (isJoint) {
          this._px(ctx, x, y, '#6e7688');
        } else if (r > 0.80) {
          this._px(ctx, x, y, '#d2d8e6');
        } else if (r < 0.28) {
          this._px(ctx, x, y, '#9ea6b8');
        } else {
          this._px(ctx, x, y, '#b8c0d2');
        }
      }
    }
  }

  static _drawCaveWall(ctx, size) {
    // Briques rocheuses de caverne 16-bit
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const row = Math.floor(y / 4);
        const offset = (row % 2) * 4;
        const isJoint = y % 4 === 0 || (x + offset) % 8 === 0;
        const r = this.hash(x, y, 101);
        if (isJoint) {
          this._px(ctx, x, y, '#687082');
        } else if (y % 4 === 1 && r > 0.35) {
          this._px(ctx, x, y, '#d8dfee');
        } else if (r < 0.30) {
          this._px(ctx, x, y, '#9ca4b6');
        } else {
          this._px(ctx, x, y, '#b8c0d2');
        }
      }
    }
  }

  static _drawAncientStone(ctx, size) {
    // Pierre sculptée antique légèrement moussue
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const border = x === 0 || y === 0 || x === 15 || y === 15;
        const r = this.hash(x, y, 131);
        if (border) {
          this._px(ctx, x, y, '#848c88');
        } else if (r < 0.14) {
          this._px(ctx, x, y, '#a0b8a2'); // touche de mousse
        } else if (r > 0.80) {
          this._px(ctx, x, y, '#e4e8e2');
        } else {
          this._px(ctx, x, y, '#c4cac4');
        }
      }
    }
  }

  static _drawWater(ctx, size) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const wave = (y % 4 === 1 && (x + y) % 6 < 3);
        const r = this.hash(x, y, 151);
        if (wave) this._px(ctx, x, y, '#dcf8ff');
        else if (r < 0.30) this._px(ctx, x, y, '#9ad8e4');
        else this._px(ctx, x, y, '#b8eaf2');
      }
    }
  }
}
