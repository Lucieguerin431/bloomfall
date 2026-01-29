/**
 * Définition d'une créature "blob" contrôlée par un petit réseau de neurones.
 *
 * Chaque instance possède :
 *  - des gènes (qui déterminent sa forme + couleur),
 *  - un cerveau (réseau de neurones feed‑forward),
 *  - un état physique 2D (x, y, vitesse, angle, énergie).
 *
 * La classe ne connaît pas le terrain ni la nourriture : elle se contente
 * de lire des infos "d'environnement" (distance à la nourriture, etc.)
 * et de mettre à jour sa position. C'est le `CreatureSystem` qui branche
 * tout ça avec le reste du monde.
 */
import * as THREE from 'three';
import { NeuralNetwork } from './NeuralNetwork.js';


// petite fonction pratique pour faire un lerp (interp linéaire)
const lerp = (a,b,t) => a + (b-a)*t;


// ----------------------------
//  GÈNES PAR DÉFAUT
// ----------------------------
export function genesDefault() {
  const g = [];
  for(let i=0;i<10;i++) g.push(Math.random());
  return g;
}

// ============================================================
//  CLASSE CREATURE  (cerveau neuronal + update())
// ============================================================
export class Creature {

  constructor(genes, brainGenome = null) {
    this.genes = genes.slice();
    this.energy = 100;
    this.speed = 0;
    this.angle = 0;

    // Position initiale dans le plan 2D "logique" (le Y 3D sera géré ailleurs)
    this.x = 0;
    this.y = 0;

    // Création du mesh 3D depuis les gènes
    this.mesh = this.buildMeshFromGenes(genes);

    // Création du réseau neuronal (petit MLP à 1 couche cachée)
    this.brain = new NeuralNetwork(
      5,   // nb inputs
      4,   // hidden
      2,   // outputs
      brainGenome // génome des poids 
    );

    // Valeurs d'environnement (remplies par le système externe avant chaque update)
    this.distanceFood = 0;
    this.distanceWall = 0;
    this.speedX = 0;
    this.speedY = 0;
    
  }



  // ============================================================
  // Intelligence + mouvement physique
  // ============================================================
  update(dt) {

    // Calcul des outputs du cerveau 
    const outputs = this.brain.compute([
      this.distanceFood,
      this.distanceWall,
      this.speedX,
      this.speedY,
      this.energy
    ]);

    // output[0] = rotation
    this.angle += outputs[0] * 0.1;

    // output[1] = accélération
    this.speed += outputs[1] * 0.01;

    // Physique : on convertit l'angle + la vitesse scalaire
    // en vecteur vitesse (vx, vy) dans le plan.
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;

    this.x += vx * dt;
    this.y += vy * dt;

    this.speedX = vx;
    this.speedY = vy;

    // Mise à jour du mesh (pour l'instant on laisse la hauteur à 0,
    // la surélévation par rapport au terrain est gérée par CreatureSystem).
    this.mesh.position.set(this.x, 0, this.y);
    this.mesh.rotation.y = -this.angle;

    //  Energie dépensée 
    this.energy -= 0.02 + Math.abs(this.speed) * 0.002;
  }

