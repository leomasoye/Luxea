---
name: retro-game-ui
description: Guide et règles de conception d'interfaces rétro (HUD, menus, jauges, dialogues) authentiques 8-bit / 16-bit, sans "IA slop moderne" (bannit le glassmorphism blur, les néons flous, les coins arrondis et le verbiage inutile).
---

# Guide de Conception d'Interface Rétrogaming & Anti-« IA Slop »

Ce guide définit les règles strictes pour concevoir et maintenir l'interface visuelle (UI/HUD, menus, dialogues) de jeux au thème **Rétrogaming** (NES, SNES, Game Boy, arcade) en évitant les pièges des interfaces générées par IA modernes souvent qualifiées d'« IA slop ».

---

## 1. Ce qu'est l'« IA Slop » Moderne (À PROSCRIRE ABSOLUMENT)

Les LLM et générateurs d'UI modernes ont tendance à injecter par défaut des poncifs visuels qui détruisent l'immersion rétrogaming :

❌ **Bannir le Glassmorphism & Blur** :
* Interdiction de `backdrop-filter: blur(...)`.
* Éviter les calques semi-transparents laiteux avec flou d'arrière-plan.
* Préférer des fonds opaques solides sombres (`#080c14`, `#0e121a`) ou avec un tramage / scanlines rétro subtil.

❌ **Bannir les Lueurs Néon Floues (Glow Diffus)** :
* Interdiction de `box-shadow: 0 0 25px #00ffff` ou `text-shadow: 0 0 20px rgba(255, 224, 102, 0.8)`.
* Les consoles 8-bit / 16-bit n'avaient pas de bloom shader matériel.
* Utiliser des ombres portées nettes et décalées de quelques pixels : `text-shadow: 2px 2px 0 #000;`, `box-shadow: 4px 4px 0 #000;`.

❌ **Bannir les Coins Arrondis Modernes (Pills / Cards)** :
* Interdiction de `border-radius: 8px`, `12px` ou `9999px` sur les fenêtres de jeu rétro.
* Les fenêtres rétro sont rectangulaires à angles droits (`border-radius: 0;`), ou avec des coins en escalier de pixels.

❌ **Bannir le Verbiage Explicatif Excessif** :
* Pas de paragraphes explicatifs dans un menu pause (« Partie en suspens, veuillez utiliser les touches suivantes pour... »).
* Un menu rétro est minimaliste, percutant et direct : **PAUSE**, **REPRENDRE**, **OPTIONS**, **RECOMMENCER**.

---

## 2. Les Piliers du Véritable Rétrogaming 8-Bit / 16-Bit

### 2.1 Cadres & Bordures Rétro (Pixel Frames)
* **Double bordure biseautée classique** :
  ```css
  /* Style fenêtre SNES / Zelda classique */
  background: #0c101a;
  border: 4px solid #f0b429;
  outline: 2px solid #000000;
  box-shadow: inset 2px 2px 0 #ffe066, inset -2px -2px 0 #8b6d1f;
  border-radius: 0px;
  ```
* **Boutons biseautés 3D rétro** (effet relief instantané) :
  ```css
  border-top: 3px solid #63b3ed;
  border-left: 3px solid #63b3ed;
  border-bottom: 3px solid #1a365d;
  border-right: 3px solid #1a365d;
  border-radius: 0px;
  ```

### 2.2 Sprites & Rendu Pixel-Art Net
* Appliquer systématiquement `image-rendering: pixelated;` sur tous les canvas, sprites et icônes.
* Pour les icônes SVG en pixel-art : utiliser `shape-rendering="crispEdges"` avec des coordonnées entières sur une grille (16x16 ou 14x14).
* Pas d'émojis modernes (`🗝️`, `👑`, `❤️`) dans le HUD rétro : utiliser de vrais sprites pixel-art.

### 2.3 Organisation du HUD (Esprit Zelda classique)
* **Zone Vitalité (Haut Gauche)** : Cœurs pixel-art (pleins, demi, vides avec encadrement noir et éclat blanc).
* **Jauge Énergie / Lumière** : Barre segmentée ou dégradé étagé avec cadre biseauté. Pas d'étiquette textuelle inutile (« Lumière ») si l'icône diégétique suffit.
* **Items & Clés Rétro** : Sprites pixel-art purs flottants (Clé simple, Clé Boss ornée, Carte, Flèches) sans texte de tag ni cadre lourd autour, comme pour les cœurs. Un objet non obtenu apparaît grisé/en silhouette sombre (opacité réduite).

### 2.4 Menus Rétro (Écran Titre & Pause)
* **Zéro verbiage parasite** : Pas de sous-titres superflus ni de rappels de touches raccourcis dans le menu pause. Uniquement les boutons de choix essentiels.
* **Curseur Rétro** : Curseur flèche pixel `►` sur l'option sélectionnée.
* **Palette Contrastée** : Noir profond (`#05080f`), or impérial (`#ffd700` / `#f0b429`), rouge rubis (`#ff2a55`), bleu nuit (`#142036`).
* **Typographie Rétro** : Police bitmap / pixelisée avec `letter-spacing: 2px` et ombre noire portée nette.
