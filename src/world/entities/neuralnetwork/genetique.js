/*
  Classe Genetic qui gère toute la logique de l’algorithme génétique.
  Elle stocke la population, applique crossover, mutation, et génère les nouvelles générations.
*/

export default class Genetic {
  constructor(populationSize = 24, geneCount = 10) {
    this.populationSize = populationSize; // taille de la population
    this.geneCount = geneCount;           // nombre de gènes par individu
    this.generation = 0;                  // compteur de génération
    this.individuals = [];                // tableau des individus 
    this.selectedIndices = new Set();     // indices des individus choisis par l’utilisateur
    this.initRandom();                     // on initialise la première population aléatoire
  }

  // --------------------
  // initialisation aléatoire
  // --------------------
  initRandom() {
    this.individuals = [];
    for (let i=0;i<this.populationSize;i++) {
      const genes = [];
      for (let g=0; g < this.geneCount; g++) genes.push(Math.random()); // chaque gène = un nombre [0..1]
      this.individuals.push({ genes }); // on stocke seulement les gènes pour l'instant
    }
  }

  // modifier la taille de la population et recréer tout aléatoirement
  setPopulationSize(n) {
    this.populationSize = n;
    this.initRandom();
  }

  // --------------------
  // crossover simple
  // --------------------
  // on prend 2 parents et on coupe leurs gènes à un point aléatoire
  // l’enfant prend les gènes de A jusqu’au cut, puis ceux de B après
  crossover(aGenes, bGenes) {
    const cut = Math.floor(Math.random() * this.geneCount);
    const child = [];
    for (let i=0;i<this.geneCount;i++) {
      child.push(i < cut ? aGenes[i] : bGenes[i]);
    }
    return child;
  }

  // --------------------
  // mutation
  // --------------------
  // petite variation aléatoire sur certains gènes
  mutate(genes, rate = 0.08, amount = 0.12) {
    const out = genes.slice(); // clone des gènes
    for (let i=0;i<out.length;i++) {
      if (Math.random() < rate) { // probabilité de mutation
        const delta = (Math.random() - 0.5) * 2 * amount; // variation dans [-amount, +amount]
        out[i] = Math.min(1, Math.max(0, out[i] + delta)); // clamp entre 0 et 1
      }
    }
    return out;
  }

  // --------------------
  // génération suivante
  // --------------------
  // selectedIndices = ensemble des individus choisis par l’utilisateur
  nextGeneration(selectedIndices) {
    const sel = Array.from(selectedIndices);
    const newPop = [];

    // si personne n’a été choisi, on prend 3 parents au hasard
    if (sel.length === 0) {
      for (let i=0;i<3;i++) sel.push(Math.floor(Math.random() * this.individuals.length));
    }

    // on récupère les gènes des parents sélectionnés
    const pool = sel.map(i => this.individuals[i].genes);

    // élitisme : on copie un parent directement pour garder de la variété
    const elite = pool[Math.floor(Math.random()*pool.length)];
    newPop.push(elite.slice());

    // on remplit le reste de la population avec crossover + mutation
    while (newPop.length < this.populationSize) {
      const A = pool[Math.floor(Math.random()*pool.length)];
      const B = pool[Math.floor(Math.random()*pool.length)];
      let child = this.crossover(A,B);
      child = this.mutate(child, 0.08, 0.12);
      newPop.push(child);
    }

    // on met à jour la population avec les nouveaux gènes
    this.individuals = newPop.map(g => ({ genes: g }));
    this.generation++; // on incrémente le compteur de génération
    return this.individuals; // on renvoie la population
  }
}
