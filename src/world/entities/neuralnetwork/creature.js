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

    // Position initiale
    this.x = 0;
    this.y = 0;

    // Création du mesh 3D depuis les gènes
    this.mesh = this.buildMeshFromGenes(genes);

    // Création du réseau neuronal
    this.brain = new NeuralNetwork(
      5,   // nb inputs
      4,   // hidden
      2,   // outputs
      brainGenome // génome des poids 
    );

    // Valeurs d'environnement 
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

    // Physique 
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;

    this.x += vx * dt;
    this.y += vy * dt;

    this.speedX = vx;
    this.speedY = vy;

    // Mise à jour du mesh 
    this.mesh.position.set(this.x, 0, this.y);
    this.mesh.rotation.y = -this.angle;

    //  Energie dépensée 
    this.energy -= 0.02 + Math.abs(this.speed) * 0.002;
  }



  // ============================================================
  // CRÉATION DU MESH 3D 
  // ============================================================
  buildMeshFromGenes(genes) {
    const group = new THREE.Group();
    group.userData.genes = genes.slice();

    // map gènes → paramètres physiques
    const bodyW = lerp(0.5, 3.0, genes[0]);
    const bodyH = lerp(0.5, 3.0, genes[1]);
    const bodyD = lerp(0.5, 3.0, genes[2]);
    const headScale = lerp(0.3, 1.5, genes[3]);
    const legLength = lerp(0.2, 2.5, genes[4]);
    const legThick = lerp(0.05, 0.5, genes[5]);
    const legCount = Math.max(2, Math.round(lerp(2, 8, genes[6])));
    const antennaLen = lerp(0, 2.0, genes[7]);
    const hue = genes[8];
    const tilt = lerp(-0.6, 0.6, genes[9]);

    const color = new THREE.Color().setHSL(hue, 0.6, 0.5);


    // -----------------
    // CORPS
    // -----------------
    const bodyGeo = new THREE.SphereGeometry(bodyW, 16, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color, metalness: 0.2, roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // -----------------
    // TÊTE
    // -----------------
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(Math.min(bodyW, bodyH) * headScale * 0.45, 16, 12),
      new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.6 })
    );
    head.position.set(0, bodyH*0.5 + (head.geometry.parameters.radius || 0.4)*0.9, 0);
    group.add(head);

    // -----------------
    // JAMBES
    // -----------------
    const legsGroup = new THREE.Group();
    const spacing = bodyW / (legCount+1);

    for (let i=0;i<legCount;i++) {
      const x = -bodyW*0.5 + spacing*(i+1);
      const legGeo = new THREE.CylinderGeometry(legThick, legThick, legLength, 10);
      const legMat = new THREE.MeshStandardMaterial({ color, metalness:0.1, roughness:0.7 });

      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, -bodyH*0.5 - legLength*0.5, bodyD*0.25);
      leg.rotation.z = Math.PI/2 * 0.06 * (i%2?1:-1);
      legsGroup.add(leg);

      const leg2 = leg.clone();
      leg2.position.z = -bodyD*0.25;
      legsGroup.add(leg2);
    }
    group.add(legsGroup);

    // -----------------
    // ANTENNES
    // -----------------
    if (antennaLen > 0.05) {
      const antMat = new THREE.MeshStandardMaterial({ color, metalness:0.1, roughness:0.7 });
      const antGeom = new THREE.CylinderGeometry(0.03, 0.03, antennaLen, 8);

      const a1 = new THREE.Mesh(antGeom, antMat);
      const a2 = a1.clone();
      a1.position.set(bodyW*0.2, bodyH*0.5 + antennaLen*0.5, bodyD*0.15);
      a2.position.set(-bodyW*0.2, bodyH*0.5 + antennaLen*0.5, bodyD*0.15);
      a1.rotation.x = -0.3; a2.rotation.x = -0.3;
      group.add(a1, a2);
    }

    // -----------------
    // YEUX
    // -----------------
    const eyeGeom = new THREE.SphereGeometry(Math.max(0.03, Math.min(0.12, headScale*0.06)), 8, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05,0.05,0.05), metalness:0.1 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    const rightEye = leftEye.clone();

    const eyeOff = (bodyW * 0.12) + headScale*0.02;
    leftEye.position.set(-eyeOff, head.position.y, head.geometry.parameters.radius*0.4);
    rightEye.position.set(eyeOff, head.position.y, head.geometry.parameters.radius*0.4);

    group.add(leftEye, rightEye);

    // posture
    group.rotation.x = tilt;

    // scale global
    group.scale.setScalar(0.9);

    // bounding spheres
    group.traverse((m) => {
      if (m.isMesh) {
        m.geometry.computeBoundingSphere();
      }
    });

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
