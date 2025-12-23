import * as THREE from 'three';
import { LSystem, VegetationPresets } from '../systems/lsystem/lsystem.js';

/**
 * États possibles d'une cellule de végétation
 */
export const CellState = {
  EMPTY: 'empty',       // Sol vide
  FLOWER: 'flower',     // Fleur (stade 1)
  BUSH: 'bush',         // Buisson (stade 2)
  TREE: 'tree',         // Arbre (stade 3 - final)
};

/**
 * Automate cellulaire pour la croissance de végétation
 * Règles inspirées du jeu de la vie, adaptées pour Bloomfall
 */
export class VegetationCellularAutomata {
  constructor(scene, terrainGenerator, config = {}) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    
    // Configuration
    this.config = {
      gridSize: config.gridSize || 60,           // Taille de la grille
      cellSize: config.cellSize || 3,            // Taille d'une cellule (m)
      updateInterval: config.updateInterval || 2000, // Intervalle de mise à jour (ms)
      initialDensity: config.initialDensity || 0.15, // Densité initiale de fleurs
      
      // Règles d'évolution
      flowerToBushNeighbors: config.flowerToBushNeighbors || 8, // Fleur entourée → buisson
      birthNeighbors: config.birthNeighbors || 3,                // Naissance d'une fleur
      survivalMin: config.survivalMin || 2,                      // Survie min
      survivalMax: config.survivalMax || 3,                      // Survie max
      bushToTreeAge: config.bushToTreeAge || 3,                  // Générations avant arbre
    };
    
    // État de la grille
    this.grid = [];
    this.meshes = [];
    this.lastUpdate = 0;
    this.generation = 0;
    
    // Caches pour les meshes
    this.flowerPrototype = null;
    this.bushPrototype = null;
    this.treePrototype = null;
    
