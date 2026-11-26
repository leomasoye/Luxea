import {
  HemisphericLight,
  DirectionalLight,
  PointLight,
  Color3,
  Vector3,
  GlowLayer,
  Effect,
  PostProcess
} from '@babylonjs/core';

/**
 * LightingManager.js — Éclairage rétro & système de lumière de l'épée.
 * Conforme à AGENT.md & GDD.md :
 * - Lumière directionnelle chaude (soleil de la plaine).
 * - Ambiance hémisphérique douce.
 * - PointLight dynamique attachée à l'épée de Zelya (Budget GPU strict : 1 seule lumière dynamique).
 * - GlowLayer rétro pour l'aura de l'épée et les éléments lumineux.
 */
export class LightingManager {
  constructor(scene) {
    this.scene = scene;

    this.ambientLight = null;
    this.sunLight = null;
    this.swordLight = null;
    this.glowLayer = null;

    // État de la lumière de l'épée
    this.baseSwordIntensity = 2.4;
    this.torchSwordIntensity = 5.2;
    this.currentIntensity = 2.4;
    this.targetIntensity = 2.4;

    this.baseRange = 9.5;
    this.torchRange = 22.0;
    this.currentRange = 9.5;

    // Épée Légendaire Bleue : lumière plus puissante et d'intensité constante dans le temps
    this.isLegendarySword = false;

    this.init();
  }

