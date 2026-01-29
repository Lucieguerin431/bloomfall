/**
 * Monde "abstrait" qui regroupe les différents systèmes de la scène.
 * 
 * Ici il ne contient pour l'instant qu'un `BiomeManager`, mais l'idée serait
 * de centraliser tout ce qui vit dans le monde (météo, entités, etc.).
 */
import { Group } from 'three';
import { BiomeManager } from './biomeManager.js';

export class World {
  constructor() {
    this.group = new Group();

    this.biomes = new BiomeManager();
    this.group.add(this.biomes.group);
  }

  update(delta) {
    this.biomes.update(delta);
  }
  
}
