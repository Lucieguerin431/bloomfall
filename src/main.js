/**
 * Fichier principal qui monte toute la scène Bloomfall dans le navigateur.
 *
 * Ici on installe Three.js (caméra, renderer, lumières), on génère le terrain,
 * puis on branche tous les "systèmes" du monde : végétation L‑system, lucioles (boids),
 * et créatures neuronales avec algorithme génétique. C'est un peu le "main" du projet.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TerrainGenerator, createBloomfallTerrain } from './world/TerrainGenerator.js';
import { VegetationManager } from './world/entities/systems/lsystem/lsystem.js'
import { BoidsSystem, CreaturePresets } from './world/entities/boids/boidSystem.js';
import { CreatureSystem } from './world/entities/neuralnetwork/CreatureSystem.js';

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
    
    // Managers
    this.vegetationManager = null;
    this.boidsSystem = null;
    this.creatureSystem = null; // Notre système Algogen
    
    // Time
    this.clock = new THREE.Clock();

    // Gestion des générations automatiques
    this.currentGeneration = 1;
    // 1 jour = 1 minute dans notre simulation
    this.generationDuration = 30;   // durée d'une génération/journée (en secondes)
    this.generationElapsed = 0;     // temps écoulé dans la génération courante
    this.generationInfoDiv = null;  // élément UI pour afficher les infos

    // Paramètres du cycle jour/nuit
    this.ambientLight = null;
    this.sunLight = null;
    this.fillLight = null;
    this.daySkyColor = new THREE.Color(0x87CEEB);   // ciel bleu clair
    this.nightSkyColor = new THREE.Color(0x020518); // nuit profonde

    this.init();
    this.animate();
  }

  init() {
    // 1. Initialisation Scène de base
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 250);

    // 2. Caméra
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(80, 60, 80);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // 4. Contrôles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 300;

    // 5. Lumières
    this.setupLights();

    // 6. Terrain
    const terrainConfig = {
      size: 400,
      resolution: 128,
      heightScale: 100,
      seed: Math.random(),
      mountainOctaves: 7,
      mountainPersistence: 0.5,
      mountainLacunarity: 2.3,
      mountainExponent: 2.2,
      mountainBaseHeight: 0.5,
      plainsOctaves: 4,
      plainsPersistence: 0.6,
      plainsLacunarity: 2.0,
      plainsHeightScale: 0.25,
      transitionWidth: 40,
    };

    const result = createBloomfallTerrain(this.scene, terrainConfig);
    this.terrain = result.terrain;
    this.terrainGenerator = result.generator;

    // 7. Écosystème
    this.setupVegetation(); // Arbres et fleurs
    this.setupBoids();      // Lucioles (boids)
    this.setupCreatures();  // <--- NOUVEAU: Les créatures neuronales

    // 8. UI & Events
    window.addEventListener('resize', () => this.onWindowResize());
    this.displayTerrainInfo();
    this.createControlsUI(); // Bouton pour l'évolution
  }

  setupVegetation() {
    console.log(' Génération de la végétation...');
    this.vegetationManager = new VegetationManager(this.scene, this.terrainGenerator);
    this.vegetationManager.populate({
      numTrees: 80,
      numBushes: 120,
      numGrass: 250,
      numFlowers: 150,
      minDistanceFromMountains: 10,
    });
  }

  setupBoids() {
    console.log(' Création des boids...');
    this.boidsSystem = new BoidsSystem(
      this.scene,
      this.terrainGenerator,
      50,
      CreaturePresets.default
    );
  }

  // --- INTÉGRATION ALGOGEN ---
  setupCreatures() {
    console.log(' Initialisation de la Vie Artificielle...');
    
    // On passe la scène et le générateur de terrain pour qu'elles marchent au sol
    this.creatureSystem = new CreatureSystem(this.scene, this.terrainGenerator, {
        populationSize: 30, // Tu peux ajuster le nombre ici
        worldSize: 200      // Doit correspondre à la taille du terrain
    });

    console.log(' Créatures actives !');
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    this.ambientLight = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    
    // Ombres optimisées
    const d = 100;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.2);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
    this.fillLight = fillLight;
  }

  displayTerrainInfo() {
    const infoDiv = document.createElement('div');
    Object.assign(infoDiv.style, {
        position: 'absolute', top: '10px', left: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white',
        padding: '15px', fontFamily: 'monospace', fontSize: '14px',
        borderRadius: '5px', zIndex: '1000'
    });
    // infoDiv.innerHTML = `...`; 
    document.body.appendChild(infoDiv);
  }

  // Interface simple pour contrôler l'évolution
  createControlsUI() {
    // Bouton optionnel pour forcer le passage à la génération suivante
    const btn = document.createElement('button');
    btn.textContent = "Next Gen";
    Object.assign(btn.style, {
        position: 'absolute', top: '10px', right: '10px',
        padding: '10px 20px', fontSize: '16px', cursor: 'pointer',
        backgroundColor: '#4CAF50', color: 'white', border: 'none',
        borderRadius: '5px', zIndex: '1000'
    });
    
    btn.onclick = () => {
        if(this.creatureSystem) {
          this.creatureSystem.nextGeneration();
          this.currentGeneration++;
          this.generationElapsed = 0;
        }
    };
    document.body.appendChild(btn);

    // Affichage du temps restant avant la prochaine génération
    const genInfo = document.createElement('div');
    Object.assign(genInfo.style, {
        position: 'absolute', bottom: '10px', left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        fontSize: '14px',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        borderRadius: '4px',
        zIndex: '1000'
    });
    genInfo.textContent = `Génération ${this.currentGeneration} — prochaine dans ${this.generationDuration}s`;
    document.body.appendChild(genInfo);
    this.generationInfoDiv = genInfo;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Calcul du Delta Time pour des mouvements fluides
    const delta = this.clock.getDelta();

    this.controls.update();

    // Update Boids
    if (this.boidsSystem) {
      this.boidsSystem.update(delta);
    }

    // Update Créatures Algogen + gestion auto des générations
    if (this.creatureSystem) {
        this.creatureSystem.update(delta);

        // Avancement du temps de génération
        this.generationElapsed += delta;

        // Passage automatique à la génération suivante
        if (this.generationElapsed >= this.generationDuration) {
          this.creatureSystem.nextGeneration();
          this.currentGeneration++;
          this.generationElapsed = 0;
        }

        // Mise à jour de l'UI d'information (temps restant)
        if (this.generationInfoDiv) {
          const remaining = Math.max(0, Math.ceil(this.generationDuration - this.generationElapsed));
          this.generationInfoDiv.textContent =
            `Génération ${this.currentGeneration} — prochaine dans ${remaining}s`;
        }

        // --- Cycle jour/nuit : 1 génération = 1 journée ---
        const t = Math.min(1, this.generationElapsed / this.generationDuration); // 0 (matin) -> 1 (nuit)
        const dayFactor = 1 - Math.pow(t, 0.7); // 1 au début, 0 à la fin

        // Ciel & brouillard
        if (this.scene && this.scene.fog) {
          const skyColor = new THREE.Color();
          skyColor.lerpColors(this.nightSkyColor, this.daySkyColor, dayFactor);
          this.scene.background = skyColor;
          this.scene.fog.color.copy(skyColor);
        }

        // Intensité des lumières
        if (this.ambientLight) {
          this.ambientLight.intensity = 0.15 + 0.25 * dayFactor; // 0.4 -> 0.15
        }
        if (this.sunLight) {
          this.sunLight.intensity = 0.2 + 0.8 * dayFactor;       // 1.0 -> 0.2
        }
        if (this.fillLight) {
          this.fillLight.intensity = 0.1 + 0.3 * dayFactor;      // 0.4 -> 0.1
        }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialisation au chargement
window.addEventListener('DOMContentLoaded', () => {
  new BloomfallScene();
});

export default BloomfallScene;