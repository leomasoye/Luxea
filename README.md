# Luxea — Jeu Action-Aventure 3D Rétrogaming

Projet développé dans le cadre du concours **Games on Web 2027 (CGI)** en partenariat avec Université Côte d'Azur et Université Aix-Marseille.

---

## 🎮 Synopsis & Concept du Jeu

**Luxea** est un jeu d'action-aventure 3D en vue isométrique/zénithale, hommage vibrant aux premiers jeux d'aventure rétro façon *The Legend of Zelda*.

Le joueur incarne **Zelya**, une jeune aventurière armée d'une simple épée courte au cœur de la Plaine d'Éveil. Dès ses premiers pas, des bruits sourds et de faibles appels résonnent derrière la grande porte scellée du sanctuaire au nord : son compagnon **Lyo** y est retenu prisonnier par le redoutable **Gallen** !

Pour le délivrer, Zelya devra explorer la plaine et ses mystères :
1. **La Voie Ouverte (Est) :** Une caverne d'initiation gardée par des créatures gélatineuses, abritant un interrupteur secret et la Clé simple.
2. **La Voie Verrouillée (Ouest) :** Un sanctuaire antique défendu par les sbires de Gallen, renfermant la Clé du Boss.
3. **La Chambre de Gallen (Nord) :** L'épreuve finale face à Gallen pour libérer Lyo et célébrer la victoire.

---

## 🕹️ Commandes du Jeu

Le jeu supporte nativement les claviers français (AZERTY), internationaux (QWERTY), les flèches et les manettes :

| Action | Clavier AZERTY / QWERTY | Souris | Manette |
|---|---|---|---|
| **Déplacement** | `Z Q S D` / `W A S D` / `Flèches` | — | Stick analogique gauche / Croix |
| **Attaquer à l'épée** | `Espace` ou `J` | Clic gauche | Bouton A (Xbox) / Croix (PS) |
| **Mode Torche (Lumière)** | Maintenir `Shift` | Clic droit maintenu | Gâchette droite / Bouton Y |
| **Roulade / Esquive** | `K` | — | Bouton B (Xbox) / Rond (PS) |
| **Interagir / Lire** | `E` ou `Espace` | — | Bouton A |
| **Pause** | `Échap` ou `P` | — | Bouton Start |

---

## 🚀 Installation & Lancement Local

### Prérequis
* [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
* Navigateur web moderne à jour (Chrome, Firefox, Edge, Safari)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage du serveur de développement
```bash
npm run dev
```
Ouvrez ensuite votre navigateur sur `http://localhost:5173`.

### 3. Compilation pour la production
```bash
npm run build
```
Les fichiers compilés prêts à être déployés statiquement (ex: GitHub Pages, Netlify, Vercel) sont générés dans le dossier `dist/`.

Pour tester le build de production localement :
```bash
npm run preview
```

---

## 🛠️ Stack Technique

* **Moteur 3D :** Babylon.js (`@babylonjs/core`) — moteur exclusif imposé par le règlement du concours.
* **Frontend :** HTML5 / CSS3 / JavaScript standard (Vite en bundler).
* **Audio :** Web Audio API (effets sonores chiptune et ambiances rétro 100 % synthétisés en temps réel).
* **UI :** Overlay HTML/CSS pur léger (~0 Ko de surcoût, sans `@babylonjs/gui`) avec projection 3D -> 2D.
* **Direction Artistique :** Low-poly rétro, éclairage dynamique de l'épée avec jauge, 60 FPS constants.

---

## 📋 Documentation & Feuille de Route

* [AGENT.md](./AGENT.md) : Règles strictes, contraintes du concours et architecture.
* [docs/GDD.md](./docs/GDD.md) : **Game Design Document détaillé et feuille de route de la Plaine de Base.**
* [LICENSES.md](./LICENSES.md) : Inventaire des licences open-source et des assets tiers.
