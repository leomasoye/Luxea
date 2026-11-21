# LICENSES.md — Inventaire des Licences & Crédits

Ce document recense l'intégralité des librairies tierces, moteurs et ressources utilisés dans le projet **Luxea** dans le cadre du concours **Games on Web 2027** organisé par CGI.

---

## 1. Moteur 3D & Librairies Logicielles

### Babylon.js Core (`@babylonjs/core`)
* **Usage :** Moteur 3D temps réel exclusif (rendu WebGL/WebGPU, géométrie, lumières, caméra, matériaux).
* **Licence :** Apache License 2.0
* **Dépôt officiel :** https://github.com/BabylonJS/Babylon.js
* **Auteur / Organisation :** Babylon.js Team / Microsoft & communauté open source.

### Vite (`vite`)
* **Usage :** Bundler de développement local et compilateur statique pour la production.
* **Licence :** MIT License
* **Dépôt officiel :** https://github.com/vitejs/vite
* **Auteur :** Evan You & Vite Contributors.

---

## 2. Direction Artistique, Modèles 3D & Graphismes

* **Modèles 3D (Zelya, buissons, décors, portes, armes) :** 100 % créés procéduralement par l'équipe via `MeshBuilder` de Babylon.js (formes low-poly primitives composées, optimisées en `ThinInstances` et matrices gelées).
* **Textures & Palette de Couleurs :** Créées spécifiquement pour le projet, filtrage forcé en `Texture.NEAREST_SAMPLINGMODE`.
* **Interface & HUD :** Rendu en overlay HTML5/CSS3 pur avec sprites vectoriels SVG pixel-art originaux (`shape-rendering="crispEdges"`, `image-rendering: pixelated`) créés spécifiquement par l'équipe pour les cœurs rétro, jauges et rack d'items (clés, boss key, carte, flèches, lanterne). Licence CC0.

---

## 3. Audio & Bruitages Rétro

* **Bruitages et Musiques Chiptune :** 100 % synthétisés en temps réel via la **Web Audio API** native des navigateurs par le module `src/core/AudioManager.js` (générateurs d'ondes sinusoïdales, carrées, triangulaires et dents de scie, enveloppes ADSR programmées).
* **Zéro fichier MP3/OGG externe soumis à copyright.**

---

## 4. Conformité avec le Règlement Games on Web 2027 (Articles 5.1 & 5.3)

* **Aucun moteur tiers interdit :** Ni Three.js, ni PlayCanvas, ni Unity, ni Godot.
* **Aucun contenu sous marque déposée :** Aucune mention ni reprise d'actifs des jeux de Nintendo (Link, Zelda, Hyrule, Triforce, Master Sword).
* **Livrables et interface :** Rédigés à 100 % en français.
