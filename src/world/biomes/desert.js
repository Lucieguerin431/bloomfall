import * as THREE from 'three';
import { generateHeight } from '../terrainUtils.js';

export function createDesertBiome({ size = 50, position = { x: 0, z: 0 } } = {}) {
    const segments = 50;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const heights = generateHeight(segments + 1, segments + 1, 0.05, 'perlin');

    for (let i = 0; i < geometry.attributes.position.count; i++) {
        const ix = i % (segments + 1);
        const iy = Math.floor(i / (segments + 1));
        geometry.attributes.position.setZ(i, heights[ix][iy] * 10); // hauteur dunes
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ color: 0xEDC9AF, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0, position.z);

    return {
        mesh,
        update(delta) {}
    };
}
