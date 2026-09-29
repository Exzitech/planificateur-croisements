// Regles de l'enclos qui ne dependent ni de React ni du hub : `useEnclos` les
// applique, les tests les appellent directement.
import type { CouleurId, Groupe, Sexe } from "../engine";

/** Deux betes identiques sur tous ces criteres tiennent dans le meme groupe. */
export const memeGroupe = (a: Omit<Groupe, "id" | "quantite">, b: Groupe) =>
  a.couleur === b.couleur
  && a.sexe === b.sexe
  && a.fertile === b.fertile
  && !!a.enAttente === !!b.enAttente
  && a.niveau === b.niveau
  && a.parents.join(",") === b.parents.join(",");

let compteur = 0;
export const nouvelId = () => `g${Date.now().toString(36)}${(compteur++).toString(36)}`;

/**
 * Enregistre `fois` clonages d'un coup : deux steriles disparaissent par clone,
 * une bete arrive, de meme couleur et de meme sexe. Les steriles sont de
 * preference du meme sexe : c'est ce qui donne un clone identique, lignee
 * comprise (celle du premier sterile utilise si les lignees different).
 *
 * Hors du hook pour etre testable : c'est la seule regle de l'enclos ou une
 * demande peut depasser ce que l'enclos permet.
 */
export function appliquerClonage(liste: Groupe[], couleur: CouleurId, sexe: Sexe, fois = 1): Groupe[] {
  const nb = Math.max(1, Math.floor(fois));

  // Deux steriles par clone : on plafonne d'abord le nombre de clones sur
  // ce que l'enclos permet, sinon la derniere paire incomplete serait
  // consommee pour rien.
  const dispo = liste
    .filter((g) => g.couleur === couleur && !g.fertile)
    .reduce((n, g) => n + g.quantite, 0);
  const obtenus = Math.min(nb, Math.floor(dispo / 2));
  if (obtenus <= 0) return liste;

  let restant = 2 * obtenus;
  let lignee: CouleurId[] | undefined;
  // Deux passes : d'abord le sexe du clone, puis les autres au besoin.
  const retirer = (accepte: (g: Groupe) => boolean, l: Groupe[]) =>
    l.map((g) => {
      if (restant <= 0 || g.couleur !== couleur || g.fertile || !accepte(g)) return g;
      const pris = Math.min(restant, g.quantite);
      restant -= pris;
      lignee ??= g.parents;
      return { ...g, quantite: g.quantite - pris };
    });
  let suivant = retirer(() => true, retirer((g) => g.sexe === sexe, liste))
    .filter((g) => g.quantite > 0);

  const clone = {
    couleur, sexe, fertile: true, enAttente: true, niveau: 1, parents: lignee ?? [],
    quantite: obtenus,
  };
  const jumeau = suivant.find((g) => memeGroupe(clone, g));
  suivant = jumeau
    ? suivant.map((g) => (g.id === jumeau.id ? { ...g, quantite: g.quantite + obtenus } : g))
    : [...suivant, { ...clone, id: nouvelId() }];
  return suivant;
}
