import {
  HemisphericLight,
  DirectionalLight,
  PointLight,
  Color3,
  Vector3,
  GlowLayer
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

    // 3. GlowLayer rétro valorisant les lueurs dans la pénombre
    this.glowLayer = new GlowLayer('retroGlow', this.scene, {
      mainTextureRatio: 0.5,
      blurKernelSize: 16
    });
    this.glowLayer.intensity = 0.95;

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
        this.ambientLight.intensity = 0.10;
        this.ambientLight.diffuse = new Color3(0.12, 0.15, 0.22);
        this.ambientLight.groundColor = new Color3(0.015, 0.02, 0.03);
      }
      this.scene.clearColor = new Color3(0.012, 0.015, 0.022).toColor4(1.0);
      this.scene.fogColor = new Color3(0.012, 0.015, 0.022);
      this.scene.fogDensity = 0.034;

      // La lueur de l'épée dans l'obscurité souterraine
      this.baseSwordIntensity = 3.2;
      this.torchSwordIntensity = 6.4;
      this.baseRange = 12.0;
      this.torchRange = 26.0;
    } else {
      if (this.sunLight) {
        this.sunLight.intensity = 0.35;
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

  // Met à jour la position et l'intensité de la lumière de l'épée selon la jauge et le mode torche
  update(swordWorldPos, lightGaugeRatio, isTorchMode, isSlashing, dt) {
    if (!this.swordLight || !swordWorldPos) return;

    // Suivi de la pointe de l'épée
    this.swordLight.position.copyFrom(swordWorldPos);

    // Calcul de l'intensité cible selon la jauge de lumière (0.0 à 1.0)
    let desiredIntensity = this.baseSwordIntensity * lightGaugeRatio;
    let desiredRange = this.baseRange * (0.45 + 0.55 * lightGaugeRatio);

    if (isTorchMode) {
      // Mode Torche : l'épée brandie perce la brume et éclaire toute la zone lointaine
      desiredIntensity = this.torchSwordIntensity * lightGaugeRatio;
      desiredRange = this.torchRange * lightGaugeRatio;
    }

    // Flash lumineux spectaculaire lors d'une frappe à l'épée
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
}
