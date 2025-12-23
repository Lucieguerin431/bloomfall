import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TerrainGenerator, createBloomfallTerrain } from './world/TerrainGenerator.js';
import { VegetationManager } from './world/entities/systems/lsystem/lsystem.js'

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
    // OPTION 1 : Configuration manuelle
    const terrainConfig = {
      size: 200,
      resolution: 128,
      heightScale: 50,           // ✨ Plus haut !
      seed: Math.random(),
      
      // Montagnes plus hautes et prononcées
      mountainOctaves: 7,
      mountainPersistence: 0.5,
      mountainLacunarity: 2.3,
      mountainExponent: 2.2,     // Pics plus accentués
      mountainBaseHeight: 0.5,   // ✨ Altitude de base élevée !
      
      // Plaines douces
      plainsOctaves: 4,
      plainsPersistence: 0.6,
      plainsLacunarity: 2.0,
      plainsHeightScale: 0.25,   // Plus plates pour le contraste
      
      transitionWidth: 40,
    };

    // OPTION 2 : Utiliser un preset (décommentez pour utiliser)
    // import { TerrainPresets } from './TerrainPresets.js';
    // const terrainConfig = TerrainPresets.highMountains;
    // OU
    // const terrainConfig = TerrainPresets.extremeMountains;

    const result = createBloomfallTerrain(this.scene, terrainConfig);
    this.terrain = result.terrain;
    this.terrainGenerator = result.generator;

    // 🌲 Ajouter la végétation dans les plaines
    this.setupVegetation();

    // Ajouter une grille de référence (optionnel)
    // this.addDebugGrid();

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
      numTrees: 80,        // Nombre d'arbres
      numBushes: 120,      // Nombre de buissons
      numGrass: 250,       // Nombre d'herbes
      numFlowers: 150,     // Nombre de fleurs
      minDistanceFromMountains: 10, // Distance min des montagnes (en unités)
    });
    
    console.log('✅ Végétation générée !');
  }

  setupLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Lumière directionnelle (soleil)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  addDebugGrid() {
    const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x888888);
    gridHelper.position.y = 0.1;
    this.scene.add(gridHelper);
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
      <strong>Bloomfall - Terrain Info</strong><br>
      <hr style="margin: 8px 0; border-color: #555;">
      Taille: ${config.size}m x ${config.size}m<br>
      Résolution: ${config.resolution} x ${config.resolution}<br>
      Seed: ${config.seed.toFixed(6)}<br>
      <br>
      <strong>Montagnes (centre)</strong><br>
      Hauteur max: ${config.heightScale}m<br>
      Octaves: ${config.mountainOctaves}<br>
      <br>
      <strong>Plaines-Forêts (périphérie)</strong><br>
      Hauteur: ${(config.heightScale * config.plainsHeightScale).toFixed(1)}m<br>
      Octaves: ${config.plainsOctaves}<br>
      <br>
      <strong>Végétation</strong><br>
      Plantes: ${this.vegetationManager ? this.vegetationManager.vegetation.length : 0}<br>
      <br>
      <em>Utilisez la souris pour naviguer</em>
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

    // Animation du soleil (optionnel)
    // const time = Date.now() * 0.0001;
    // sunLight.position.x = Math.sin(time) * 100;

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