    this.initialize();
  }

  /**
   * Initialise la grille et les prototypes de meshes
   */
  initialize() {
    console.log('🌱 Initialisation des automates cellulaires...');
    
    // Créer les prototypes (pour clonage rapide)
    this.createPrototypes();
    
    // Initialiser la grille
    const { gridSize } = this.config;
    const { size } = this.terrainGenerator.config;
    const offset = size / 2;
    
    for (let x = 0; x < gridSize; x++) {
      this.grid[x] = [];
      this.meshes[x] = [];
      
      for (let z = 0; z < gridSize; z++) {
        // Position dans le monde
        const worldX = (x / gridSize) * size - offset;
        const worldZ = (z / gridSize) * size - offset;
        
        // Vérifier si on est dans les plaines
        const biome = this.terrainGenerator.getBiomeAt(worldX, worldZ);
        const isPlains = biome === 'plains';
        
        // État initial : quelques fleurs aléatoires dans les plaines
        let state = CellState.EMPTY;
        if (isPlains && Math.random() < this.config.initialDensity) {
          state = CellState.FLOWER;
        }
        
        // Stocker l'état de la cellule
        this.grid[x][z] = {
          state: state,
          age: 0,                    // Âge en générations
          worldX: worldX,
          worldZ: worldZ,
          isPlains: isPlains,        // Cache du biome
        };
        
        // Créer le mesh initial
        this.meshes[x][z] = null;
        if (state !== CellState.EMPTY) {
          this.updateCellMesh(x, z);
        }
      }
    }
    
    console.log(`✅ Grille ${gridSize}x${gridSize} initialisée`);
  }

  /**
   * Crée les prototypes de meshes pour clonage
   */
  createPrototypes() {
    // Fleur
    const flowerConfig = VegetationPresets.flower;
    const flowerLSystem = new LSystem(flowerConfig);
    this.flowerPrototype = flowerLSystem.createMesh();
    this.flowerPrototype.scale.setScalar(0.6);
    
    // Buisson
    const bushConfig = VegetationPresets.smallBush;
    const bushLSystem = new LSystem(bushConfig);
    this.bushPrototype = bushLSystem.createMesh();
    this.bushPrototype.scale.setScalar(0.8);
    
    // Arbre
    const treeConfig = VegetationPresets.simpleTree;
    const treeLSystem = new LSystem(treeConfig);
    this.treePrototype = treeLSystem.createMesh();
    this.treePrototype.scale.setScalar(0.9);
  }

  /**
   * Met à jour le mesh d'une cellule selon son état
   */
  updateCellMesh(x, z) {
    const cell = this.grid[x][z];
    const oldMesh = this.meshes[x][z];
    
    // Supprimer l'ancien mesh
    if (oldMesh) {
      this.scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      oldMesh.material.dispose();
    }
    
    // Créer le nouveau mesh selon l'état
    let newMesh = null;
    
    switch (cell.state) {
      case CellState.FLOWER:
        newMesh = this.flowerPrototype.clone();
        break;
      case CellState.BUSH:
        newMesh = this.bushPrototype.clone();
        break;
      case CellState.TREE:
        newMesh = this.treePrototype.clone();
        break;
      case CellState.EMPTY:
        // Pas de mesh
        break;
    }
    
    // Positionner et ajouter à la scène
    if (newMesh) {
      const height = this.terrainGenerator.getHeightAt(cell.worldX, cell.worldZ);
      newMesh.position.set(cell.worldX, height, cell.worldZ);
      
      // Rotation aléatoire pour varier
      newMesh.rotation.y = Math.random() * Math.PI * 2;
      
      // Variation d'échelle légère
      const scaleVariation = 0.9 + Math.random() * 0.2;
      newMesh.scale.multiplyScalar(scaleVariation);
      
      this.scene.add(newMesh);
      this.meshes[x][z] = newMesh;
    } else {
      this.meshes[x][z] = null;
    }
  }

  /**
   * Compte les voisins d'un certain état
   */
  countNeighbors(x, z, targetState) {
    const { gridSize } = this.config;
    let count = 0;
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        // Ignorer la cellule elle-même
        if (dx === 0 && dz === 0) continue;
        
        const nx = x + dx;
        const nz = z + dz;
        
        // Vérifier les limites
        if (nx >= 0 && nx < gridSize && nz >= 0 && nz < gridSize) {
          if (this.grid[nx][nz].state === targetState) {
            count++;
          }
        }
      }
    }
    
    return count;
  }

  /**
   * Compte TOUS les voisins vivants (fleur, buisson ou arbre)
   */
  countLiveNeighbors(x, z) {
    const flowers = this.countNeighbors(x, z, CellState.FLOWER);
    const bushes = this.countNeighbors(x, z, CellState.BUSH);
    const trees = this.countNeighbors(x, z, CellState.TREE);
    return flowers + bushes + trees;
  }

  /**
   * Applique les règles d'évolution (inspirées du jeu de la vie)
   */
  nextGeneration() {
    const { gridSize } = this.config;
    const newGrid = JSON.parse(JSON.stringify(this.grid));
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const cell = this.grid[x][z];
        
        // Ignorer les cellules hors des plaines
        if (!cell.isPlains) {
          newGrid[x][z].state = CellState.EMPTY;
          continue;
        }
        
        const liveNeighbors = this.countLiveNeighbors(x, z);
        const flowerNeighbors = this.countNeighbors(x, z, CellState.FLOWER);
        
        // Copier l'âge
        newGrid[x][z].age = cell.age;
        
        switch (cell.state) {
          case CellState.EMPTY:
            // Règle de naissance : 3 voisins vivants → nouvelle fleur
            if (liveNeighbors === this.config.birthNeighbors) {
              newGrid[x][z].state = CellState.FLOWER;
              newGrid[x][z].age = 0;
            }
            break;
            
          case CellState.FLOWER:
            // Règle d'évolution : fleur entourée de 8 fleurs → buisson
            if (flowerNeighbors === this.config.flowerToBushNeighbors) {
              newGrid[x][z].state = CellState.BUSH;
              newGrid[x][z].age = 0;
            }
            // Règle de survie : 2-3 voisins → survit
            else if (liveNeighbors < this.config.survivalMin || 
                     liveNeighbors > this.config.survivalMax) {
              newGrid[x][z].state = CellState.EMPTY;
            }
            // Sinon reste une fleur
            else {
              newGrid[x][z].age++;
            }
            break;
            
          case CellState.BUSH:
            // Règle d'évolution : buisson âgé → arbre
            if (cell.age >= this.config.bushToTreeAge) {
              newGrid[x][z].state = CellState.TREE;
              newGrid[x][z].age = 0;
            }
            // Règle de survie
            else if (liveNeighbors < this.config.survivalMin || 
                     liveNeighbors > this.config.survivalMax) {
              newGrid[x][z].state = CellState.EMPTY;
            }
            else {
              newGrid[x][z].age++;
            }
            break;
            
          case CellState.TREE:
            // Les arbres sont permanents (stade final)
            // Mais peuvent mourir s'ils sont trop isolés
            if (liveNeighbors === 0) {
              newGrid[x][z].state = CellState.EMPTY;
            }
            break;
        }
      }
    }
    
    // Appliquer les changements et mettre à jour les meshes
    const changes = [];
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        if (this.grid[x][z].state !== newGrid[x][z].state) {
          changes.push({ x, z });
          this.grid[x][z] = newGrid[x][z];
          this.updateCellMesh(x, z);
        } else {
          this.grid[x][z].age = newGrid[x][z].age;
        }
      }
    }
    
    this.generation++;
    
    // Statistiques
    const stats = this.getStatistics();
    console.log(`🌱 Génération ${this.generation} | Fleurs: ${stats.flowers} | Buissons: ${stats.bushes} | Arbres: ${stats.trees} | Changements: ${changes.length}`);
  }

  /**
   * Met à jour l'automate (appelé dans la boucle d'animation)
   */
  update(time) {
    if (time - this.lastUpdate > this.config.updateInterval) {
      this.nextGeneration();
      this.lastUpdate = time;
    }
  }

  /**
   * Obtient les statistiques de la végétation
   */
  getStatistics() {
    const stats = {
      flowers: 0,
      bushes: 0,
      trees: 0,
      empty: 0,
      total: this.config.gridSize * this.config.gridSize,
    };
    
    for (let x = 0; x < this.config.gridSize; x++) {
      for (let z = 0; z < this.config.gridSize; z++) {
        switch (this.grid[x][z].state) {
          case CellState.FLOWER: stats.flowers++; break;
          case CellState.BUSH: stats.bushes++; break;
          case CellState.TREE: stats.trees++; break;
          case CellState.EMPTY: stats.empty++; break;
        }
      }
    }
    
    return stats;
  }

  /**
   * Réinitialise la grille
   */
  reset() {
    // Supprimer tous les meshes
    for (let x = 0; x < this.config.gridSize; x++) {
      for (let z = 0; z < this.config.gridSize; z++) {
        const mesh = this.meshes[x][z];
        if (mesh) {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
      }
    }
    
    this.generation = 0;
    this.initialize();
  }

  /**
   * Ajoute manuellement une cellule
   */
  addCell(x, z, state) {
    if (x >= 0 && x < this.config.gridSize && 
        z >= 0 && z < this.config.gridSize) {
      this.grid[x][z].state = state;
      this.grid[x][z].age = 0;
      this.updateCellMesh(x, z);
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    for (let x = 0; x < this.config.gridSize; x++) {
      for (let z = 0; z < this.config.gridSize; z++) {
        const mesh = this.meshes[x][z];
        if (mesh) {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
      }
    }
    
    // Nettoyer les prototypes
    if (this.flowerPrototype) {
      this.flowerPrototype.geometry.dispose();
      this.flowerPrototype.material.dispose();
    }
    if (this.bushPrototype) {
      this.bushPrototype.geometry.dispose();
      this.bushPrototype.material.dispose();
    }
    if (this.treePrototype) {
      this.treePrototype.geometry.dispose();
      this.treePrototype.material.dispose();
    }
  }
}

/**
 * Presets de configurations pour différents comportements
 */
export const AutomataPresets = {
  // Croissance rapide
  fast: {
    gridSize: 60,
    updateInterval: 1000,        // 1 seconde
    initialDensity: 0.2,
    flowerToBushNeighbors: 8,
    birthNeighbors: 3,
    survivalMin: 2,
    survivalMax: 3,
    bushToTreeAge: 2,            // Rapide
  },
  
  // Croissance normale (défaut)
  normal: {
    gridSize: 60,
    updateInterval: 2000,        // 2 secondes
    initialDensity: 0.15,
    flowerToBushNeighbors: 8,
    birthNeighbors: 3,
    survivalMin: 2,
    survivalMax: 3,
    bushToTreeAge: 3,
  },
  
  // Croissance lente et réaliste
  slow: {
    gridSize: 60,
    updateInterval: 4000,        // 4 secondes
    initialDensity: 0.1,
    flowerToBushNeighbors: 8,
    birthNeighbors: 3,
    survivalMin: 2,
    survivalMax: 3,
    bushToTreeAge: 5,            // Lent
  },
  
  // Dense et chaotique
  chaotic: {
    gridSize: 60,
    updateInterval: 1500,
    initialDensity: 0.3,         // Beaucoup de départ
    flowerToBushNeighbors: 7,    // Évolution plus facile
    birthNeighbors: 3,
    survivalMin: 1,              // Survie plus facile
    survivalMax: 4,
    bushToTreeAge: 2,
  },
  
  // Sparse et stable
  sparse: {
    gridSize: 60,
    updateInterval: 3000,
    initialDensity: 0.08,        // Peu de départ
    flowerToBushNeighbors: 8,
    birthNeighbors: 3,
    survivalMin: 2,
    survivalMax: 3,
    bushToTreeAge: 4,
  },
};

export default VegetationCellularAutomata;