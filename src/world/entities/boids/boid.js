import * as THREE from 'three';

/**
 * Classe Boid : Représente une créature lumineuse avec comportement de type Boid
 * Adaptée pour le monde Bloomfall (reste sur le terrain, évite les montagnes)
 */
export class Boid {
  constructor(terrainGenerator, options = {}) {
    this.terrainGenerator = terrainGenerator;
    
    // Paramètres configurables avec des valeurs par défaut
    this.maxSpeed = options.maxSpeed || 0.15;
    this.maxForce = options.maxForce || 0.02;
    this.size = options.size || 0.3;
    this.lightIntensity = options.lightIntensity || 8.0;
    this.lightRange = options.lightRange || 6.0;
    
    // Limites du terrain
    const terrainSize = terrainGenerator.config.size;
    this.bounds = terrainSize / 2 - 10; // Marge de sécurité
    
    // Position initiale aléatoire dans les plaines
    this.position = this.getRandomPlainsPosition();
    
    // Vitesse initiale aléatoire (horizontale principalement)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      0, // Pas de mouvement vertical initial
      (Math.random() - 0.5) * 0.1
    );
    
    // Accélération
    this.acceleration = new THREE.Vector3();
    
    // Hauteur au-dessus du sol
    this.heightOffset = options.heightOffset || 1.5;
    
    // Couleur aléatoire (tons chauds : jaune/orange/rose)
    const hue = options.hue !== undefined ? options.hue : 0.1 + Math.random() * 0.15;
    this.color = new THREE.Color().setHSL(hue, 0.9, 0.6);
    
    // Création du mesh
    this.mesh = this.createMesh(this.color, this.size);
    
    // Création de la lumière
    this.light = this.createLight(this.color, this.lightIntensity, this.lightRange);
    
    // Temps pour le scintillement
    this.timeOffset = Math.random() * 1000;
    
    // État interne
    this.energy = 100;
    this.age = 0;
    this.isAlive = true;
    
    // Préférence de biome (évite les montagnes)
    this.avoidMountains = true;
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
    
    // Fallback : centre des plaines
    const y = this.terrainGenerator.getHeightAt(0, 0) + this.heightOffset;
    return new THREE.Vector3(0, y, 0);
  }

  /**
   * Crée le mesh (sphère) de la créature
   */
  createMesh(color, size) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 4.0,
      metalness: 0.0,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Crée la lumière ponctuelle pour l'effet lumineux
   */
  createLight(color, intensity, range) {
    const light = new THREE.PointLight(color, intensity, range);
    light.position.copy(this.position);
    light.castShadow = false; // Désactivé pour les performances
    return light;
  }

  /**
   * Met à jour la position et l'état de la créature
   */
  update(deltaTime = 0.016) {
    if (!this.isAlive) return;
    
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
    
    // Réinitialise l'accélération
    this.acceleration.set(0, 0, 0);
    
    // Ajuste la hauteur pour suivre le terrain
    this.adjustToTerrain();
    
    // Gère les bordures
    this.handleBorders();
    
    // Évite les montagnes
    if (this.avoidMountains) {
      this.avoidMountainBiome();
    }
    
    // Met à jour les meshes
    this.mesh.position.copy(this.position);
    this.light.position.copy(this.position);
    
    // Effet de scintillement
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 3 + this.timeOffset);
    this.light.intensity = this.lightIntensity + pulse * 3.0;
    this.mesh.material.emissiveIntensity = 3.0 + pulse * 2.0;
    
    // Vieillissement
    this.age += deltaTime;
    this.energy -= deltaTime * 0.01;
    
    if (this.energy <= 0) {
      this.isAlive = false;
    }
  }

  /**
   * Ajuste la hauteur de la créature pour qu'elle suive le terrain
   */
  adjustToTerrain() {
    const terrainHeight = this.terrainGenerator.getHeightAt(this.position.x, this.position.z);
    const targetY = terrainHeight + this.heightOffset;
    
    // Interpolation douce vers la hauteur cible
    const smoothing = 0.15;
    this.position.y += (targetY - this.position.y) * smoothing;
  }

  /**
   * Applique une force à la créature
   */
  applyForce(force) {
    this.acceleration.add(force);
  }

  /**
   * Gère les collisions avec les bordures du terrain
   */
  handleBorders() {
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
  avoidMountainBiome() {
    const biome = this.terrainGenerator.getBiomeAt(this.position.x, this.position.z);
    
    if (biome === 'mountain' || biome === 'transition') {
      // Force pour s'éloigner du centre (où sont les montagnes)
      const awayFromCenter = new THREE.Vector3(
        this.position.x,
        0,
        this.position.z
      ).normalize().multiplyScalar(this.maxForce * 2);
      
      this.applyForce(awayFromCenter);
    }
  }

  /**
   * Met à jour la couleur de la créature
   */
  setColor(newColor) {
    this.color = newColor;
    this.mesh.material.color = newColor;
    this.mesh.material.emissive = newColor;
    this.light.color = newColor;
  }

  /**
   * Restaure l'énergie (par exemple, en mangeant)
   */
  eat(amount = 20) {
    this.energy = Math.min(100, this.energy + amount);
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}

export default Boid;