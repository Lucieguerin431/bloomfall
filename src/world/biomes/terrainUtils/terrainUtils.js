//PAS UTILISE
import { createNoise2D } from 'simplex-noise';

export function generateHeight(width, height, scale = 0.1, type = 'perlin') {
    const noise2D = createNoise2D(); 

    const data = [];

    for (let i = 0; i < width; i++) {
        data[i] = [];
        for (let j = 0; j < height; j++) {

            let value = 0;

            if (type === 'perlin') {
                value = noise2D(i * scale, j * scale);
            }

            else if (type === 'fractal') {
                let amp = 1;
                let freq = 1;
                for (let o = 0; o < 5; o++) {
                    value += noise2D(i * scale * freq, j * scale * freq) * amp;
                    amp *= 0.5;
                    freq *= 2;
                }
            }

            data[i][j] = value;
        }
    }

    return data;
}
