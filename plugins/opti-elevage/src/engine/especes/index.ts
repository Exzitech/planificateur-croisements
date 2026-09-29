import { couleurParId, hexCouleur, nomCouleur } from "../couleurs";
import { construireCatalogue } from "../objectif";
import { perruches } from "./perruches";
import { canaris } from "./canaris";
import { pinsons } from "./pinsons";
import type { Espece, EspeceBrute } from "./types";

export type { Espece, EspeceBrute } from "./types";

function construireEspece(brute: EspeceBrute): Espece {
  const { couleurs } = brute;
  const { catalogue, idsRecette, recettesBicolores, resoudreObjectif, libelleObjectif } =
    construireCatalogue(brute);
  return {
    ...brute,
    affichage: {
      nomCouleur: (id, recettes) => nomCouleur(couleurs, id, recettes),
      hexCouleur: (id, recettes) => hexCouleur(couleurs, id, recettes),
      couleurParId: (id) => couleurParId(couleurs, id),
    },
    catalogue,
    idsRecette,
    recettesBicolores,
    resoudreObjectif,
    libelleObjectif,
  };
}

/** Les especes disponibles dans l'outil, dans l'ordre d'affichage des onglets. */
export const ESPECES: readonly Espece[] = [perruches, canaris, pinsons].map(construireEspece);

export const especeParId = (id: string): Espece => ESPECES.find((e) => e.id === id) ?? ESPECES[0];
