import { Engine } from '@babylonjs/core';
import { GameManager } from './core/GameManager.js';

/**
 * main.js — Point d'entrée de l'application Luxea.
 * Initialisation du moteur Babylon.js, redimensionnement adaptatif du Canvas,
 * et démarrage du GameManager.
 */
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) {
    console.error("Canvas 'renderCanvas' introuvable !");
    return;
  }

  // Création du moteur Babylon.js avec antialiasing et stencil buffer
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    adaptToDeviceRatio: true
  });

  // Forcer le scaling pour des performances parfaites (60 FPS garantis)
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

  // Instanciation et amorçage du gestionnaire de jeu
  const game = new GameManager(engine, canvas);

  // Redimensionnement dynamique réactif du canvas
  window.addEventListener('resize', () => {
    engine.resize();
  });

  console.log("🎮 Luxea initialisé avec succès sur Babylon.js !");
});
