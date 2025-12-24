import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TerrainGenerator, createBloomfallTerrain } from './world/TerrainGenerator.js';
import { VegetationManager } from './world/entities/systems/lsystem/lsystem.js'
import { BoidsSystem, CreaturePresets } from './world/entities/boids/boidSystem.js';

/**
 * Configuration de la scène Bloomfall
 */
class BloomfallScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.terrain = null;
    this.terrainGenerator = null;
    this.vegetationManager = null;
    this.boidsSystem = null;
    
    this.init();
    this.animate();
  }

  init() {
    // Scène
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Ciel bleu
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 250);

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(80, 60, 80);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Contrôles de caméra
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 300;

    // Lumières
    this.setupLights();

    // Terrain avec configuration personnalisée
    const terrainConfig = {
      size: 200,
      resolution: 128,
      heightScale: 50,
      seed: Math.random(),
      
      // Montagnes plus hautes et prononcées
      mountainOctaves: 7,
      mountainPersistence: 0.5,
      mountainLacunarity: 2.3,
      mountainExponent: 2.2,
      mountainBaseHeight: 0.5,
      
      // Plaines douces
      plainsOctaves: 4,
      plainsPersistence: 0.6,
      plainsLacunarity: 2.0,
      plainsHeightScale: 0.25,
      
      transitionWidth: 40,
    };

    const result = createBloomfallTerrain(this.scene, terrainConfig);
    this.terrain = result.terrain;
    this.terrainGenerator = result.generator;

    // 🌲 Ajouter la végétation dans les plaines
    this.setupVegetation();

    // 🐝 Ajouter les boids (lucioles)
    this.setupBoids();

    // Gestion du redimensionnement
    window.addEventListener('resize', () => this.onWindowResize());

    // Afficher les informations du terrain
    this.displayTerrainInfo();
  }

  setupVegetation() {
    console.log('🌱 Génération de la végétation...');
    
    // Créer le gestionnaire de végétation
    this.vegetationManager = new VegetationManager(this.scene, this.terrainGenerator);
    
    // Peupler les plaines avec de la végétation
    this.vegetationManager.populate({
      numTrees: 80,
      numBushes: 120,
      numGrass: 250,
      numFlowers: 150,
      minDistanceFromMountains: 10,
    });
    
    console.log('✅ Végétation générée !');
  }

  setupBoids() {
    console.log('🐝 Création des boids (lucioles)...');
    
    // Créer le système de boids avec le preset par défaut
    // Presets disponibles : default, tight, loose, fast
    this.boidsSystem = new BoidsSystem(
      this.scene,
      this.terrainGenerator,
      50,                    // Nombre de boids
      CreaturePresets.default   // Configuration
    );
    
    console.log('✅ Boids actifs !');
  }

  setupLights() {
    // Lumière ambiante plus faible pour mieux voir les lucioles
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Lumière directionnelle (soleil)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    
    // Configuration des ombres
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    
    this.scene.add(sunLight);

    // Lumière d'appoint pour les zones sombres
    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.2);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  displayTerrainInfo() {
    // Créer un panneau d'information
    const infoDiv = document.createElement('div');
    infoDiv.style.position = 'absolute';
    infoDiv.style.top = '10px';
    infoDiv.style.left = '10px';
    infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    infoDiv.style.color = 'white';
    infoDiv.style.padding = '15px';
    infoDiv.style.fontFamily = 'monospace';
    infoDiv.style.fontSize = '14px';
    infoDiv.style.borderRadius = '5px';
    infoDiv.style.zIndex = '1000';
    
    const config = this.terrainGenerator.config;
    infoDiv.innerHTML = `
      
    `;
    
    document.body.appendChild(infoDiv);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Mise à jour des contrôles
    this.controls.update();

    // Mise à jour des boids
    if (this.boidsSystem) {
      this.boidsSystem.update(0.016); // ~60 FPS
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Méthodes utilitaires pour les futurs éléments

  /**
   * Vérifie si une position est dans une zone de montagnes
   */
  isInMountains(x, z) {
    const biome = this.terrainGenerator.getBiomeAt(x, z);
    return biome === 'mountain';
  }

  /**
   * Vérifie si une position est dans les plaines-forêts
   */
  isInPlains(x, z) {
    const biome = this.terrainGenerator.getBiomeAt(x, z);
    return biome === 'plains';
  }

  /**
   * Place un objet sur le terrain à la bonne hauteur
   */
  placeOnTerrain(object, x, z, offsetY = 0) {
    const height = this.terrainGenerator.getHeightAt(x, z);
    object.position.set(x, height + offsetY, z);
  }

  /**
   * Obtient une position aléatoire dans un biome spécifique
   */
  getRandomPositionInBiome(biomeType = 'plains') {
    const { size } = this.terrainGenerator.config;
    const maxAttempts = 100;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = (Math.random() - 0.5) * size;
      const z = (Math.random() - 0.5) * size;
      const biome = this.terrainGenerator.getBiomeAt(x, z);
      
      if (biome === biomeType || biomeType === 'any') {
        const y = this.terrainGenerator.getHeightAt(x, z);
        return new THREE.Vector3(x, y, z);
      }
    }
    
    // Fallback: retourner une position centrale
    return new THREE.Vector3(0, 0, 0);
  }
}

// Initialiser la scène quand le DOM est prêt
window.addEventListener('DOMContentLoaded', () => {
  new BloomfallScene();
});

export default BloomfallScene;