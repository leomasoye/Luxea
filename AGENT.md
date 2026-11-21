# AGENT.md — Instructions & Contexte du Projet « Games on Web 2027 »

Ce fichier constitue la source de vérité pour tout agent IA (et membre de l'équipe) travaillant sur ce projet. **Toute génération de code, choix d'architecture, ajout de dépendance ou création d'asset doit impérativement respecter les règles ci-dessous.**

---

## 1. Contexte du Concours

* **Nom du concours :** Games on Web 2027
* **Organisateur :** CGI (en partenariat avec Université Côte d'Azur et Université Aix-Marseille)
* **Plateforme officielle :** `www.cgi.com`
* **Équipe :** 1 à 3 étudiants majeurs (UCA / AMU)
* **Thème officiel retenu :** **RETROGAMING**
* **Direction de jeu :** Action-aventure 3D dans l'esprit des anciens *The Legend of Zelda* (exploration, donjons, énigmes, combat temps réel, esthétique rétro assumée).

### Calendrier & Échéances (Fuseau horaire de Paris, GMT+1)
* **Inscriptions :** du 18 novembre 2026 au **29 mars 2027 à minuit**.
* **Date limite de mise en ligne du projet & des livrables :** **15 mai 2027 à minuit** *(deadline critique — prévoir un gel des fonctionnalités au moins 7 jours avant)*.
* **Clôture de la plateforme :** 31 mai 2027 à minuit.
* **Phase d'évaluation par le jury :** du 31 mai 2027 au 15 juin 2027.
* **Cérémonie de remise des prix :** 17 juin 2027 *(noté par erreur « 17 juin 2026 » dans le règlement)*.

---

## 2. Règles Éliminatoires & Contraintes Non Négociables

Le non-respect d'une seule des règles suivantes entraîne la **disqualification automatique** de l'équipe (Articles 5.1 à 5.3).

### 2.1 Stack Technique Imposée (Article 5.1)
* **Exécution :** 100 % exécutable dans un navigateur web moderne à jour (Chrome, Firefox, Edge, Safari) via une URL publique, sans plugin ni installation locale.
* **Langages :** HTML / CSS / JavaScript *(si un bundler comme Vite ou TypeScript est utilisé en développement, le livrable final doit compiler proprement en HTML/CSS/JS standard exécutable côté client)*.
* **Moteur 3D EXCLUSIF :** **Babylon.js** (open source) doit être au cœur du jeu.
* **INTERDICTION ABSOLUE :** Aucune autre librairie ou framework 3D n'est autorisé. **Ne jamais installer ni importer** Three.js, PlayCanvas, A-Frame, PixiJS (rendu principal), Unity WebGL, Godot HTML5 ou tout autre moteur concurrent.
* **Librairies utilitaires :** Autorisées uniquement à titre utilitaire (ex. bundler, outils audio, gestion d'état, physique officielle intégrée à Babylon.js comme Havok), à condition que leurs licences open source soient vérifiées et compatibles.

### 2.2 Langue Française Obligatoire (Article 5.3)
* **Tous les livrables doivent être rédigés intégralement en français.** Aucune autre langue n'est acceptée par le jury.
* **Règle d'interface :** Tous les textes visibles par le joueur (menus, HUD, tutoriels, dialogues, écrans de victoire/défaite, boutons, commandes) doivent être en **français irréprochable**.

### 2.3 Propriété Intellectuelle & Droits d'Auteur (Article 5.1) — VIGILANCE MAXIMALE
L'inspiration *Zelda* concerne **uniquement les mécaniques de gameplay, le game feel et l'hommage rétro**. La responsabilité juridique et financière de l'équipe est engagée en cas de contrefaçon.
* **STRICTEMENT INTERDIT :**
  * Utiliser des noms, lieux ou symboles déposés par Nintendo (*Zelda, Link, Hyrule, Triforce, Ganon, Master Sword, Rubis/Rupees, Kokiri*, etc.).
  * Utiliser des modèles 3D, textures, sprites, polices, bruitages ou musiques extraits de jeux commerciaux.
* **OBLIGATOIRE :**
  * Créer un univers, un titre, des personnages et des objets **100 % originaux**.
  * Utiliser uniquement des assets créés par l'équipe (modélisation, génération procédurale, Web Audio API) ou des assets libres vérifiés (**CC0**, **MIT**, **Apache-2.0**, **CC-BY** avec attribution).
  * Documenter **chaque** librairie externe et **chaque** asset tiers (nom, source, auteur, licence exacte) dans un fichier `LICENSES.md` à la racine du projet.

---

## 3. Livrables Obligatoires (Article 5.2)

L'agent doit aider à maintenir le dépôt prêt à produire ces 4 éléments obligatoires avant le **15 mai 2027 à minuit** :

1. **Codes sources complets du jeu :** Dépôt propre, structuré, reproductible, accompagné d'un `README.md` en français expliquant l'installation et le lancement.
2. **Description détaillée du jeu (en français) :** Document de présentation clair et synthétique (concept, lien avec le thème Rétrogaming, mécaniques, choix techniques Babylon.js, commandes, équipe).
3. **Vidéo de gameplay de 30 secondes :** Rythmée, lisible, sans temps mort, capturée directement depuis le jeu (prévoir si besoin un mode « capture/démo » fluide à 60 FPS).
4. **URL jouable en ligne :** Déploiement statique fiable et rapide (ex. GitHub Pages, Vercel, Netlify) accessible sans authentification ni backend instable.

---

## 4. Critères d'Évaluation & Stratégie pour les Prix (Articles 6 & 7)

Le jury évalue les projets sur 4 axes principaux :
1. **Adéquation** avec le formulaire d'inscription et les principes du concours (Babylon.js + thème Rétrogaming).
2. **Qualité et précision** du dossier de candidature.
3. **Clarté et synthèse** des informations fournies.
4. **Originalité** de la proposition.

### Prix ciblés & implications pour l'agent
* **Le top du top / Coup de cœur CGI :** Jeu immédiatement amusant dès les 30 premières secondes, prise en main intuitive, boucle de gameplay complète (début → exploration/énigme → boss/objectif → victoire), finitions soignées (son, particules, retours visuels).
* **Prix le plus original :** Ne pas faire un simple clone ; intégrer un **twist rétrogaming unique** .
* **Prix de la performance technique :** 60 FPS constants, temps de chargement court, shaders rétro maison en GLSL/Babylon Node Material, gestion propre des lumières/ombres et optimisation mémoire exemplaire.

---

## 5. Direction Artistique & Game Design : Rétrogaming Style « Anciens Zelda »

### 5.1 Piliers de Gameplay
* **Exploration & Progression :** Zones ou salles interconnectées (extérieur + donjon), coffres à ouvrir, clés à trouver, au moins 1 à 2 objets-outils débloquant de nouveaux passages (ex. épée, bouclier, bombes, grappin ou lanterne).
* **Combat Action-Aventure :**
  * Déplacement fluide 8 directions ou analogique.
  * Attaque rapide au corps-à-corps (arc d'épée lisible avec hitbox généreuse et feedback visuel).
  * Esquive/roulade ou parade au bouclier.
  * Système de vie en cœurs (ou segments rétro), frames d'invulnérabilité + recul (*knockback*) + flash de couleur à l'impact.
  * Ennemis aux patterns lisibles (patrouille, télégraphie d'attaque, vulnérabilité) + un mini-boss ou boss final mémorable.
* **Énigmes Environnementales :** Interrupteurs au sol, blocs à pousser, braseros à allumer, ordre d'activation ou portes verrouillées.
* **Ergonomie Clavier Français :** Supporter nativement **ZQSD (AZERTY)**, **WASD (QWERTY)** et les **flèches directionnelles** sans friction. Afficher clairement les touches dans le HUD / l'écran d'aide.
* **Support Manette (Gamepad API) :** Prévoir le support optionnel des manettes via la Gamepad API du navigateur (détection automatique, mapping stick analogique + boutons). Le jury peut tester avec différents périphériques.
* **Considération Tactile/Mobile :** Le jeu cible principalement le clavier, mais le rendu doit rester correct sur tablette/mobile (canvas responsive, pas de dépendance au hover). Un pad virtuel tactile est un bonus non prioritaire.

### 5.2 Esthétique 3D Rétro avec Babylon.js
* **Géométrie Low-Poly :** Modèles anguleux et lisibles, inspirés de l'ère N64 / PS1 ou diorama moderne rétro (style *Link's Awakening* / *Tunic*).
* **Textures Pixel-Art nettes :** Utiliser systématiquement `Texture.NEAREST_SAMPLINGMODE` sur les textures pixel-art pour préserver le rendu net sans flou bilinéaire.
* **Éclairage & Ambiance :** Couleurs vives et contrastées pour la lisibilité du gameplay, léger brouillard de distance (`scene.fogMode`) façon console 32/64-bit, particules simples (carrés/sprites pixelisés pour la poussière, coups d'épée, explosions, cœurs).
* **Post-Process Rétro (optionnel et désactivable) :** Effet de pixelisation légère, dithering ou filtre CRT subtil activable dans les options, sans jamais nuire à la lisibilité des textes.
* **Audio Chiptune / Rétro :** Synthèse temps réel via **Web Audio API** ou effets sonores CC0 (coup d'épée, ouverture de coffre, résolution d'énigme, dégâts, musique d'ambiance bouclée) avec bouton Mute accessible en un clic.

### 5.3 Mécanique Originale : La Lumière de l'Épée
L'épée de Zelya est imprégnée d'une **énergie lumineuse ancienne**, constituant la mécanique centrale et distinctive du jeu (cible : Prix le plus original). Cette mécanique **doit être intégrée dès les fondations du code** et ne peut pas être ajoutée comme surcouche tardive.

* **Fonctionnement :**
  * **Mode Torche (maintien `Shift` ou clic droit) :** Zelya brandit son épée pour émettre une **aura lumineuse continue** (`PointLight` dynamique attachée à l'arme). Éclaire les zones sombres, révèle les éléments cachés, repousse certaines créatures d'ombre.
  * **Frappe Lumineuse (attaque standard) :** Chaque coup d'épée projette un **flash de lumière** bref qui endommage et illumine la zone d'impact.
  * **Jauge de Lumière (ressource limitée) :** L'énergie lumineuse se **consomme** dans l'obscurité et lors des attaques spéciales, et se **recharge** à la lumière naturelle (plaine extérieure, faisceaux de lumière dans les donjons, cristaux lumineux). Gérée visuellement dans le HUD.
* **Interactions Gameplay :**
  * Zones d'obscurité dans les donjons où la visibilité est réduite sans l'épée levée.
  * Ennemis d'ombre : ne peuvent être touchés/affaiblis que sous l'effet de la lumière.
  * Mécanismes anciens (cristaux réfracteurs, miroirs, dalles photosensibles) réagissant à la lumière de l'épée.
  * Le boss Gallen manipule les ténèbres pour éteindre les sources de lumière et forcer Zelya à gérer sa jauge.
* **Implémentation Babylon.js :**
  * `PointLight` dynamique attachée au mesh de l'épée (portée et intensité variables selon la jauge).
  * `GlowLayer` pour l'aura lumineuse rétro autour de la lame.
  * `ShadowGenerator` ciblé pour projeter des ombres significatives depuis la lumière de l'épée.
  * **Budget GPU strict :** une seule lumière dynamique pour l'épée, les autres sources restent statiques (`light.excludedMeshes` et bake d'éclairage si nécessaire).

---

## 6. Architecture Technique & Bonnes Pratiques Babylon.js

### 6.1 Structure Recommandée du Projet
```text
/
├── AGENT.md                # Ce fichier de contexte
├── README.md               # Documentation du projet (en français)
├── LICENSES.md             # Inventaire strict des licences (librairies + assets)
├── docs/                   # Dossier de candidature, GDD, script vidéo 30s (en français)
├── public/
│   └── assets/
│       ├── models/         # Modèles .glb légers (low-poly)
│       ├── textures/       # Textures pixel-art
│       └── audio/          # Sons / musiques CC0 ou originaux
└── src/
    ├── main.js             # Point d'entrée, initialisation Engine & boucle de rendu
    ├── core/               # GameManager, StateMachine, InputManager (AZERTY/QWERTY), AudioManager
    ├── world/              # Chargement des salles/zones, collisions, énigmes, interactables
    ├── entities/           # Player, Enemies, Boss, Projectiles, Pickups
    ├── rendering/          # Caméra, lumières, shaders rétro, particules
    └── ui/                 # HUD (Babylon GUI ou HTML/CSS overlay léger en français)
```

### 6.2 Exigences de Performance & Qualité Code
* **Objectif 60 FPS** sur un ordinateur portable standard (GPU intégré).
* **Optimisation Babylon.js :**
  * Utiliser `ThinInstances` ou `InstancedMesh` pour tout décor répétitif (dalles, murs, arbres, herbes, barrières).
  * Geler les matériaux et matrices statiques (`material.freeze()`, `mesh.freezeWorldMatrix()`).
  * Limiter le nombre de lumières dynamiques et de `ShadowGenerator` (ombres ciblées uniquement sur les entités clés ou blob shadows rétro très économiques).
  * Éviter les allocations d'objets (`new Vector3()`) dans la boucle `onBeforeRenderObservable` ; réutiliser des vecteurs temporaires.
* **Gestion Mémoire (Scène Unique) :** Dans l'architecture à scène unique, les zones inactives sont gérées par activation/désactivation (`mesh.setEnabled(false)`) et non par `scene.dispose()`. Nettoyer proprement (`dispose()`) les ressources temporaires (particules éphémères, timers, observables) lors d'un redémarrage de partie.
* **Physique & Collisions :** Favoriser des collisions simples, prédictibles et nerveuses (colliders Babylon / bounding boxes / grille de tuiles ou plugin physique léger) plutôt qu'une simulation physique lourde et imprévisible.
* **Navigation Ennemie :** Les ennemis doivent disposer d'un système de navigation basique (waypoints, grille de tuiles ou raycasts) pour éviter de se coincer dans les murs et garantir des patterns de mouvement lisibles et prévisibles par le joueur.
* **Budget de Performance :** Si les 60 FPS ne sont pas tenus sur GPU intégré, désactiver par ordre de priorité : (1) post-process rétro (CRT, pixelisation), (2) `ShadowGenerator` → blob-shadows, (3) brouillard, (4) réduction de la résolution du canvas via `engine.setHardwareScalingLevel()`. **Ne jamais sacrifier la lisibilité du gameplay ni la lumière dynamique de l'épée** (mécanique centrale).
* **Boucle Indépendante du Framerate :** Toujours multiplier les déplacements et timers par `deltaTime` (plafonné, ex. `Math.min(dt, 0.05)` pour éviter les sauts de collision lors d'un changement d'onglet).
* **Débogage :** L'Inspector Babylon.js (`@babylonjs/inspector`) ne doit être chargé qu'en mode développement (`import.meta.env.DEV`) et **jamais embarqué dans le build de production** (poids du bundle).

---

## 7. Règles de Comportement pour l'Agent IA

1. **Vérification de conformité avant toute action :** Avant d'ajouter une dépendance npm, vérifier qu'elle n'est pas un moteur 3D alternatif et que sa licence open source est compatible. Mettre à jour `LICENSES.md` immédiatement.
2. **Français par défaut pour le jeu et la doc :** Tout texte affiché à l'utilisateur final, tout document dans `docs/` et le `README.md` doivent être en français. *(Le code — noms de variables, fonctions, classes — peut rester en anglais standard par convention logicielle, avec des commentaires clairs).*
3. **Gameplay jouable en priorité (Vertical Slice) :** Privilégier rapidement une boucle jouable complète (bouger → explorer → résoudre une énigme → combattre → gagner/perdre → rejouer) avant de multiplier les niveaux.
4. **Ne jamais casser le build statique :** S'assurer que les chemins d'assets fonctionnent en déploiement sous sous-dossier (ex. GitHub Pages via chemins relatifs `./assets/...`) et pas uniquement sur `localhost`.
5. **Contrôles & Accessibilité :** Toute nouvelle mécanique ajoutée doit fonctionner au clavier AZERTY et QWERTY (et idéalement à la manette via Gamepad API), et être expliquée visuellement ou via l'écran d'aide en jeu.
6. **Zéro asset fantôme :** Ne jamais référencer de fichiers `.glb`, `.png` ou `.mp3` inexistants sans créer un placeholder procédural Babylon.js fonctionnel permettant de tester immédiatement.
7. **Priorité MVP :** Se référer à la section 6 du GDD (MVP Minimal & Jalons Intermédiaires) pour la priorisation. Toute fonctionnalité hors MVP est un bonus. En cas de doute sur la priorité d'une tâche, demander à l'utilisateur. Ne jamais travailler sur une fonctionnalité bonus si le MVP n'est pas encore atteint.
8. **Lumière de l'épée = fondation :** Le système de lumière dynamique de l'épée (section 5.3) est la mécanique centrale. Il doit être implémenté dès la Phase 2 et testé en continu. Ne jamais implémenter une zone de jeu (donjon, ennemi, énigme) sans vérifier son interaction avec le système de lumière.

---