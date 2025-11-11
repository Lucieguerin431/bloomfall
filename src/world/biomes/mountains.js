import * as THREE from "three";
import { generateHeight } from "./terrainUtils/terrainUtils.js";

export function createMountainsBiome({ size = 50, position = { x: 0, z: 0 } }) {

  const resolution = 256;
  const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const heightMap = generateHeight(resolution + 1, resolution + 1, 0.06, "fractal");

  for (let i = 0; i < pos.count; i++) {
    const ix = i % (resolution + 1);
    const iz = Math.floor(i / (resolution + 1));

    let h = heightMap[ix][iz];

    // Adoucir le relief
    h = Math.sign(h) * Math.pow(Math.abs(h), 1.6);
    h *= 8; // hauteur finale
    // lissage voisin
    const hx1 = heightMap[ix - 1]?.[iz] ?? h;
    const hx2 = heightMap[ix + 1]?.[iz] ?? h;
    const hz1 = heightMap[ix]?.[iz - 1] ?? h;
    const hz2 = heightMap[ix]?.[iz + 1] ?? h;
    h = (h + hx1 + hx2 + hz1 + hz2) / 15;
    pos.setY(i, h);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x688588,
    roughness: 1,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, 0, position.z);
  mesh.receiveShadow = true;

  return { mesh, update() { } };
}
