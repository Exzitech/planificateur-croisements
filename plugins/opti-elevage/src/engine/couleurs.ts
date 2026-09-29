import type { Couleur, CouleurId } from "./types";

/**
 * Aides d'affichage generiques, communes a toutes les especes : chacune prend
 * la liste des couleurs de l'espece active en premier argument.
 */

export const couleurParId = (couleurs: readonly Couleur[], id: CouleurId): Couleur | undefined =>
  couleurs.find((c) => c.id === id);

/**
 * Nom affichable d'une couleur, y compris une bicolore sans nom dedie (un
 * intermediaire de recette, ou une bicolore de generation 10 choisie comme
 * objectif) : le jeu les nomme « X et Y ».
 */
export function nomCouleur(
  couleurs: readonly Couleur[],
  id: CouleurId,
  recettes?: Record<string, [string, string]>,
): string {
  const connue = couleurParId(couleurs, id);
  if (connue) return connue.nom;
  const parents = recettes?.[id];
  if (parents) {
    const [a, b] = parents.map((p) => couleurParId(couleurs, p)?.nom ?? p);
    return `${a} et ${b}`;
  }
  return id;
}

/** Pastille d'une bicolore : la couleur du premier parent, a defaut du gris. */
export function hexCouleur(
  couleurs: readonly Couleur[],
  id: CouleurId,
  recettes?: Record<string, [string, string]>,
): string {
  const connue = couleurParId(couleurs, id);
  if (connue) return connue.hex;
  const parents = recettes?.[id];
  if (parents) return couleurParId(couleurs, parents[0])?.hex ?? "#8b91a1";
  return "#8b91a1";
}
