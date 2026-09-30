import type { Espece } from "../engine";
import type { NouveauGroupe } from "./enclos";

/**
 * Un enclos de couleurs de base plausible, pour tester l'ecran sans remplir
 * l'enclos a la main : par couleur capturable, des fecondes des deux sexes,
 * quelques fertiles en attente et quelques steriles. Deterministe (pas de
 * hasard) pour que deux essais donnent le meme resultat.
 */
export function genererDonneesTest(espece: Espece): NouveauGroupe[] {
  const groupes: NouveauGroupe[] = [];
  espece.capturables.forEach((couleur, i) => {
    groupes.push(
      // enAttente explicite : sans lui, la migration de l'enclos (fertile sans
      // enAttente = ancienne saisie) repasserait ces fecondes « en attente ».
      { couleur, sexe: 0, fertile: true, enAttente: false, niveau: 1, parents: [], quantite: 6 + i },
      { couleur, sexe: 1, fertile: true, enAttente: false, niveau: 1, parents: [], quantite: 6 + i },
      { couleur, sexe: 0, fertile: true, enAttente: true, niveau: 1, parents: [], quantite: 2 },
      { couleur, sexe: 1, fertile: true, enAttente: true, niveau: 1, parents: [], quantite: 2 },
      { couleur, sexe: 0, fertile: false, niveau: 1, parents: [], quantite: 3 },
      { couleur, sexe: 1, fertile: false, niveau: 1, parents: [], quantite: 3 },
    );
  });
  return groupes;
}
