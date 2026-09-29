import type { Couleur, CouleurId } from "../types";
import type { EntreeCatalogue, Objectif } from "../objectif";

/** Les donnees propres a une espece, telles qu'ecrites a la main. */
export interface EspeceBrute {
  id: string;
  nom: string;
  emoji: string;
  /** Les couleurs nommees du jeu (monocolores, et bicolores ayant un nom propre). */
  couleurs: readonly Couleur[];
  /**
   * Les couleurs proposables comme objectif et combinables en bicolore libre :
   * pour Perruches, celles qui ont un nom propre (hors bicolores
   * intermediaires DR, AD...) ; pour Canaris/Pinsons, les 15 monocolores.
   */
  couleursSimples: readonly CouleurId[];
  /** Les couleurs capturables en jeu (generation 1, sans recette). */
  capturables: readonly CouleurId[];
  recettesDefaut: string;
  objectifDefaut: Objectif;
}

/** Une espece prete a l'emploi : donnees brutes + aides derivees, calculees une fois. */
export interface Espece extends EspeceBrute {
  affichage: {
    nomCouleur: (id: CouleurId, recettes?: Record<string, [string, string]>) => string;
    hexCouleur: (id: CouleurId, recettes?: Record<string, [string, string]>) => string;
    couleurParId: (id: CouleurId) => Couleur | undefined;
  };
  /** Toutes les couleurs proposables dans l'enclos : couleurs nommees + bicolores libres. */
  catalogue: readonly EntreeCatalogue[];
  /** Les ids du vocabulaire propre a l'espece (bicolores intermediaires sans nom dedie). */
  idsRecette: readonly CouleurId[];
  recettesBicolores: (utilisees: Iterable<CouleurId>) => { lignes: string; ids: CouleurId[] };
  resoudreObjectif: (objectif: Objectif, byPair?: Record<string, CouleurId>) => CouleurId[];
  libelleObjectif: (objectif: Objectif) => string;
}
