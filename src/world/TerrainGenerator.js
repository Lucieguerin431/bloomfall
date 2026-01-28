import * as THREE from 'three';

/**
 * Générateur de bruit Perlin simplifié
 * Basé sur l'implémentation de Ken Perlin
 */
class PerlinNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.permutation = this.generatePermutation();
  }

  generatePermutation() {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Mélange Fisher-Yates avec seed
    let random = this.seededRandom(this.seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Doubler pour éviter les débordements
    return [...p, ...p];
  }

  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const p = this.permutation;
    const a = p[X] + Y;
    const b = p[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad(p[a], x, y), this.grad(p[b], x - 1, y)),
      this.lerp(u, this.grad(p[a + 1], x, y - 1), this.grad(p[b + 1], x - 1, y - 1))
    );
  }

  // Bruit fractal multi-octaves
  fractalNoise(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }
}

/**
 * Générateur de terrain avec système de biomes
 */
export class TerrainGenerator {
  constructor(config = {}) {
    this.config = {
      size: config.size || 200,           // Taille du terrain
      resolution: config.resolution || 128, // Résolution (vertices)
      seed: config.seed || Math.random(),
      heightScale: config.heightScale || 25,
      
      // Paramètres de transition biome
      transitionWidth: config.transitionWidth || 30, // Largeur de la zone de transition
      
      // Paramètres montagnes
      mountainOctaves: config.mountainOctaves || 8,
      mountainPersistence: config.mountainPersistence || 0.5,
      mountainLacunarity: config.mountainLacunarity || 2.2,
      mountainExponent: config.mountainExponent || 1.8, // Accentuation des pics
      
      // Paramètres plaines-forêts
      plainsOctaves: config.plainsOctaves || 4,
      plainsPersistence: config.plainsPersistence || 0.6,
      plainsLacunarity: config.plainsLacunarity || 2.0,
      plainsHeightScale: config.plainsHeightScale || 0.3, // Moins de relief
    };
    
    this.perlin = new PerlinNoise(this.config.seed);
    this.biomeMap = null;
    this.heightMap = null;
  }

