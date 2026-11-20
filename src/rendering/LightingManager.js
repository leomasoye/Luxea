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
 * - PointLight dynamique attachée à l'épée de Zalya (Budget GPU strict : 1 seule lumière dynamique).
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
    this.baseSwordIntensity = 1.2;
    this.torchSwordIntensity = 3.0;
    this.currentIntensity = 1.2;
    this.targetIntensity = 1.2;

    this.baseRange = 6.0;
    this.torchRange = 14.0;
    this.currentRange = 6.0;

    this.init();
  }

  init() {
    // 1. Lumière hémisphérique d'ambiance (ciel doux bleuté / sol verdoyant)
    this.ambientLight = new HemisphericLight(
      'AmbientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.diffuse = new Color3(0.85, 0.9, 1.0);
    this.ambientLight.groundColor = new Color3(0.2, 0.35, 0.22);
    this.ambientLight.intensity = 0.75;

    // 2. Soleil chaud directionnel (doré rétro)
    this.sunLight = new DirectionalLight(
      'SunLight',
      new Vector3(-0.8, -1.8, -0.6).normalize(),
      this.scene
    );
    this.sunLight.diffuse = new Color3(1.0, 0.95, 0.75);
    this.sunLight.specular = new Color3(0.2, 0.2, 0.2);
    this.sunLight.intensity = 1.1;

    // 3. GlowLayer pour l'aura rétro lumineuse
    this.glowLayer = new GlowLayer('retroGlow', this.scene, {
      mainTextureRatio: 0.5,
      blurKernelSize: 16
    });
    this.glowLayer.intensity = 0.85;

    // 4. PointLight dynamique de l'ÉPÉE (Mécanique centrale)
    // Budget GPU strict : une seule lumière dynamique.
    this.swordLight = new PointLight(
      'SwordDynamicLight',
      new Vector3(0, 1.2, 0),
      this.scene
    );
    this.swordLight.diffuse = new Color3(1.0, 0.92, 0.55); // Or / Lumière sacrée
    this.swordLight.specular = new Color3(0.6, 0.5, 0.2);
    this.swordLight.intensity = this.baseSwordIntensity;
    this.swordLight.range = this.baseRange;

    // Brouillard rétro léger pour la profondeur d'horizon
    this.scene.fogMode = 2; // FOGMODE_EXP2
    this.scene.fogDensity = 0.008;
    this.scene.fogColor = new Color3(0.65, 0.82, 0.92);
  }

  // Met à jour la position et l'intensité de la lumière de l'épée selon la jauge et le mode torche
  update(swordWorldPos, lightGaugeRatio, isTorchMode, isSlashing, dt) {
    if (!this.swordLight || !swordWorldPos) return;

    // Suivi de la pointe de l'épée
    this.swordLight.position.copyFrom(swordWorldPos);

    // Calcul de l'intensité cible selon la jauge de lumière (0.0 à 1.0)
    let desiredIntensity = this.baseSwordIntensity * lightGaugeRatio;
    let desiredRange = this.baseRange * (0.4 + 0.6 * lightGaugeRatio);

    if (isTorchMode) {
      // Mode Torche : boost de portée et luminosité
      desiredIntensity = this.torchSwordIntensity * lightGaugeRatio;
      desiredRange = this.torchRange * lightGaugeRatio;
    }

    // Flash lumineux bref lors d'une frappe à l'épée
    if (isSlashing) {
      desiredIntensity *= 1.8;
      desiredRange *= 1.3;
    }

    // Interpolation douce pour éviter tout clignotement brutal
    const speed = dt * 10;
    this.currentIntensity += (desiredIntensity - this.currentIntensity) * speed;
    this.currentRange += (desiredRange - this.currentRange) * speed;

    this.swordLight.intensity = Math.max(0.05, this.currentIntensity);
    this.swordLight.range = Math.max(1.0, this.currentRange);
  }
}
