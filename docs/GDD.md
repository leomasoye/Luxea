# Game Design Document (GDD) & Feuille de Route — Projet « Lezda »
**Concours Games on Web 2027 — CGI**  
**Thème :** Rétrogaming | **Moteur :** Babylon.js | **Langue :** Français

> [!NOTE]
> **Document vivant & évolutif :** Rien dans ce document n'est gravé dans le marbre. L'architecture, les mécaniques, l'agencement et l'ordre des tâches sont continuellement ajustés et enrichis au fil des playtests, des retours et de nos itérations pratiques.

---

## 1. Vision & Cadrage du Projet

L'objectif est de réaliser un jeu d'action-aventure 3D hommage aux premiers *The Legend of Zelda*, avec un rendu rétro chaleureux, une excellente gestion de la lumière et un game feel soigné et fluide, tout en garantissant une réalisation maîtrisée avant la date limite du concours.

### Piliers de Conception
* **Game Feel & Plaisir Immédiat :** Avant de créer des dizaines de salles, le simple fait de se déplacer dans la zone de base, de trancher des buissons et de manier son épée doit être dynamique, propre et satisfaisant à 60 FPS.
* **Vertical Slice itérative :** Chaque étape produit une brique jouable, stable et vérifiable.
* **Rétrogaming 3D élégant :** Esthétique low-poly, textures pixel-art nettes (`Texture.NEAREST_SAMPLINGMODE`), éclairages colorés et contrastés, audio chiptune réactif.
* **Conformité stricte :** 100 % en français, 100 % Babylon.js, zéro dépendance non libre, zéro élément sous copyright.

---

## 2. Structure Globale du Monde & Déroulement du Jeu

```text
               +-----------------------------------+
               |       PORTE DU BOSS (Fermée)      |
               |     Nécessite la Clé du Boss      |
               +-----------------+-----------------+
                                 |
                                 v
               +-----------------------------------+
               |        [CHAMBRE DU BOSS]          |
               | Arène, Boss avec patterns clairs  |
               |       -> VICTOIRE & MONDE LIBRE   |
               +-----------------------------------+
                                 ^
                                 |
+----------------------+   +-----+-----+   +----------------------+
|    [CHEMIN 2]        |<--|  PLAINE   |-->|     [CHEMIN 1]       |
| Sanctuaire des Ruines|   | D'ÉVEIL   |   | Caverne du Gardien   |
| (Fermé au départ)    |   |  (HUB)    |   | (Ouvert au départ)   |
| Porte débloquée par  |   +-----------+   | Combat basique,      |
| la Clé simple        |                   | énigme interrupteur, |
| Ennemis avancés      |   Joueur + Épée   | Récompense :         |
| Récompense :         |   3 cœurs         | Clé simple           |
| Clé du Boss          |                   +----------------------+
+----------------------+
```

### 2.1 La Zone de Départ : La Plaine d'Éveil (Hub Central)
* Un espace extérieur verdoyant de taille modeste, style low-poly rétro, avec une **bonne gestion des lumières** (soleil chaud, ombres douces ou blob-shadows, ambiance lumineuse).
* Le joueur commence immédiatement avec son **épée courte**.
* Présence de buissons / hautes herbes à découper avec retours visuels (possibilité de trouver un cœur pour se soigner).
* Trois passages bien visibles :
  1. **Chemin 1 (Est) : Ouvert immédiatement.** Concrétisé par une arche naturelle ou l'entrée d'une petite caverne.
  2. **Chemin 2 (Ouest) : Fermé par une grille de bronze.** Nécessite la *Clé simple*.
  3. **Chemin 3 (Nord) : Fermé par une imposante porte à tête de monstre / dorée.** Nécessite la *Clé du Boss*.

### 2.2 Chemin 1 : La Caverne du Gardien (Apprentissage & Clé 1)
* **Objectif :** Apprendre à frapper, esquiver et interagir.
* **Ennemis :** 2 à 3 gelées/blobs sautillants, lents et faciles à anticiper.
* **Énigme :** Un interrupteur au sol ou un bloc à pousser sur une dalle pour ouvrir une herse.
* **Récompense dans le coffre :** La **Clé simple**, qui ouvre la porte du Chemin 2.

