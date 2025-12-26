import * as THREE from 'three';
import Genetic from './genetique.js'; 
import { createCreatureFromGenes } from './creature.js'; 

export class CreatureSystem {
  constructor(scene, terrainGenerator, config = {}) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    
    // Config par défaut
    this.config = Object.assign({
      populationSize: 24,
      mutationRate: 0.08,
      worldSize: 200, // Taille de la map Bloomfall
      foodCount: 40
    }, config);

    this.creatures = [];
    this.foods = [];
    
    // Groupes Three.js
    this.mainGroup = new THREE.Group();
    this.foodGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.scene.add(this.foodGroup);

    // Moteur génétique
    this.genetic = new Genetic(this.config.populationSize, 10);

    // Initialisation
    this.initLevel();
  }

  initLevel() {
    this.spawnFood(this.config.foodCount);
    this.createGeneration();
  }

  // --- Gestion de la Nourriture ---
  spawnFood(count) {
    // Nettoyage visuel ancienne nourriture
    while(this.foodGroup.children.length > 0){ 
      this.foodGroup.remove(this.foodGroup.children[0]); 
    }
    this.foods = [];

    const geom = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0x551100 });

    for(let i=0; i<count; i++) {
      const pos = this.getRandomPositionOnTerrain();
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.5; // Un peu au dessus du sol
      
      this.foodGroup.add(mesh);
      this.foods.push({ mesh, x: pos.x, z: pos.z, active: true });
    }
  }

  // --- Gestion des Créatures ---
  createGeneration() {
    // Nettoyage créatures précédentes
    while(this.mainGroup.children.length > 0){
        this.mainGroup.remove(this.mainGroup.children[0]);
    }
    this.creatures = [];

    const individuals = this.genetic.individuals;

    individuals.forEach((ind, index) => {
      // Création instance (mesh + cerveau)
      const creature = createCreatureFromGenes(ind.genes, ind.brainGenome);
      
      // Position aléatoire sur le terrain
      const pos = this.getRandomPositionOnTerrain();
      creature.x = pos.x;
      creature.y = pos.z; // Attention: creature.js utilise Y comme axe Z (profondeur)
      
      // Ajustement visuel
      creature.mesh.position.set(pos.x, pos.y, pos.z);
      
      // Stockage
      this.mainGroup.add(creature.mesh);
      this.creatures.push({ 
        logic: creature, 
        mesh: creature.mesh, 
        index: index,
        fitness: 0 
      });
      
      // Reset fitness génétique
      ind.fitness = 0;
    });
  }

  // --- Boucle Principale ---
  update(dt) {
    this.creatures.forEach(c => {
      const logic = c.logic;
      const mesh = c.mesh;

      // 1. Trouver nourriture la plus proche
      const target = this.getNearestFood(mesh.position.x, mesh.position.z);
      
      // 2. Inputs du cerveau
      logic.distanceFood = target ? target.dist : 100;
      logic.distanceWall = 0; // On simplifie pour l'instant (ou calcul distance centre map)

      // 3. Update Cerveau & Physique (interne)
      logic.update(dt * 20); // *20 pour accélérer un peu la simulation

      // 4. Manger ?
      if (target && target.dist < 1.5) {
        this.eatFood(target.index, c);
      }

      // 5. Appliquer la hauteur du terrain (Raycast like)
      const groundHeight = this.terrainGenerator.getHeightAt(logic.x, logic.y);
      
      // Mise à jour visuelle Three.js
      // creature.js utilise logic.y pour la profondeur (Z), et logic.x pour X
      mesh.position.set(logic.x, groundHeight, logic.y);
      
      // Orientation correcte sur la pente
      mesh.rotation.y = -logic.angle;

      // Gestion de l'énergie (mort ?)
      if (logic.energy <= 0) {
        mesh.visible = false; // Ou scaling à 0
      }
    });
  }

  getNearestFood(x, z) {
    let bestDist = Infinity;
    let bestIdx = -1;
    
    for(let i=0; i<this.foods.length; i++) {
      if (!this.foods[i].active) continue;
      
      const dx = this.foods[i].x - x;
      const dz = this.foods[i].z - z;
      const d = Math.sqrt(dx*dx + dz*dz);
      
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx !== -1 ? { dist: bestDist, index: bestIdx } : null;
  }

  eatFood(foodIndex, creatureObj) {
    const f = this.foods[foodIndex];
    f.active = false;
    f.mesh.visible = false;
    
    // Récompense
    creatureObj.logic.energy += 30; // Gain d'énergie
    creatureObj.fitness += 1;       // Score pour la selection naturelle
    this.genetic.individuals[creatureObj.index].fitness = creatureObj.fitness;

    // Respawn de la nourriture ailleurs pour garder le monde dynamique
    const newPos = this.getRandomPositionOnTerrain();
    f.x = newPos.x;
    f.z = newPos.z;
    f.mesh.position.set(newPos.x, newPos.y + 0.5, newPos.z);
    f.mesh.visible = true;
    f.active = true;
  }

  nextGeneration() {
    // Sélection des meilleurs (ceux qui ont mangé)
    const selection = new Set();
    this.creatures.forEach(c => {
      if (c.fitness > 0) selection.add(c.index);
    });

    // Evolution
    this.genetic.nextGeneration(selection);
    
    // Reset visuel
    this.createGeneration();
    console.log(`Génération ${this.genetic.generation} lancée !`);
  }

  getRandomPositionOnTerrain() {
    // On essaye de trouver une position dans les "Plains"
    const range = this.config.worldSize / 2 - 10;
    let x, z, y;
    let biome = '';
    let attempt = 0;
    
    do {
      x = (Math.random() - 0.5) * 2 * range;
      z = (Math.random() - 0.5) * 2 * range;
      biome = this.terrainGenerator.getBiomeAt(x, z);
      y = this.terrainGenerator.getHeightAt(x, z);
      attempt++;
    } while (biome === 'mountain' && attempt < 10); // On évite les sommets si possible
    
    return new THREE.Vector3(x, y, z);
  }
}