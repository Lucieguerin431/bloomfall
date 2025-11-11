import { Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';

export function createForestBiome({ size, position }) {

  const geo = new PlaneGeometry(size, size, 50, 50);

  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = Math.random() * 1.2;  // plus irrégulier
    geo.attributes.position.setY(i, y);
  }
  geo.computeVertexNormals();

  const mat = new MeshStandardMaterial({
    color: 0x335533,
    flatShading: true
  });

  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0, position.z);

  return { mesh, update(delta) {} };
}