### 2.3 Chemin 2 : Le Sanctuaire des Ruines (Défi & Clé du Boss)
* **Objectif :** Valider les compétences de combat et de positionnement.
* **Ennemis :** Ennemis armés (ex. squelette ou automate rétro) attaquant avec une animation télégraphiée (coup circulaire ou projectile lent esquivable).
* **Piège / Obstacle :** Dalles piégées ou sol à trous nécessitant de bien se placer.
* **Récompense dans le coffre :** La **Clé du Boss** (Clé d'Or).

### 2.4 Chemin 3 : L'Arène du Boss & Victoire
* **Arène fermée :** La porte se referme derrière le joueur une fois entré.
* **Le Boss (« Le Golem Ancien de Rock » ou « Le Gardien de Pierre ») :**
  * Barre de vie dédiée affichée en haut de l'écran.
  * **Pattern lisible en 3 temps :**
    1. Charge ou onde de choc télégraphiée.
    2. Phase de vulnérabilité / étourdissement temporaire où le joueur peut porter 2 ou 3 coups d'épée.
    3. Invulnérabilité et réinitialisation de l'attaque.
  * 3 à 5 phases de frappe nécessaires pour le vaincre.
* **Victoire & Post-Game :**
  * Fanfare rétro, explosion en particules de cubes.
  * Apparition d'un réceptacle de cœur géant / trophée.
  * **Pas de fin bloquante :** Le monde reste entièrement parcourable après la victoire, permettant de continuer à explorer. À voir pour une éventuelle suite.

---

## 3. Plan Complet & Détaillé : La Plaine de Base (Hub Central)

Afin de garantir une qualité irréprochable et un game feel optimal, le développement initial se concentre **exclusivement sur la réalisation complète et soignée de la Plaine d'Éveil**. Tout doit y être propre, fluide, beau et conforme aux meilleures pratiques Babylon.js avant d'attaquer les donjons.

```text
       [Porte du Boss] (Nord)
              |
[Grille] - (PLAINE) - [Arche Ouverte] (Est)
(Ouest)       |
          [Spawn]
    (Herbes, Panneau, Épée)
```

---

### Phase 1 : Socle Technique, Moteur & Architecture Propre
* **Objectif :** Poser les bases du code, le pipeline de build et la boucle de rendu sans dette technique.
* **Actions :**
  * Initialisation de Vite avec template standard (HTML5 / ES Modules).
  * Installation ciblée de `@babylonjs/core` (et `@babylonjs/gui` si besoin pour le HUD).
  * Structure du code modulaire dans `src/` :
    * `src/main.js` : Bootstrap, gestion du canvas, cycle de vie.
    * `src/core/` : `GameManager`, `InputManager`, `AudioManager`.
    * `src/rendering/` : `CameraManager`, `LightingManager`.
    * `src/world/` : `LevelManager`, `EnvironmentManager`.
    * `src/entities/` : `Player`, `Weapon`, `Props`.
    * `src/ui/` : `HUD`, `DialogueBox`.
  * Boucle de jeu robuste découplée du framerate via `deltaTime` plafonné (`Math.min(dt, 0.05)`).
  * Canvas plein écran avec redimensionnement dynamique réactif (`engine.resize()`).
  * Compteur de performances discret (FPS et temps de frame) visible uniquement en mode développement (`import.meta.env.DEV`).

---

### Phase 2 : Rendu Rétro, Caméra & Gestion des Lumières
* **Objectif :** Créer immédiatement une identité visuelle attrayante, chaleureuse et lisible.
* **Actions :**
  * **Caméra Zénithale / Isométrique :**
    * Vue plongeante 3/4 rétro (angle fixe ~45°).
    * Suivi lissé du joueur par interpolation (`Vector3.Lerp`) pour éliminer toute saccade.
    * Limitation des mouvements de caméra aux bornes de la plaine (pas de vide hors-champ).
  * **Éclairage & Ombres :**
    * Lumière directionnelle principale (soleil chaud légèrement doré) projetant des ombres douces ou rétro.
    * Lumière hémisphérique d'appoint (bleutée / ciel doux) pour déboucher les zones d'ombre sans perte de lisibilité.
    * Ombres maîtrisées : utilisation de `ShadowGenerator` optimisé (résolution contrôlée, filtrage propre) ou blob-shadows rétro sous le joueur pour un coût GPU minime.
  * **Atmosphère & Couleurs :**
    * Léger brouillard de distance (`scene.fogMode = Scene.FOGMODE_EXP2`) teinté aux couleurs de l'horizon pour apporter de la profondeur.
    * Réglage du pipeline de textures : forcer le filtrage le plus net (`Texture.NEAREST_SAMPLINGMODE`) pour toutes les textures rétro pixel-art.

---

### Phase 3 : Le Héros, Contrôles Fluides & Déplacement
* **Objectif :** Assurer une prise en main immédiate, nerveuse et ergonomique.
* **Actions :**
  * **Visuel du Héros :**
    * Modèle low-poly stylisé original (silhouette rétro lisible, cape ou tunique colorée, fourreau et épée au dos/côté).
  * **InputManager multi-disposition :**
    * Prise en charge native sans configuration requise des touches **ZQSD (AZERTY)**, **WASD (QWERTY)** et des **Flèches directionnelles**.
    * Gestion fluide des diagonales (vitesse normalisée pour éviter d'aller plus vite en diagonale).
  * **Cinématique de Déplacement :**
    * Accélération vive et arrêt net sans inertie frustrante (game feel arcade/rétro).
    * Rotation douce mais rapide du personnage pour faire face à la direction du mouvement.
    * Micro-animation procédurale de marche (balancement subtil, rebond régulier du corps) pour donner vie au héros sans nécessiter de rig complexe au départ.

---

### Phase 4 : Système d'Attaque & Combat Fondateur
* **Objectif :** Rendre le coup d'épée gratifiant et précis dès la plaine.
* **Actions :**
  * **Commandes :** Déclenchement de l'attaque via `Espace`, touche `J` ou clic gauche de la souris.
  * **Animation du Coup d'Épée :**
    * Frappe en arc de cercle horizontal (sweep ~180° devant le personnage).
    * Effet visuel rétro : arc tranchant lumineux ou traînée semi-transparente (*slash arc*).
  * **Gestion de la Hitbox :**
    * Zone de frappe active temporaire devant le joueur pendant la fenêtre d'impact.
    * Micro-ralentissement du déplacement pendant la frappe (frappe posée avec retour rapide au mouvement).
  * **Retour Visuel & Impact :**
    * Légère secousse de caméra (*screen shake* très léger) lors d'un coup réussi sur un obstacle.

---

### Phase 5 : Modélisation de la Plaine d'Éveil & Optimisations
* **Objectif :** Construire un terrain complet, délimité et techniquement irréprochable.
* **Actions :**
  * **Topographie & Sol :**
    * Terrain herbeux texturé avec sentiers de terre battue reliant le point d'apparition aux trois passages.
    * Variations subtiles de relief low-poly (petits tertres, dénivelés légers).
  * **Bordures & Décorations :**
    * Falaises rocheuses et arbres stylisés fermant l'espace de jeu.
    * Utilisation impérative de `ThinInstances` ou `InstancedMesh` pour tous les éléments répétés (arbres, roches, fleurs, dalles) afin de réduire les draw calls à un minimum absolu.
  * **Bonnes Pratiques de Performance (Section 6 AGENT.md) :**
    * Geler les matrices mondiales (`mesh.freezeWorldMatrix()`) et matériaux (`material.freeze()`) de tous les éléments statiques.
    * Pré-allocation des vecteurs temporaires pour bannir tout `new Vector3()` dans la boucle de rendu.
  * **Collisions :**
    * Colliders invisibles simples ou bounding boxes optimisées pour empêcher le joueur de traverser les parois rocheuses ou les arbres.

---

### Phase 6 : Les 3 Passages & Panneau d'Information
* **Objectif :** Poser les points d'ancrage clairs vers le reste du monde.
* **Actions :**
  * **Chemin 1 (Est) — La Voie Ouverte :**
    * Arche naturelle taillée dans la roche ou entrée de caverne invitant à l'exploration.
    * Faisceau de lumière ou torches d'ambiance guidant le regard.
    * Déclencheur de zone préparant la transition vers la caverne.
  * **Chemin 2 (Ouest) — La Voie Verrouillée :**
    * Grille en fer/bronze fermée barrant un canyon ou un escalier de pierre.
    * Zone de déclenchement affichant un message : *« La grille est solidement verrouillée. Une Clé simple est requise. »*.
  * **Chemin 3 (Nord) — La Porte du Boss :**
    * Grand portail de pierre surmonté de sculptures imposantes (tête de golem ou bas-reliefs anciens).
    * Deux serrures ou gemmes éteintes avec message au contact : *« La Porte du Sanctuaire demeure scellée. Seule la Clé du Boss peut l'ouvrir. »*.
  * **Panneau en Bois Interactif (Spawn) :**
    * Panneau planté près du point de départ.
    * Interaction en français à l'approche (*« [E] ou [Espace] Lire le panneau »*) affichant les touches de déplacement et d'attaque.

---

### Phase 7 : Buissons Tranchables & Économie Rétro
* **Objectif :** Apporter de l'interactivité vivante et la première boucle de récompense.
* **Actions :**
  * **Buissons Tranchables :**
    * Dispersés dans la plaine (instanciés).
    * Découpés instantanément au contact de la hitbox de l'épée.
    * Effet de destruction : disparition du buisson accompagnée d'une explosion de particules de feuilles vertes / débris low-poly.
  * **Système de Butin (Drops) :**
    * Probabilité à la coupe de faire apparaître un petit cœur de santé (ou une gemme).
    * Petit cœur flottant avec légère rotation sur lui-même.
    * Ramassage automatique dès que le joueur marche dessus, déclenchant un son cristallin et régénérant la vie.

---

### Phase 8 : Interface Utilisateur (HUD) & Menus Rétro
* **Objectif :** Fournir toutes les informations vitales en français sans encombrer l'écran.
* **Actions :**
  * **HUD Supérieur :**
    * Indicateur de vie sous forme de 3 cœurs rouges rétro (pleins, demi-cœurs ou vides).
    * Zone d'inventaire minimaliste : icône de *Clé simple* (grisée si absente, dorée si possédée) et icône de *Clé du Boss*.
  * **Système de Notifications / Dialogue :**
    * Boîte de texte propre en bas de l'écran pour les panneaux et messages de portes.
    * Style parchemin rétro ou bandeau sombre bordé de pixel-art avec police lisible.
  * **Menu Pause & Aide :**
    * Accessible via la touche `Échap` ou `P`.
    * Rappel complet des touches (clavier français ZQSD / QWERTY) et bouton de reprise.

---

### Phase 9 : Ambiance Sonore & Bruitages Rétro (Web Audio API)
* **Objectif :** Donner un relief auditif complet au gameplay sans dépendance externe lourde.
* **Actions :**
  * Moteur sonore synthétisé en temps réel via l'API Web Audio ou bruitages CC0 légers :
    * Bruit de pas léger et rythmé lors de la course sur l'herbe.
    * Balancement d'épée aérien (*whoosh* rétro).
    * Bruit sec de tranche pour les buissons.
    * Carillon de ramassage de cœur / objet.
    * Bruit sourd d'interaction sur une porte fermée.
  * Nappe musicale d'ambiance rétro extérieure (mélodie douce et entraînante d'aventure).
  * Bouton Muet / contrôle du volume facilement accessible.

---

### Phase 10 : Optimisations Finales de la Plaine & Recette Jouable
* **Objectif :** Valider à 100 % la plaine de base avant de commencer le premier donjon.
* **Actions :**
  * Profiling mémoire et framerate : 60 FPS inébranlables sur carte graphique intégrée.
  * Vérification de l'absence totale de fuites mémoire ou d'instanciations cachées.
  * Validation du game feel global (vitesse, portée de l'épée, lisibilité des lumières et de la caméra).
  * Sauvegarde propre de l'état de la plaine (état des buissons coupés, objets ramassés).

---

## 4. Ce qui viendra ensuite (Après validation de la Plaine)

Une fois la plaine de base validée et jugée parfaite en termes de maniabilité et d'esthétique, nous pourrons dérouler les étapes suivantes :
1. **La Caverne du Gardien (Chemin 1) :** Première salle intérieure, IA des blobs/gelées, énigme d'interrupteur, obtention de la *Clé simple*.
2. **Le Sanctuaire des Ruines (Chemin 2) :** Déverrouillage de la grille, combat contre le garde armé, énigme de positionnement, obtention de la *Clé du Boss*.
3. **La Chambre du Boss (Chemin 3) :** Déverrouillage de la grande porte, combat contre *Le Golem Ancien de Rock*, victoire sans blocage du monde.
4. **Extensions optionnelles :** Deuxième outil, énigmes bonus, boîte de dialogue narrative.

---

## 5. Notes sur la Flexibilité & les Évolutions Futures
> Comme précisé en en-tête, **rien n'est figé**. Durant le développement de chaque phase de la plaine :
> * Les paramètres (vitesse du joueur, taille de la plaine, forme des buissons, couleurs, intensité des lumières) seront ajustés à la volée selon nos impressions manette/clavier en main.
> * Des mécaniques supplémentaires pourront être introduites ou simplifiées en fonction de ce qui sert le mieux le plaisir de jeu et les performances.
