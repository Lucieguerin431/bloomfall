import * as THREE from 'three';

export class CreatureInspector {
  constructor(domId) {
    this.container = document.getElementById(domId);
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. Scène et Caméra dédiées
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222); // Gris foncé pour bien voir la transparence

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 1.5, 4);
    this.camera.lookAt(0, 0, 0);

    // 2. Renderer dédié (plus simple que le scissor test pour débuter)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // 3. Lumières (Important pour le style Blob !)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 5, 5);
    this.scene.add(dirLight);
    
    // Lumière bleue par en dessous pour le style "Sci-Fi"
    const bottomLight = new THREE.PointLight(0x0088ff, 0.5);
    bottomLight.position.set(0, -2, 2);
    this.scene.add(bottomLight);

    this.currentMesh = null;
  }

  // Appelle cette fonction quand tu veux afficher une nouvelle créature
  inspect(creature) {
    if (!creature || !creature.mesh) return;

    // Nettoyage de l'ancienne mesh
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      // On ne dispose pas la géométrie car elle est partagée, 
      // mais on peut nettoyer si tu clones tout.
    }

    // IMPORTANT : On CLONE le mesh pour ne pas l'enlever du monde principal
    this.currentMesh = creature.mesh.clone();
    
    // On remet la position à 0,0,0 dans l'inspecteur
    this.currentMesh.position.set(0, 0, 0);
    this.currentMesh.rotation.set(0, 0, 0);

    this.scene.add(this.currentMesh);
  }

  update() {
    // Petite rotation automatique pour faire "Showcase"
    if (this.currentMesh) {
      this.currentMesh.rotation.y += 0.01;
    }
    this.renderer.render(this.scene, this.camera);
  }
}