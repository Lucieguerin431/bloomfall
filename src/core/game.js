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
