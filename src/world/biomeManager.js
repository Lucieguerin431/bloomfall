import { Group } from 'three';
import { createMountainsBiome } from './biomes/mountains.js';
import { createDesertBiome } from './biomes/desert.js';
import { createPlainsBiome } from './biomes/plains.js';
import { createForestBiome } from './biomes/forest.js';

export class BiomeManager {
  constructor() {
    this.group = new Group();

    // Taille d’un biome (en unités Three.js)
    this.BIOME_SIZE = 50;

    this.biomes = [];

    this.init();
  }

  init() {
    // Génère un carré 2x2 de biomes
    const layout = [
      { biome: createMountainsBiome, x: 0, z: 0 },
      { biome: createDesertBiome,    x: 1, z: 0 },
      { biome: createPlainsBiome,    x: 0, z: 1 },
      { biome: createForestBiome,    x: 1, z: 1 },
    ];

    layout.forEach(({ biome, x, z }) => {
      const instance = biome({
        size: this.BIOME_SIZE,
        position: { x: x * this.BIOME_SIZE, z: z * this.BIOME_SIZE }
      });

      this.group.add(instance.mesh);
      this.biomes.push(instance);
    });
  }

  update(delta) {
    // Mettra à jour la végétation, météo, créatures plus tard
    this.biomes.forEach(b => {
      if (b.update) b.update(delta);
    });
  }
}
