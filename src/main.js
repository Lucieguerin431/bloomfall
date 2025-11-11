import './style.css';
import * as THREE from 'three';
import { Game } from './core/game.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let renderer, scene, camera, game, controls;
let lastTime = 0;

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    100,
    window.innerWidth / window.innerHeight,
    0.5,
    1000
  );
  camera.position.set(60, 40, 80);
  camera.lookAt(0, 0, 0);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0); // point autour duquel tourner
  controls.enableDamping = true; // lissage des mouvements
  controls.dampingFactor = 0.05;
  controls.minDistance = 20; // distance mini pour zoom
  controls.maxDistance = 200; // distance maxi pour zoom
  controls.maxPolarAngle = Math.PI / 2; // limite pour pas passer sous le terrain

  // Game
  game = new Game(scene, camera);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(50, 100, 50);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  // Resize
  window.addEventListener('resize', onResize);

  // Start animation
  animate(0);
}

function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  game.update(delta);

  // Update controls pour le damping
  controls.update();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
