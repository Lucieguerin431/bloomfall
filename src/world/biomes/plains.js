import { Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';

export function createPlainsBiome({ size, position }) {

  const geo = new PlaneGeometry(size, size, 40, 40);

  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = Math.random() * 0.3;
    geo.attributes.position.setY(i, y);
  }
  geo.computeVertexNormals();

  const mat = new MeshStandardMaterial({
    color: 0x88cc77,
    flatShading: true
  });

  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0, position.z);

  return { mesh, update(delta) {} };
}
