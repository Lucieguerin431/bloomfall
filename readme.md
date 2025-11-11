# Bloomfall – Biome Montagnes

## Description

Le biome Montagnes de Bloomfall propose un terrain réaliste, fractal et stylisé, compatible avec un rendu low-poly pour Three.js.  
Au lieu d’utiliser des fractales complexes comme le Mandelbulb, nous avons opté pour un **bruit fractal 2D (Perlin/Simplex)** afin de contrôler facilement les reliefs, chaînes de montagnes et vallées, tout en maintenant de bonnes performances.

## Méthode de génération

### Plan de base
- `PlaneGeometry` orienté horizontalement, servant de grille pour le terrain  
- Résolution typique : 128×128 vertices (ajustable)

### Heightmap fractale
- Chaque sommet reçoit une hauteur basée sur le bruit fractal combinant **grandes ondulations** et **détails fins** pour un relief naturel

### Accentuation et ajustement des reliefs
- Légère exponentiation pour renforcer sommets et vallées  
- Multiplication par un facteur pour définir la hauteur globale  
- Lissage optionnel pour des chaînes continues et éviter les pics isolés

### Matériau low-poly
- Utilisation d’un `MeshStandardMaterial` avec `flatShading` pour un style stylisé et performant

## Résultat visuel
- Chaînes de montagnes continues  
- Sommets et vallées variés et naturels  
- Relief stylisé mais crédible  
- Compatible avec les autres biomes et performant en temps réel

## Points techniques
- **Noise fractal :** Perlin / Simplex  
- **Exponentiation :** contrôle de la forme des crêtes  
- **Multiplicateur de hauteur :** contrôle des hauteurs globales  
- **Lissage :** réduction des pics isolés  
- **Low-poly :** rapide et stylisé, 128×128 vertices
