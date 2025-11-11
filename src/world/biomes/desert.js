import { Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';

export function createDesertBiome({ size, position }) {

  const geo = new PlaneGeometry(size, size, 40, 40);

  for (let i = 0; i < geo.attributes.position.count; i++) {
    const vx = geo.attributes.position.getX(i);
    const vz = geo.attributes.position.getZ(i);
    const y = Math.sin(vx * 0.1) * Math.cos(vz * 0.1) * 1.5; // dunes simples
    geo.attributes.position.setY(i, y);
  }
  geo.computeVertexNormals();

  const mat = new MeshStandardMaterial({
    color: 0xE0C478,
    flatShading: true
  });

  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0, position.z);

  return { mesh, update(delta) {} };
}
