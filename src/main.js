import './style.css';
import * as THREE from 'three';
import { Game } from './core/game.js';

let renderer, scene, camera, game;
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
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(60, 40, 80);
  camera.lookAt(0, 0, 0);

  // Game
  game = new Game(scene, camera);

  window.addEventListener('resize', onResize);
  animate(0);

  //Light
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(50, 100, 50);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

}

function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  game.update(delta);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
