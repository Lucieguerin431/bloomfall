import * as THREE from 'three';

/**
 * Classe Creature : Représente une créature lumineuse (luciole) adaptée pour Bloomfall
 * Combinaison de votre code original Creature.js avec adaptation au terrain
 */
export class Creature {
  constructor(terrainGenerator, options = {}) {
    this.terrainGenerator = terrainGenerator;
    
    // Paramètres configurables avec des valeurs par défaut
    this.maxSpeed = options.maxSpeed || 0.1;
    this.maxForce = options.maxForce || 0.01;
    this.size = options.size || 0.08;
    this.lightIntensity = options.lightIntensity || 5.0;
    this.lightRange = options.lightRange || 4.0;
    
    // Bounds basé sur la taille du terrain
    const terrainSize = terrainGenerator.config.size;
    this.bounds = (terrainSize / 2) - 10; // Marge de sécurité

    // Position initiale aléatoire dans les plaines
    this.position = this.getRandomPlainsPosition();

    // Vitesse initiale aléatoire (principalement horizontale)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      0, // Pas de mouvement vertical initial
      (Math.random() - 0.5) * 0.05
    );

    // Accélération
    this.acceleration = new THREE.Vector3();

    // Hauteur au-dessus du sol
    this.heightOffset = options.heightOffset || 1.0;

    // Couleur aléatoire dans les tons bleutés/vert (comme votre code original)
    const hue = options.hue !== undefined ? options.hue : 0.5 + Math.random() * 0.2;
    this.color = new THREE.Color().setHSL(hue, 0.8, 0.5);

    // Création de la sphère pour représenter le Creature (luciole)
    this.mesh = this.createMesh(this.color, this.size);

    // Création de la lumière ponctuelle pour l'effet de "glow"
    this.light = this.createLight(this.color, this.lightIntensity, this.lightRange);

    // Stocke le temps initial pour le scintillement
    this.timeOffset = Math.random() * 1000;
  }

  /**
   * Obtient une position aléatoire dans les plaines
   */
  getRandomPlainsPosition() {
    const maxAttempts = 50;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = (Math.random() - 0.5) * this.bounds * 2;
      const z = (Math.random() - 0.5) * this.bounds * 2;
      
      const biome = this.terrainGenerator.getBiomeAt(x, z);
      
      if (biome === 'plains') {
        const y = this.terrainGenerator.getHeightAt(x, z) + this.heightOffset;
        return new THREE.Vector3(x, y, z);
      }
    }
    
    // Fallback : position centrale
    const y = this.terrainGenerator.getHeightAt(0, 0) + this.heightOffset;
    return new THREE.Vector3(0, y, 0);
  }

  /**
   * Crée le mesh (sphère) du Creature.
   */
  createMesh(color, size) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 3.0, // Intensité émissive initiale
      metalness: 0.0,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }

  /**
   * Crée la lumière ponctuelle pour le glow.
   */
  createLight(color, intensity, range) {
    const light = new THREE.PointLight(color, intensity, range);
    light.position.copy(this.position);
    light.castShadow = false; // Désactive les ombres pour optimiser les perfs
    return light;
  }

  /**
   * Met à jour la position et l'état du Creature.
   */
  update(deltaTime) {
    // Applique l'accélération à la vitesse
    this.velocity.add(this.acceleration);

    // Limite la vitesse maximale (seulement en XZ)
    const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
    if (horizontalVelocity.length() > this.maxSpeed) {
      horizontalVelocity.setLength(this.maxSpeed);
      this.velocity.x = horizontalVelocity.x;
      this.velocity.z = horizontalVelocity.y;
    }

    // Met à jour la position
    this.position.add(this.velocity);

    // Réinitialise l'accélération pour la prochaine frame
    this.acceleration.set(0, 0, 0);

    // Ajuste la hauteur pour suivre le terrain
    this.adjustToTerrain();

    // Gère les bordures
    this.borders();

    // Évite les montagnes
    this.avoidMountains();

    // Met à jour la position du mesh et de la lumière
    this.mesh.position.copy(this.position);
    this.light.position.copy(this.position);

    // Effet de scintillement (variation périodique de l'intensité)
    const time = Date.now() * 0.001; // Convertit en secondes
    const pulse = Math.sin(time * 2 + this.timeOffset); // Fréquence ajustable
    this.light.intensity = this.lightIntensity + pulse * 2.0;
    this.mesh.material.emissiveIntensity = 2.0 + pulse * 1.5;
  }

  /**
   * Ajuste la hauteur du Creature pour qu'il suive le terrain
   */
  adjustToTerrain() {
    const terrainHeight = this.terrainGenerator.getHeightAt(this.position.x, this.position.z);
    const targetY = terrainHeight + this.heightOffset;
    
    // Interpolation douce vers la hauteur cible
    const smoothing = 0.1;
    this.position.y += (targetY - this.position.y) * smoothing;
  }

  /**
   * Applique une force au Creature (pour les règles de comportement).
   */
  applyForce(force) {
    this.acceleration.add(force);
  }

  /**
   * Gère les collisions avec les bordures de la scène.
   */
  borders() {
    const margin = 5;
    
    // Bordures X
    if (this.position.x < -this.bounds + margin) {
      const force = new THREE.Vector3(this.maxForce, 0, 0);
      this.applyForce(force);
    } else if (this.position.x > this.bounds - margin) {
      const force = new THREE.Vector3(-this.maxForce, 0, 0);
      this.applyForce(force);
    }
    
    // Bordures Z
    if (this.position.z < -this.bounds + margin) {
      const force = new THREE.Vector3(0, 0, this.maxForce);
      this.applyForce(force);
    } else if (this.position.z > this.bounds - margin) {
      const force = new THREE.Vector3(0, 0, -this.maxForce);
      this.applyForce(force);
    }
  }

  /**
   * Évite les zones de montagnes
   */
  avoidMountains() {
    const biome = this.terrainGenerator.getBiomeAt(this.position.x, this.position.z);
    
    if (biome === 'mountain' || biome === 'transition') {
      // Force pour s'éloigner du centre (où sont les montagnes)
      const awayFromCenter = new THREE.Vector3(
        this.position.x,
        0,
        this.position.z
      ).normalize().multiplyScalar(this.maxForce * 1.5);
      
      this.applyForce(awayFromCenter);
    }
  }

  /**
   * Met à jour la couleur du Creature et de sa lumière.
   */
  setColor(newColor) {
    this.color = newColor;
    this.mesh.material.color = newColor;
    this.mesh.material.emissive = newColor;
    this.light.color = newColor;
  }
}