  init() {
    // 1. Ambiance crépusculaire / pénombre mystique
    // L'intensité ambiante est assombrie afin que la lumière de l'épée ait un impact immédiat et spectaculaire
    this.ambientLight = new HemisphericLight(
      'AmbientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.diffuse = new Color3(0.26, 0.32, 0.44); // Pénombre bleutée d'anciennes ruines
    this.ambientLight.groundColor = new Color3(0.04, 0.07, 0.05); // Sol sombre dans les ombres
    this.ambientLight.intensity = 0.32; // Assombri (vs 0.75 avant) pour valoriser les sources de lumière

    // 2. Soleil voilé / astre lointain rasant
    this.sunLight = new DirectionalLight(
      'SunLight',
      new Vector3(-0.7, -1.5, -0.6).normalize(),
      this.scene
    );
    this.sunLight.diffuse = new Color3(0.48, 0.54, 0.70);
    this.sunLight.specular = new Color3(0.18, 0.18, 0.22);
    this.sunLight.intensity = 0.35;

    // 3. GlowLayer rétro léger (subtil pour ne pas créer de flou moderne excessif)
    this.glowLayer = new GlowLayer('retroGlow', this.scene, {
      mainTextureRatio: 0.35,
      blurKernelSize: 10
    });
    this.glowLayer.intensity = 0.45;

    // 4. PointLight dynamique de l'ÉPÉE (Source majeure de clarté et de jeu)
    this.swordLight = new PointLight(
      'SwordDynamicLight',
      new Vector3(0, 1.2, 0),
      this.scene
    );
    this.swordLight.diffuse = new Color3(1.0, 0.88, 0.52); // Or chaleureux éclatant
    this.swordLight.specular = new Color3(0.8, 0.7, 0.35);
    this.swordLight.intensity = this.baseSwordIntensity;
    this.swordLight.range = this.baseRange;

    // 5. Brouillard sombre et atmosphérique / Occlusion ambiante
    this.scene.clearColor = new Color3(0.07, 0.09, 0.14).toColor4(1.0);
    this.scene.fogMode = 2; // FOGMODE_EXP2
    this.scene.fogDensity = 0.022; // Densité tangible et mystérieuse sans être étouffante
    this.scene.fogColor = new Color3(0.07, 0.09, 0.14); // Fusionne avec le ciel sombre
  }

  /**
   * Adapte l'éclairage et l'ambiance atmosphérique selon la zone active.
   * En caverne : soleil coupé, pénombre mystique, fog dense, épée mise en valeur spectaculaire.
   */
  setZone(zone) {
    if (zone === 'cavern') {
      if (this.sunLight) {
        this.sunLight.intensity = 0.0;
      }
      if (this.ambientLight) {
        this.ambientLight.intensity = 0.16;
        this.ambientLight.diffuse = new Color3(0.16, 0.20, 0.30);
        this.ambientLight.groundColor = new Color3(0.03, 0.04, 0.06);
      }
      this.scene.clearColor = new Color3(0.018, 0.022, 0.034).toColor4(1.0);
      this.scene.fogColor = new Color3(0.018, 0.022, 0.034);
      this.scene.fogDensity = 0.023;

      // La lueur de l'épée dans l'obscurité souterraine
      this.baseSwordIntensity = 3.2;
      this.torchSwordIntensity = 6.2;
      this.baseRange = 13.0;
      this.torchRange = 26.0;
    } else if (zone === 'forest') {
      // Ambiance féerique de la Forêt Sacrée (brume émeraude douce & rayons dorés)
      if (this.sunLight) {
        this.sunLight.intensity = 0.62;
        this.sunLight.diffuse = new Color3(0.95, 0.92, 0.72);
      }
      if (this.ambientLight) {
        this.ambientLight.intensity = 0.48;
        this.ambientLight.diffuse = new Color3(0.45, 0.68, 0.52);
        this.ambientLight.groundColor = new Color3(0.08, 0.16, 0.09);
      }
      this.scene.clearColor = new Color3(0.08, 0.17, 0.13).toColor4(1.0);
      this.scene.fogColor = new Color3(0.08, 0.17, 0.13);
      this.scene.fogDensity = 0.013;

      this.baseSwordIntensity = 2.2;
      this.torchSwordIntensity = 4.8;
      this.baseRange = 9.5;
      this.torchRange = 21.0;
    } else {
      if (this.sunLight) {
        this.sunLight.intensity = 0.35;
        this.sunLight.diffuse = new Color3(0.48, 0.54, 0.70);
      }
      if (this.ambientLight) {
        this.ambientLight.intensity = 0.32;
        this.ambientLight.diffuse = new Color3(0.26, 0.32, 0.44);
        this.ambientLight.groundColor = new Color3(0.04, 0.07, 0.05);
      }
      this.scene.clearColor = new Color3(0.07, 0.09, 0.14).toColor4(1.0);
      this.scene.fogColor = new Color3(0.07, 0.09, 0.14);
      this.scene.fogDensity = 0.022;

      this.baseSwordIntensity = 2.4;
      this.torchSwordIntensity = 5.2;
      this.baseRange = 9.5;
      this.torchRange = 22.0;
    }
  }

  /**
   * Active ou désactive l'éclairage de l'Épée Légendaire Bleue (plus puissant, teinte céleste, intensité constante).
   */
  setLegendarySword(enabled) {
    this.isLegendarySword = !!enabled;
    if (!this.swordLight) return;

    if (this.isLegendarySword) {
      this.swordLight.diffuse = new Color3(0.48, 0.86, 1.0); // Éclat azur céleste
      this.swordLight.specular = new Color3(0.75, 0.96, 1.0);
    } else {
      this.swordLight.diffuse = new Color3(1.0, 0.88, 0.52); // Or chaleureux classique
      this.swordLight.specular = new Color3(0.8, 0.7, 0.35);
    }
  }

  // Met à jour la position et l'intensité de la lumière de l'épée selon la jauge et le mode torche
  update(swordWorldPos, lightGaugeRatio, isTorchMode, isSlashing, dt) {
    if (!this.swordLight || !swordWorldPos) return;

    // Suivi de la pointe de l'épée
    this.swordLight.position.copyFrom(swordWorldPos);

    let desiredIntensity;
    let desiredRange;

    if (this.isLegendarySword) {
      // Épée Légendaire : lumière nettement plus puissante et d'intensité CONSTANTE (ne diminue pas avec le temps)
      desiredIntensity = isTorchMode ? this.torchSwordIntensity * 1.45 : this.baseSwordIntensity * 1.45;
      desiredRange = isTorchMode ? this.torchRange * 1.35 : this.baseRange * 1.35;
    } else {
      // Épée de départ : l'intensité dépend de la jauge restante et faiblit avec le temps
      desiredIntensity = this.baseSwordIntensity * lightGaugeRatio;
      desiredRange = this.baseRange * (0.45 + 0.55 * lightGaugeRatio);

      if (isTorchMode) {
        // Mode Torche : l'épée brandie perce la brume et éclaire toute la zone lointaine
        desiredIntensity = this.torchSwordIntensity * lightGaugeRatio;
        desiredRange = this.torchRange * lightGaugeRatio;
      }
    }

    // Flash lumineux spectaculaire lors d'une frappe à l'épée (ou roulade tranchante)
    if (isSlashing) {
      desiredIntensity *= 1.6;
      desiredRange *= 1.25;
    }

    // Interpolation douce pour éviter tout clignotement brutal
    const speed = dt * 10;
    this.currentIntensity += (desiredIntensity - this.currentIntensity) * speed;
    this.currentRange += (desiredRange - this.currentRange) * speed;

    this.swordLight.intensity = Math.max(0.05, this.currentIntensity);
    this.swordLight.range = Math.max(1.0, this.currentRange);
  }

  /**
   * Attache le post-process PS1/N64 (quantification de couleurs + dithering ordonné Bayer 4x4) à la caméra.
   */
  attachRetroPostProcess(camera) {
    if (!camera) return;

    if (!Effect.ShadersStore['retroDitherFragmentShader']) {
      Effect.ShadersStore['retroDitherFragmentShader'] = `
        precision highp float;
        varying vec2 vUV;
        uniform sampler2D textureSampler;
        uniform vec2 screenSize;
        uniform float enabled;

        float bayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int idx = y * 4 + x;
          if (idx == 0) return 0.0 / 16.0;
          if (idx == 1) return 8.0 / 16.0;
          if (idx == 2) return 2.0 / 16.0;
          if (idx == 3) return 10.0 / 16.0;
          if (idx == 4) return 12.0 / 16.0;
          if (idx == 5) return 4.0 / 16.0;
          if (idx == 6) return 14.0 / 16.0;
          if (idx == 7) return 6.0 / 16.0;
          if (idx == 8) return 3.0 / 16.0;
          if (idx == 9) return 11.0 / 16.0;
          if (idx == 10) return 1.0 / 16.0;
          if (idx == 11) return 9.0 / 16.0;
          if (idx == 12) return 15.0 / 16.0;
          if (idx == 13) return 7.0 / 16.0;
          if (idx == 14) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main(void) {
          vec4 col = texture2D(textureSampler, vUV);
          if (enabled < 0.5) {
            gl_FragColor = col;
            return;
          }
          // Dithering Bayer 4x4 + quantification 24 niveaux/canal (palette 15/16-bit rétro PS1)
          float dither = (bayer4x4(gl_FragCoord.xy) - 0.5) * (1.0 / 26.0);
          vec3 q = floor((col.rgb + dither) * 24.0 + 0.5) / 24.0;
          gl_FragColor = vec4(clamp(q, 0.0, 1.0), col.a);
        }
      `;
    }

    this.retroEnabled = true;
    this.retroPostProcess = new PostProcess(
      'retroDither',
      'retroDither',
      ['screenSize', 'enabled'],
      null,
      1.0,
      camera
    );
    this.retroPostProcess.onApply = (effect) => {
      effect.setFloat2('screenSize', this.retroPostProcess.width, this.retroPostProcess.height);
      effect.setFloat('enabled', this.retroEnabled ? 1.0 : 0.0);
    };
  }

  setRetroEnabled(enabled) {
    this.retroEnabled = !!enabled;
  }
}
