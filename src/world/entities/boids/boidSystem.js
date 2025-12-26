import * as THREE from 'three';
import { Creature } from './boid.js';

export class BoidsSystem {
  constructor(scene, terrainGenerator, count = 1000, options = {}) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    this.creatures = [];
    this.worldSize = options.worldSize || 400; // Doit correspondre au terrain
    
    this.separationDistance = options.separationDistance || 3.0;
    this.alignmentDistance = options.alignmentDistance || 5.0;
    this.cohesionDistance = options.cohesionDistance || 6.0;
    this.separationWeight = options.separationWeight || 1.5;
    this.alignmentWeight = options.alignmentWeight || 1.0;
    this.cohesionWeight = options.cohesionWeight || 1.0;
    this.containmentWeight = options.containmentWeight || 3.0; // Force pour rester sur la map
    
    this.creatureOptions = {
      maxSpeed: options.maxSpeed || 0.30,
      maxForce: options.maxForce || 0.02,
      size: options.size || 0.3,
      lightIntensity: options.lightIntensity || 8.0,
      lightRange: options.lightRange || 6.0,
      heightOffset: options.heightOffset || 1.5,
    };
    
    this.initCreatures(count);
  }

  initCreatures(count) {
    for (let i = 0; i < count; i++) {
      const creature = new Creature(this.terrainGenerator, { ...this.creatureOptions, hue: 0.1 + Math.random() * 0.15 });
      this.creatures.push(creature);
      this.scene.add(creature.mesh);
      this.scene.add(creature.light);
    }
  }

  update(deltaTime = 0.016) {
    this.creatures.forEach(creature => {
      if (!creature.isAlive) return;
      creature.acceleration.set(0, 0, 0);

      const sep = this.separation(creature).multiplyScalar(this.separationWeight);
      const ali = this.alignment(creature).multiplyScalar(this.alignmentWeight);
      const coh = this.cohesion(creature).multiplyScalar(this.cohesionWeight);
      const cont = this.containment(creature).multiplyScalar(this.containmentWeight);
      
      creature.applyForce(sep);
      creature.applyForce(ali);
      creature.applyForce(coh);
      creature.applyForce(cont);
      
      creature.update(deltaTime);
    });
    this.removeDeadCreatures();
  }

  /**
   * Empêche les boids de sortir de la worldSize
   */
  containment(creature) {
    const steering = new THREE.Vector3();
    const limit = this.worldSize / 2 - 15; // Marge de 15 unités
    
    if (Math.abs(creature.position.x) > limit || Math.abs(creature.position.z) > limit) {
      // Force vers le centre (0, hauteur_actuelle, 0)
      const target = new THREE.Vector3(0, creature.position.y, 0);
      steering.subVectors(target, creature.position);
      steering.setLength(creature.maxSpeed);
      steering.sub(creature.velocity);
      steering.clampLength(0, creature.maxForce);
    }
    return steering;
  }

  separation(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of this.creatures) {
      const d = creature.position.distanceTo(other.position);
      if (other !== creature && d < this.separationDistance) {
        const diff = new THREE.Vector3().subVectors(creature.position, other.position).divideScalar(d);
        steering.add(diff); total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total).setLength(creature.maxSpeed).sub(creature.velocity).clampLength(0, creature.maxForce);
    }
    return steering;
  }

  alignment(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of this.creatures) {
      if (other !== creature && creature.position.distanceTo(other.position) < this.alignmentDistance) {
        steering.add(other.velocity); total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total).setLength(creature.maxSpeed).sub(creature.velocity).clampLength(0, creature.maxForce);
    }
    return steering;
  }

  cohesion(creature) {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of this.creatures) {
      if (other !== creature && creature.position.distanceTo(other.position) < this.cohesionDistance) {
        steering.add(other.position); total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total).sub(creature.position).setLength(creature.maxSpeed).sub(creature.velocity).clampLength(0, creature.maxForce);
    }
    return steering;
  }

  removeDeadCreatures() {
    this.creatures = this.creatures.filter(c => {
      if (!c.isAlive) {
        this.scene.remove(c.mesh); this.scene.remove(c.light);
        return false;
      }
      return true;
    });
  }
}

export const CreaturePresets = {
  normal: { separationDistance: 3.0, alignmentDistance: 5.0, cohesionDistance: 6.0, maxSpeed: 0.15 }
};