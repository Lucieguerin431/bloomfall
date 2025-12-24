import * as THREE from 'three';
import { Creature } from './boid.js';

/**
 * Classe BoidsSystem : Gère un groupe de créatures avec comportement de type Boids
 * Adapté pour le monde Bloomfall
 */
export class BoidsSystem {
  constructor(scene, terrainGenerator, count = 1000, options = {}) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    this.creatures = [];
    
    // Paramètres configurables avec valeurs par défaut
    this.separationDistance = options.separationDistance || 3.0;
    this.alignmentDistance = options.alignmentDistance || 5.0;
    this.cohesionDistance = options.cohesionDistance || 6.0;
    this.separationWeight = options.separationWeight || 1.5;
    this.alignmentWeight = options.alignmentWeight || 1.0;
    this.cohesionWeight = options.cohesionWeight || 1.0;
    this.avoidMountainsWeight = options.avoidMountainsWeight || 2.0;
    
    // Options pour les créatures
    this.creatureOptions = {
      maxSpeed: options.maxSpeed || 0.30,
      maxForce: options.maxForce || 0.02,
      size: options.size || 0.3,
      lightIntensity: options.lightIntensity || 8.0,
      lightRange: options.lightRange || 6.0,
      heightOffset: options.heightOffset || 1.5,
      hue: options.hue,
    };
    
    // Création des créatures
    this.initCreatures(count);
    
    console.log(`✅ ${count} créatures créées dans les plaines`);
  }

  /**
   * Initialise les créatures et les ajoute à la scène
   */
  initCreatures(count) {
    for (let i = 0; i < count; i++) {
      // Variation de couleur pour chaque créature
      const hue = 0.1 + Math.random() * 0.15; // Tons chauds
      const creature = new Creature(this.terrainGenerator, {
        ...this.creatureOptions,
        hue: hue,
      });
      
      this.creatures.push(creature);
      this.scene.add(creature.mesh);
      this.scene.add(creature.light);
    }
  }

  /**
   * Met à jour toutes les créatures (applique les règles de comportement)
   */
  update(deltaTime = 0.016) {
    // Réinitialise les accélérations
    this.creatures.forEach(creature => {
      if (creature.isAlive) {
        creature.acceleration.set(0, 0, 0);
      }
    });
    
    // Calcule les forces pour chaque créature
    this.creatures.forEach(creature => {
      if (!creature.isAlive) return;
      
      const separation = this.separation(creature);
      const alignment = this.alignment(creature);
      const cohesion = this.cohesion(creature);
      
      // Applique les forces pondérées
      creature.applyForce(separation.multiplyScalar(this.separationWeight));
      creature.applyForce(alignment.multiplyScalar(this.alignmentWeight));
      creature.applyForce(cohesion.multiplyScalar(this.cohesionWeight));
      
      // Met à jour la créature
      creature.update(deltaTime);
    });
    
    // Nettoie les créatures mortes
    this.removeDeadCreatures();
  }

  /**
   * Calcule la force de séparation (éviter les collisions)
   */
  separation(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    
    for (const other of this.creatures) {
      if (other === creature || !other.isAlive) continue;
      
      const distance = creature.position.distanceTo(other.position);
      if (distance < this.separationDistance && distance > 0) {
        // Dirige la créature à l'opposé des voisins trop proches
        const diff = new THREE.Vector3()
          .subVectors(creature.position, other.position)
          .divideScalar(distance); // Normalise et pondère par la distance
        steering.add(diff);
        total++;
      }
    }
    
    if (total > 0) {
      steering.divideScalar(total);
      steering.setLength(creature.maxSpeed);
      steering.sub(creature.velocity);
      steering.clampLength(0, creature.maxForce);
    }
    
    return steering;
  }

  /**
   * Calcule la force d'alignement (suivre la direction du groupe)
   */
  alignment(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    
    for (const other of this.creatures) {
      if (other === creature || !other.isAlive) continue;
      
      const distance = creature.position.distanceTo(other.position);
      if (distance < this.alignmentDistance) {
        steering.add(other.velocity);
        total++;
      }
    }
    
    if (total > 0) {
      steering.divideScalar(total);
      steering.setLength(creature.maxSpeed);
      steering.sub(creature.velocity);
      steering.clampLength(0, creature.maxForce);
    }
    
    return steering;
  }

  /**
   * Calcule la force de cohésion (rester groupé)
   */
  cohesion(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    
    for (const other of this.creatures) {
      if (other === creature || !other.isAlive) continue;
      
      const distance = creature.position.distanceTo(other.position);
      if (distance < this.cohesionDistance) {
        steering.add(other.position);
        total++;
      }
    }
    
    if (total > 0) {
      steering.divideScalar(total);
      steering.sub(creature.position); // Dirige vers le centre de masse
      steering.setLength(creature.maxSpeed);
      steering.sub(creature.velocity);
      steering.clampLength(0, creature.maxForce);
    }
    
    return steering;
  }

  /**
   * Ajoute une créature au système
   */
  addCreature(options = {}) {
    const creature = new Creature(this.terrainGenerator, {
      ...this.creatureOptions,
      ...options,
    });
    
    this.creatures.push(creature);
    this.scene.add(creature.mesh);
    this.scene.add(creature.light);
    
    return creature;
  }

  /**
   * Supprime une créature du système
   */
  removeCreature(creature) {
    const index = this.creatures.indexOf(creature);
    if (index !== -1) {
      this.creatures.splice(index, 1);
      this.scene.remove(creature.mesh);
      this.scene.remove(creature.light);
      creature.dispose();
    }
  }

  /**
   * Supprime toutes les créatures mortes
   */
  removeDeadCreatures() {
    const deadCreatures = this.creatures.filter(c => !c.isAlive);
    deadCreatures.forEach(creature => this.removeCreature(creature));
  }

  /**
   * Met à jour les paramètres du système
   */
  updateParameters(newOptions) {
    Object.assign(this, newOptions);
  }

  /**
   * Obtient les statistiques du système
   */
  getStatistics() {
    const alive = this.creatures.filter(c => c.isAlive).length;
    const avgEnergy = this.creatures.reduce((sum, c) => sum + c.energy, 0) / this.creatures.length;
    
    return {
      total: this.creatures.length,
      alive: alive,
      dead: this.creatures.length - alive,
      averageEnergy: avgEnergy.toFixed(1),
    };
  }

  /**
   * Réinitialise le système
   */
  reset(count) {
    this.dispose();
    this.initCreatures(count || 50);
  }

  /**
   * Nettoie le système (supprime toutes les créatures)
   */
  dispose() {
    this.creatures.forEach(creature => {
      this.scene.remove(creature.mesh);
      this.scene.remove(creature.light);
      creature.dispose();
    });
    this.creatures = [];
  }
}

