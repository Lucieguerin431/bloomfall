import { Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';

export function createMountainsBiome({ size, position }) {

  const geo = new PlaneGeometry(size, size, 100, 100);

  // Élévation simple
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = Math.random() * 6 +2;   // plus tard : Mandelbulb 
    geo.attributes.position.setY(i, y);
  }
  geo.computeVertexNormals();

  const mat = new MeshStandardMaterial({
    color: 0x8899cc,
    flatShading: true
  });

  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x, 0, position.z);

  return {
    mesh,
    update(delta) {}
  };
}
