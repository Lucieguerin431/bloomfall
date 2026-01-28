import * as THREE from 'three';
import Genetic from './genetique.js';
import { createCreatureFromGenes } from './creature.js';

export class CreatureSystem {
  constructor(scene, terrainGenerator, config = {}) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    this.config = Object.assign({
      populationSize: 24,
      mutationRate: 0.08,
      worldSize: 200,
      foodCount: 40
    }, config);

    this.creatures = [];
    this.foods = [];
    this.mainGroup = new THREE.Group();
    this.foodGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.scene.add(this.foodGroup);
    this.genetic = new Genetic(this.config.populationSize, 10);
    this.initLevel();
  }

  initLevel() {
    this.spawnFood(this.config.foodCount);
    this.createGeneration();
  }

  spawnFood(count) {
    while (this.foodGroup.children.length > 0) this.foodGroup.remove(this.foodGroup.children[0]);
    this.foods = [];
    const geom = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0x551100 });
    for (let i = 0; i < count; i++) {
      const pos = this.getRandomPositionOnTerrain();
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos).y += 0.5;
      this.foodGroup.add(mesh);
      this.foods.push({ mesh, x: pos.x, z: pos.z, active: true });
    }
  }

  createGeneration() {
    while (this.mainGroup.children.length > 0) this.mainGroup.remove(this.mainGroup.children[0]);
    this.creatures = [];
    this.genetic.individuals.forEach((ind, index) => {
      const creature = createCreatureFromGenes(ind.genes, ind.brainGenome);
      const pos = this.getRandomPositionOnTerrain();
      creature.x = pos.x; creature.y = pos.z;
      creature.mesh.position.set(pos.x, pos.y, pos.z);
      this.mainGroup.add(creature.mesh);
      this.creatures.push({ logic: creature, mesh: creature.mesh, index: index, fitness: 0 });
      ind.fitness = 0;
    });
  }

  update(dt) {
    const halfSize = (this.config.worldSize / 2) - 2; // Marge de sécurité
    this.creatures.forEach(c => {
      const { logic, mesh } = c;
      const target = this.getNearestFood(c.logic.x, c.logic.y);
      logic.distanceFood = target ? target.dist : 100;

      logic.update(dt * 20);


      // --- CONSTRAINT: BLOCAGE AUX BORDURES ---
      logic.x = Math.max(-halfSize, Math.min(halfSize, logic.x));
      logic.y = Math.max(-halfSize, Math.min(halfSize, logic.y));

      if (target && target.dist < 1.5) this.eatFood(target.index, c);

      const groundHeight = this.terrainGenerator.getHeightAt(logic.x, logic.y);
      mesh.position.set(logic.x, groundHeight, logic.y);
      mesh.rotation.y = -logic.angle;

      if (logic.energy <= 0) mesh.visible = false;
      if (target) {
        const food = this.foods[target.index];
        c.logic.distanceFood = target.dist;

        // --- CALCUL DE L'ANGLE RELATIF (Crucial !) ---
        const dx = food.x - c.logic.x;
        const dy = food.z - c.logic.y; // z est le y en 2D logic
        const angleToTarget = Math.atan2(dy, dx);

        // On calcule la différence entre l'angle de la nourriture et l'angle actuel du blob
        let diff = angleToTarget - c.logic.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        c.logic.angleToFood = diff; // Valeur entre -PI et PI
      }
    });
  }

  getNearestFood(x, z) {
    let bestDist = Infinity; let bestIdx = -1;
    for (let i = 0; i < this.foods.length; i++) {
      if (!this.foods[i].active) continue;
      const d = Math.sqrt(Math.pow(this.foods[i].x - x, 2) + Math.pow(this.foods[i].z - z, 2));
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx !== -1 ? { dist: bestDist, index: bestIdx } : null;
  }

  eatFood(foodIndex, creatureObj) {
    const f = this.foods[foodIndex];
    f.active = false; f.mesh.visible = false;
    creatureObj.logic.energy += 30;
    creatureObj.fitness += 1;
    this.genetic.individuals[creatureObj.index].fitness = creatureObj.fitness;
    const newPos = this.getRandomPositionOnTerrain();
    f.x = newPos.x; f.z = newPos.z;
    f.mesh.position.set(newPos.x, newPos.y + 0.5, newPos.z);
    f.mesh.visible = true; f.active = true;
  }

  nextGeneration() {
    const selection = new Set();
    this.creatures.forEach(c => { if (c.fitness > 0) selection.add(c.index); });
    this.genetic.nextGeneration(selection);
    this.createGeneration();
  }

  getRandomPositionOnTerrain() {
    const range = this.config.worldSize / 2 - 10;
    let x, z, y, biome, attempt = 0;
    do {
      x = (Math.random() - 0.5) * 2 * range;
      z = (Math.random() - 0.5) * 2 * range;
      biome = this.terrainGenerator.getBiomeAt(x, z);
      y = this.terrainGenerator.getHeightAt(x, z);
      attempt++;
    } while (biome === 'mountain' && attempt < 15);
    return new THREE.Vector3(x, y, z);
  }
}