/**
 * Presets de configurations pour différents comportements
 */
export const CreaturePresets = {
  // Groupe serré (banc de poissons)
  tight: {
    separationDistance: 2.0,
    alignmentDistance: 4.0,
    cohesionDistance: 5.0,
    separationWeight: 2.0,
    alignmentWeight: 1.5,
    cohesionWeight: 1.5,
    maxSpeed: 0.12,
  },
  
  // Groupe normal (défaut)
  normal: {
    separationDistance: 3.0,
    alignmentDistance: 5.0,
    cohesionDistance: 6.0,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    maxSpeed: 0.15,
  },
  
  // Groupe lâche (exploration)
  loose: {
    separationDistance: 4.0,
    alignmentDistance: 7.0,
    cohesionDistance: 10.0,
    separationWeight: 1.0,
    alignmentWeight: 0.8,
    cohesionWeight: 0.8,
    maxSpeed: 0.18,
  },
  
  // Essaim chaotique
  chaotic: {
    separationDistance: 2.5,
    alignmentDistance: 3.0,
    cohesionDistance: 4.0,
    separationWeight: 2.5,
    alignmentWeight: 0.5,
    cohesionWeight: 0.5,
    maxSpeed: 0.2,
  },
  
  // Lent et paisible
  peaceful: {
    separationDistance: 3.5,
    alignmentDistance: 6.0,
    cohesionDistance: 8.0,
    separationWeight: 1.2,
    alignmentWeight: 1.2,
    cohesionWeight: 1.2,
    maxSpeed: 0.1,
  },
};

export default BoidsSystem;