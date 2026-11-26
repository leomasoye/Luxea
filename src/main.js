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

  // Création du moteur Babylon.js sans antialiasing pour un rendu rétrogaming net (PS1 / N64 / DS)
  const engine = new Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: true,
    adaptToDeviceRatio: false
  });

  // Résolution interne rétro (pixel-art 3D net + 60 FPS garantis)
  engine.setHardwareScalingLevel(2.25);

  // Instanciation et amorçage du gestionnaire de jeu
  const game = new GameManager(engine, canvas);

  // Redimensionnement dynamique réactif du canvas
  window.addEventListener('resize', () => {
    engine.resize();
  });

  console.log("🎮 Luxea initialisé avec succès sur Babylon.js !");
});
