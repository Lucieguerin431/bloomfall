/**
 * Classe "Game" très légère qui encapsule un `World`.
 * 
 * Pour l'instant elle crée juste le monde et relaye l'update,
 * mais on pourrait y rajouter plus tard la gestion de l'état global du jeu
 * (menus, pause, HUD, etc.).
 */
import { World } from '../world/world.js';

export class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.world = new World();
    scene.add(this.world.group);
  }

  update(delta) {
    this.world.update(delta);
  }
}
