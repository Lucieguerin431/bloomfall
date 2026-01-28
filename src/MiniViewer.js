import * as THREE from 'three';

export class MiniViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // 1. Scène isolée
        this.scene = new THREE.Scene();
        
        // 2. Caméra fixe
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.camera.position.set(0, 1, 3.5);
        this.camera.lookAt(0, 0, 0);

        // 3. Rendu transparent
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(200, 200); // Taille fixe correspondant au CSS
        this.container.appendChild(this.renderer.domElement);

        // 4. Lumières (Essentielles pour voir le mesh !)
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(2, 5, 5);
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        this.model = null;
    }

    // Affiche une créature donnée
    show(creature) {
        if (!creature || !creature.mesh) return;

        // Nettoyer l'ancien modèle
        if (this.model) this.scene.remove(this.model);

        // Cloner pour ne pas enlever la créature du monde principal
        this.model = creature.mesh.clone();
        
        // IMPORTANT : Reset de la position pour qu'elle soit bien au centre de la boîte
        this.model.position.set(0, -0.5, 0); 
        this.model.rotation.set(0, 0, 0);
        
        this.scene.add(this.model);
    }

    // Appeler ça dans ta boucle d'animation principale
    render() {
        if (this.model) {
            this.model.rotation.y += 0.01; // Petite rotation sympa
        }
        this.renderer.render(this.scene, this.camera);
    }
}