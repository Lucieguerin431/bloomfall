/**
 * Petit réseau de neurones "maison" de type feed‑forward (1 couche cachée).
 *
 * Objectif : avoir un cerveau très simple pour les blobs, sans dépendre
 * d'une grosse librairie de ML. Tout est codé à la main : matrices de poids,
 * produit matriciel, fonction d'activation, etc.
 */
// Classe représentant un réseau de neurones simple (feedforward 2 couches)
export class NeuralNetwork {

    // constructeur : définit le nombre de neurones par couche et initialise les poids
    constructor(nbInput, nbHidden, nbOutput, weights = null) {
        this.nbInput = nbInput + 1; // +1 pour le biais
        this.nbHidden = nbHidden;
        this.nbOutput = nbOutput;

        // Si des poids sont fournis, on les utilise (utile pour reproduire un réseau existant)
        if (weights) {
            this.w1 = weights.w1; // poids entre entrée et couche cachée
            this.w2 = weights.w2; // poids entre couche cachée et sortie
        } else {
            // Sinon, on initialise aléatoirement les poids
            // w1 : matrice nbInput x nbHidden
            this.w1 = Array.from({ length: this.nbInput }, () =>
                Array.from({ length: this.nbHidden }, () => Math.random() * 4 - 2) // valeurs entre -2 et 2
            );

            // w2 : matrice nbHidden x nbOutput
            this.w2 = Array.from({ length: this.nbHidden }, () =>
                Array.from({ length: this.nbOutput }, () => Math.random() * 4 - 2)
            );
        }
    }

    // fonction d'activation : tanh (valeurs entre -1 et 1)
    sigmoid(x) { 
        return Math.tanh(x); 
    }

    // calcule la sortie du réseau pour un tableau d'inputs
    compute(inputs) {
        // vérifie que le nombre d’inputs correspond
        if (inputs.length !== this.nbInput - 1) {
            console.error("Mauvais nombre d'inputs pour le réseau !");
            return Array(this.nbOutput).fill(0); // renvoie un tableau nul si erreur
        }

        // ajoute le biais à la couche d’entrée
        const inputLayer = [...inputs, 1];

        // Calcul de la couche cachée
        const hidden = new Array(this.nbHidden).fill(0);
        for (let j = 0; j < this.nbHidden; j++) {
            for (let i = 0; i < this.nbInput; i++) {
                hidden[j] += inputLayer[i] * this.w1[i][j]; // somme pondérée
            }
            hidden[j] = this.sigmoid(hidden[j]); // activation
        }

        // Calcul de la couche de sortie
        const outputs = new Array(this.nbOutput).fill(0);
        for (let k = 0; k < this.nbOutput; k++) {
            for (let j = 0; j < this.nbHidden; j++) {
                outputs[k] += hidden[j] * this.w2[j][k]; // somme pondérée
            }
            outputs[k] = this.sigmoid(outputs[k]); // activation
        }

        // renvoie les valeurs de sortie du réseau
        return outputs;
    }

    // exporte le "genome" du réseau (poids) pour sauvegarde ou reproduction
    exportGenome() {
        return {
            w1: this.w1.map(row => [...row]), // copie profonde de la matrice w1
            w2: this.w2.map(row => [...row])  // copie profonde de la matrice w2
        };
    }
}
