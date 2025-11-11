function mandelbulbValue(x, z, scale = 0.015, power = 8) {

    let zx = x * scale;
    let zy = z * scale;
    let zz = 0.0;

    let dr = 1.0;
    let r = 0.0;

    for (let i = 0; i < 8; i++) {
        r = Math.sqrt(zx*zx + zy*zy + zz*zz);
        if (r > 2.0) break;

        let theta = Math.acos(zz / r);
        let phi = Math.atan2(zy, zx);

        dr = Math.pow(r, power - 1.0) * power * dr + 1.0;

        let zr = Math.pow(r, power);
        theta *= power;
        phi *= power;

        zx = zr * Math.sin(theta) * Math.cos(phi) + x * scale;
        zy = zr * Math.sin(theta) * Math.sin(phi) + z * scale;
        zz = zr * Math.cos(theta);
    }

    return Math.log(r) * r;
}

// MULTIFRACTAL
export function mandelbulbHeight(x, z) {
    let h = 0;

    // couches superposées
    h += 1.0  * mandelbulbValue(x,     z,     0.02);
    h += 0.8  * mandelbulbValue(x+50,  z+30,  0.018);
    h += 0.6  * mandelbulbValue(x-30,  z+70,  0.025);
    h += 0.5  * mandelbulbValue(x*0.5, z*0.5, 0.03);

    // Normalisation légère
    h = h / 2.5;  // moins agressif qu’avant
    // clamp facultatif
    h = Math.max(-10, Math.min(10, h)); // garde les pics réalistes mais hauts

    return h;
}