  /**
   * Génère une carte de biome basée sur la distance
   * 0 = Montagnes, 1 = Plaines-Forêts
   */
  generateBiomeMap() {
    const { resolution, size, transitionWidth } = this.config;
    const map = new Float32Array(resolution * resolution);
    const center = resolution / 2;
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = y * resolution + x;
        
        // Distance au centre (les montagnes au centre, plaines en périphérie)
        const dx = x - center;
        const dy = y - center;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const maxDist = center;
        
        // Normaliser la distance
        const normalizedDist = distFromCenter / maxDist;
        
        // Ajouter du bruit pour des frontières organiques
        const noiseX = x / resolution * 3;
        const noiseY = y / resolution * 3;
        const noise = this.perlin.fractalNoise(noiseX, noiseY, 3, 0.5, 2.0) * 0.3;
        
        // Calculer le facteur de biome avec transition douce
        let biomeFactor = normalizedDist + noise;
        biomeFactor = Math.max(0, Math.min(1, biomeFactor));
        
        // Transition douce avec fonction smoothstep
        const transitionStart = 0.4;
        const transitionEnd = 0.7;
        if (biomeFactor < transitionStart) {
          biomeFactor = 0; // Pure montagnes
        } else if (biomeFactor > transitionEnd) {
          biomeFactor = 1; // Pure plaines
        } else {
          // Zone de transition
          const t = (biomeFactor - transitionStart) / (transitionEnd - transitionStart);
          biomeFactor = t * t * (3 - 2 * t); // Smoothstep
        }
        
        map[idx] = biomeFactor;
      }
    }
    
    this.biomeMap = map;
    return map;
  }

  /**
   * Génère la heightmap en combinant les deux biomes
   */
  generateHeightMap() {
    const { resolution, size, heightScale } = this.config;
    const map = new Float32Array(resolution * resolution);
    
    if (!this.biomeMap) {
      this.generateBiomeMap();
    }
    
    // Paramètre d'amplification du centre (vous pouvez l'ajouter à votre config)
    const centerBoost = this.config.mountainHeightScale || 5.5; 

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = y * resolution + x;
        const nx = (x / resolution) * 4;
        const ny = (y / resolution) * 4;
        
        let mountainHeight = this.perlin.fractalNoise(
          nx, ny,
          this.config.mountainOctaves,
          this.config.mountainPersistence,
          this.config.mountainLacunarity
        );
        
        // Accentuer les pics
        mountainHeight = Math.pow(Math.abs(mountainHeight), this.config.mountainExponent) * Math.sign(mountainHeight);
        
        // --- APPLICATION DU BOOST CENTRAL ---
        // On multiplie l'altitude des montagnes par le centerBoost
        mountainHeight *= centerBoost; 

        let plainsHeight = this.perlin.fractalNoise(
          nx * 0.8, ny * 0.8,
          this.config.plainsOctaves,
          this.config.plainsPersistence,
          this.config.plainsLacunarity
        );
        plainsHeight *= this.config.plainsHeightScale;
        
        const biomeFactor = this.biomeMap[idx];
        // L'interpolation fera le reste : le boost ne s'appliquera qu'au centre (biome montagne)
        const height = mountainHeight * (1 - biomeFactor) + plainsHeight * biomeFactor;
        
        map[idx] = height * heightScale;
      }
    }
    
    this.heightMap = map;
    return map;
  }

  /**
   * Lisse la heightmap pour éviter les artefacts
   */
  smoothHeightMap(iterations = 1) {
    if (!this.heightMap) return;
    
    const { resolution } = this.config;
    
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed = new Float32Array(resolution * resolution);
      
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const idx = y * resolution + x;
          let sum = 0;
          let count = 0;
          
          // Moyenner avec les voisins
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
                sum += this.heightMap[ny * resolution + nx];
                count++;
              }
            }
          }
          
          smoothed[idx] = sum / count;
        }
      }
      
      this.heightMap = smoothed;
    }
  }

  /**
   * Crée la géométrie Three.js du terrain
   */
  createTerrainGeometry() {
    const { size, resolution } = this.config;
    
    // Générer les données si nécessaire
    if (!this.heightMap) {
      this.generateHeightMap();
    }
    
    // Créer la géométrie plane
    const geometry = new THREE.PlaneGeometry(
      size,
      size,
      resolution - 1,
      resolution - 1
    );
    
    // Appliquer les hauteurs
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = Math.floor(i % resolution);
      const y = Math.floor(i / resolution);
      const idx = y * resolution + x;
      
      positions.setZ(i, this.heightMap[idx]);
    }
    
    // Rotation pour que le terrain soit horizontal
    geometry.rotateX(-Math.PI / 2);
    
    // Recalculer les normales pour l'éclairage
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Crée un mesh complet avec matériau
   */
  createTerrainMesh() {
    const geometry = this.createTerrainGeometry();
    
    // Créer un matériau avec couleurs par biome
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.2,
    });
    
    // Appliquer les couleurs selon le biome
    this.applyBiomeColors(geometry);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    
    return mesh;
  }

  /**
   * Applique des couleurs selon le biome et l'altitude
   */
  applyBiomeColors(geometry) {
    const { resolution, heightScale } = this.config;
    const colors = new Float32Array(resolution * resolution * 3);
    
    // Couleurs pour les différents biomes/altitudes
    const mountainLow = new THREE.Color(0x8B7355);    // Marron rocheux
    const mountainMid = new THREE.Color(0xA0826D);    // Beige pierre
    const mountainHigh = new THREE.Color(0xFFFFFF);   // Gris clair sommet
    
    const plainsGrass = new THREE.Color(0x7EC850);    // Vert herbe
    const plainsDark = new THREE.Color(0x4A7C2F);     // Vert foncé forêt
    const plainsLight = new THREE.Color(0x9FD356);    // Vert clair
    
    for (let i = 0; i < resolution * resolution; i++) {
      const biomeFactor = this.biomeMap[i];
      const height = this.heightMap[i];
      const normalizedHeight = (height + heightScale) / (heightScale * 2);
      
      let color;
      
      if (biomeFactor < 0.5) {
        // Zone montagneuse
        if (normalizedHeight > 0.7) {
          color = mountainHigh;
        } else if (normalizedHeight > 0.4) {
          color = mountainMid;
        } else {
          color = mountainLow;
        }
      } else {
        // Zone plaines-forêts
        const variation = this.perlin.noise(i * 0.1, i * 0.05);
        if (variation > 0.3) {
          color = plainsDark; // Zones forestières
        } else if (variation < -0.3) {
          color = plainsLight; // Clairières
        } else {
          color = plainsGrass; // Herbe normale
        }
      }
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  /**
   * Obtient le type de biome à une position donnée
   */
  getBiomeAt(x, z) {
    const { size, resolution } = this.config;
    
    // Convertir les coordonnées du monde en indices de la grille
    const gridX = Math.floor((x / size + 0.5) * resolution);
    const gridZ = Math.floor((z / size + 0.5) * resolution);
    
    if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) {
      return 'plains'; // Par défaut en dehors
    }
    
    const idx = gridZ * resolution + gridX;
    const biomeFactor = this.biomeMap[idx];
    
    if (biomeFactor < 0.3) return 'mountain';
    if (biomeFactor > 0.7) return 'plains';
    return 'transition';
  }

  /**
   * Obtient la hauteur du terrain à une position donnée
   */
  getHeightAt(x, z) {
    const { size, resolution } = this.config;
    
    // Convertir en coordonnées de grille
    const gridX = (x / size + 0.5) * resolution;
    const gridZ = (z / size + 0.5) * resolution;
    
    // Interpolation bilinéaire pour une hauteur lisse
    const x0 = Math.floor(gridX);
    const x1 = Math.min(x0 + 1, resolution - 1);
    const z0 = Math.floor(gridZ);
    const z1 = Math.min(z0 + 1, resolution - 1);
    
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    const h00 = this.heightMap[z0 * resolution + x0] || 0;
    const h10 = this.heightMap[z0 * resolution + x1] || 0;
    const h01 = this.heightMap[z1 * resolution + x0] || 0;
    const h11 = this.heightMap[z1 * resolution + x1] || 0;
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }
}

// Exemple d'utilisation
export function createBloomfallTerrain(scene, config = {}) {
  const generator = new TerrainGenerator(config);
  const terrain = generator.createTerrainMesh();
  scene.add(terrain);
  
  return { terrain, generator };
}