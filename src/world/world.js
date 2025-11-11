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