  // ============================================================
// CRÉATION DU MESH 3D (STYLE ORGANIQUE / BLOB)
// ============================================================
buildMeshFromGenes(genes) {
    const group = new THREE.Group();
    group.userData.genes = genes.slice();

    // 1. Décodage des gènes pour le style organique
    const size = lerp(0.5, 1.8, genes[0]);           // Taille globale
    const squish = lerp(0.6, 1.4, genes[1]);         // Écrasement (forme ovale)
    const hue = genes[2];                            // Couleur
    const roughness = lerp(0.0, 0.6, genes[3]);      // Aspect gluant (0) ou mat (1)
    const nucleusCount = Math.floor(lerp(1, 6, genes[4])); // Organes internes
    const tentacleLen = lerp(0, 1.5, genes[5]);      // Longueur des tentacules

    const mainColor = new THREE.Color().setHSL(hue, 1.0, 0.5);
    const nucleusColor = new THREE.Color().setHSL((hue + 0.5) % 1, 0.8, 0.5); // Couleur complémentaire

    // 2. CORPS (Membrane gélatineuse)
    // On utilise Icosahedron avec détail pour une sphère plus "naturelle"
    const bodyGeo = new THREE.IcosahedronGeometry(size, 2); 
    
    // MeshPhysicalMaterial est la clé pour l'effet "Blob"
    const bodyMat = new THREE.MeshPhysicalMaterial({
        color: mainColor,
        metalness: 0.1,
        roughness: roughness,
        transmission: 0.6,  // Transparence type verre/gelée
        thickness: 1.5,     // Réfraction de la lumière
        opacity: 0.8,
        transparent: true,
        clearcoat: 1.0,     // Couche de vernis (aspect mouillé)
        clearcoatRoughness: 0.1
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(1, squish, 1); // Déforme la sphère
    body.castShadow = true;
    group.add(body);

    // 3. ORGANES INTERNES (Noyaux opaques flottants)
    const nucleusGeo = new THREE.SphereGeometry(size * 0.2, 8, 8);
    const nucleusMat = new THREE.MeshStandardMaterial({ 
        color: nucleusColor, 
        emissive: nucleusColor,
        emissiveIntensity: 0.5,
        roughness: 0.2 
    });

    for(let i=0; i<nucleusCount; i++) {
        const nuc = new THREE.Mesh(nucleusGeo, nucleusMat);
        // Position aléatoire à l'intérieur du corps
        nuc.position.set(
            (Math.random()-0.5) * size * 0.8,
            (Math.random()-0.5) * size * 0.8 * squish,
            (Math.random()-0.5) * size * 0.8
        );
        // Rotation aléatoire pour varier
        nuc.rotation.set(Math.random(), Math.random(), Math.random());
        group.add(nuc);
    }

    // 4. YEUX (Sur la surface)
    const eyeGeo = new THREE.SphereGeometry(size * 0.15, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Group();
    const lBall = new THREE.Mesh(eyeGeo, eyeMat);
    const lPupil = new THREE.Mesh(new THREE.SphereGeometry(size*0.06), pupilMat);
    lPupil.position.z = size*0.13;
    leftEye.add(lBall, lPupil);
    
    const rightEye = leftEye.clone();

    // Positionnement des yeux sur le devant
    const eyeY = size * 0.3 * squish;
    const eyeZ = size * 0.85;
    const eyeX = size * 0.35;

    leftEye.position.set(-eyeX, eyeY, eyeZ);
    rightEye.position.set(eyeX, eyeY, eyeZ);
    group.add(leftEye, rightEye);

    // 5. TENTACULES (au lieu des jambes)
    // On utilise une capsule allongée pour faire une traînée
    if (tentacleLen > 0.1) {
        const tentacleGeo = new THREE.CapsuleGeometry(size * 0.05, tentacleLen, 4, 8);
        const tentacleMat = new THREE.MeshStandardMaterial({ color: mainColor });
        
        const tCount = Math.floor(size * 4); // Plus la créature est grosse, plus elle a de tentacules
        for(let i=0; i<tCount; i++) {
            const t = new THREE.Mesh(tentacleGeo, tentacleMat);
            const angle = (i / tCount) * Math.PI * 2;
            
            t.position.set(
                Math.cos(angle) * size * 0.5,
                -size * 0.5 * squish, 
                Math.sin(angle) * size * 0.5
            );
            
            // Rotation pour qu'elles pendent un peu vers l'arrière
            t.rotation.x = Math.PI / 4; 
            t.rotation.y = angle;
            group.add(t);
        }
    }

    return group;
}
}


// ============================================================
//   créer une instance
// ============================================================
export function createCreatureFromGenes(genes, genome = null) {
  const creature = new Creature(genes, genome);
  return creature;
}
