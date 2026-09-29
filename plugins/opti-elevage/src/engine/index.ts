export { couleurParId, hexCouleur, nomCouleur } from "./couleurs";
export { chanceCible, croisement, tirerBebe } from "./croisement";
export { mulberry32, type Rng } from "./hasard";
export { analyserRecettes, clePaire, idsDefinis } from "./recettes";
export { ESPECES, especeParId, type Espece, type EspeceBrute } from "./especes";
export { analyser, optionsPour, type OptionsAnalyse } from "./analyse";
export { cleGroupe, deplier, simuler, type Enclos } from "./simulation";
export type {
  Analyse,
  Besoin,
  Candidat,
  Captures,
  Config,
  Couleur,
  CouleurId,
  Croisement,
  Bete,
  Etape,
  EtapePlan,
  Groupe,
  Plan,
  Parametres,
  Recettes,
  Resume,
  Sexe,
  VaguePlan,
} from "./types";

import type { Parametres } from "./types";

/**
 * Reglages par defaut. p0 et lv viennent de l'interface du jeu ; gpF et gpDecay
 * sont calibres sur deux captures, d'ou leur presence dans les reglages avances.
 */
export const PARAMETRES_DEFAUT: Parametres = {
  p0: 0.3,
  lv: 0.0015,
  opt: 0,
  gpF: 0.6,
  gpDecay: 0.1875,
  levelPlan: 60,
};

export { idBicolore, type EntreeCatalogue, type Objectif } from "./objectif";
