## Bloomfall

Projet Three.js (Vite) réalisé dans le cadre d’un cours : l’idée est de générer un monde “vivant” avec un terrain procédural, de la végétation, des lucioles (boids) et des créatures qui évoluent (réseau de neurones + algo génétique).

### Fonctionnalités principales

- **Terrain procédural + biomes** : génération d’une heightmap, gestion d’un biome montagne / plaines, et couleurs de terrain.
- **Végétation procédurale (L‑Systems)** : génération d’arbres, buissons, herbes et fleurs à partir de presets.
- **Lucioles (boids)** : système de boids (séparation / alignement / cohésion) avec une lumière ponctuelle pour l’effet “glow”.
- **Créatures “blobs” neuronales + évolution** :
  - Chaque créature a des **gènes** (apparence) et un **réseau de neurones** (comportement).
  - À chaque génération, on garde les individus qui ont réussi à manger (fitness), puis on **reproduit** (crossover + mutation).
- **Cycle jour/nuit + générations automatiques** :
  - **1 jour = 1 minute**
  - La génération suivante apparaît automatiquement au “jour suivant”.
  - Le ciel et la lumière deviennent progressivement plus sombres pendant la minute.
  - Un affichage indique la génération et le temps restant.

### Lancer le projet

Pré-requis : Node.js + npm.

```bash
npm install
npm run dev
```

Puis ouvrir l’URL affichée par Vite.

### Contrôles

- **Caméra** : OrbitControls (clic + drag pour tourner, molette pour zoom, clic droit pour déplacer).
- **Bouton “Next Gen”** : passe manuellement à la génération suivante (optionnel, car le passage est automatique toutes les 60 secondes).

### Structure du code (repères)

- **Entrée** : `src/main.js` (setup Three.js + création des systèmes + boucle d’animation)
- **Terrain** : `src/world/TerrainGenerator.js`
- **Végétation L‑Systems** : `src/world/entities/systems/lsystem/lsystem.js`
- **Boids (lucioles)** : `src/world/entities/boids/boid.js` et `src/world/entities/boids/boidSystem.js`
- **IA / évolution** :
  - `src/world/entities/neuralnetwork/creature.js` (blob + cerveau)
  - `src/world/entities/neuralnetwork/NeuralNetwork.js` (réseau de neurones)
  - `src/world/entities/neuralnetwork/genetique.js` (algorithme génétique)
  - `src/world/entities/neuralnetwork/CreatureSystem.js` (gestion de la population, nourriture, fitness, génération suivante)

### TODO / améliorations possibles

- **Automate cellulaire** : brancher/activer proprement le système (si besoin) et l’intégrer au cycle du monde.
- **UI/Debug** : stats de génération (fitness moyenne, meilleur individu, etc.), inspection d’un individu.
- **Règles de passage de génération** : ajouter d’autres critères (ex : “toutes les créatures sont mortes”, ou “fitness totale atteinte”).
- **Rendu** : post‑processing léger, brouillard plus réaliste, variations météo.

