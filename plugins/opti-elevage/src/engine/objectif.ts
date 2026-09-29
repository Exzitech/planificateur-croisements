import { nomCouleur } from "./couleurs";
import { analyserRecettes, clePaire, idsDefinis } from "./recettes";
import type { Couleur, CouleurId } from "./types";

/**
 * Ce que l'utilisateur cherche a obtenir.
 *
 * "gen9" : une ou plusieurs couleurs simples (celles qui ont un nom propre).
 * "gen10" : une bicolore, croisement de deux couleurs simples. Le jeu la nomme
 * « X et Y ». Les noms de type restent ceux d'origine (Perruches, dont
 * l'objectif de generation 10 a ete le premier ecrit) : ils sont enregistres.
 */
export type Objectif =
  | { type: "gen9"; couleurs: CouleurId[] }
  | { type: "gen10"; base: CouleurId; partenaire: CouleurId };

/** Une couleur proposable : les couleurs nommees et les bicolores « X et Y » en plus. */
export interface EntreeCatalogue {
  id: CouleurId;
  nom: string;
  gen: number;
  /** Recette a declarer ; absente pour les couleurs deja nommees. */
  parents?: [CouleurId, CouleurId];
}

/** Id d'une bicolore : concatenation des deux ids, ex. Em + R -> « EmR ». */
export const idBicolore = (base: CouleurId, partenaire: CouleurId): CouleurId =>
  `${base}${partenaire}`;

/**
 * Construit, pour une espece donnee, le catalogue de ses couleurs (nommees +
 * bicolores libres) et les aides qui en dependent. Calcule une seule fois par
 * espece, a partir de ses donnees brutes.
 */
export function construireCatalogue(espece: {
  couleurs: readonly Couleur[];
  couleursSimples: readonly CouleurId[];
  recettesDefaut: string;
}) {
  const { couleurs, couleursSimples, recettesDefaut } = espece;
  const RANG = new Map(couleursSimples.map((c, i) => [c, i]));

  // Le vocabulaire propre a l'espece (bicolores intermediaires des recettes,
  // sans nom ni couleur dedies) : declare une fois pour toutes, independamment
  // de ce que l'utilisateur tape ensuite dans l'editeur de recettes.
  const idsCouleurs = new Set(couleurs.map((c) => c.id));
  const idsRecette = idsDefinis(recettesDefaut).filter((id) => !idsCouleurs.has(id));

  const DEFAUT = analyserRecettes(couleurs, recettesDefaut, idsRecette);

  const CATALOGUE: EntreeCatalogue[] = couleurs.map((c) => ({ id: c.id, nom: c.nom, gen: DEFAUT.gen[c.id] }));
  for (let i = 0; i < couleursSimples.length; i++) {
    for (let j = i + 1; j < couleursSimples.length; j++) {
      const [a, b] = [couleursSimples[i], couleursSimples[j]];
      if (DEFAUT.byPair[clePaire(a, b)]) continue;
      const [base, partenaire] = (RANG.get(a) ?? 0) >= (RANG.get(b) ?? 0) ? [a, b] : [b, a];
      CATALOGUE.push({
        id: idBicolore(base, partenaire),
        nom: `${nomCouleur(couleurs, base)} et ${nomCouleur(couleurs, partenaire)}`,
        gen: Math.max(DEFAUT.gen[a], DEFAUT.gen[b]) + 1,
        parents: [base, partenaire],
      });
    }
  }
  CATALOGUE.sort((x, y) => x.gen - y.gen);

  const BICOLORES = new Map(CATALOGUE.filter((e) => e.parents).map((e) => [e.id, e]));

  /**
   * Les lignes de recette a ajouter pour que les bicolores utilisees (dans
   * l'enclos ou l'objectif) soient connues du moteur.
   */
  function recettesBicolores(utilisees: Iterable<CouleurId>): { lignes: string; ids: CouleurId[] } {
    const ids = [...new Set(utilisees)].filter((id) => BICOLORES.has(id));
    const lignes = ids.map((id) => `${id} = ${BICOLORES.get(id)!.parents!.join(" + ")}`).join("\n");
    return { lignes, ids };
  }

  /**
   * Les couleurs a obtenir pour un objectif. Une bicolore dont la paire existe
   * deja dans les recettes reprend cette couleur.
   */
  function resoudreObjectif(objectif: Objectif, byPair: Record<string, CouleurId> = {}): CouleurId[] {
    if (objectif.type === "gen9") return objectif.couleurs;
    const existante = byPair[clePaire(objectif.base, objectif.partenaire)];
    if (existante) return [existante];
    const [base, partenaire] =
      (RANG.get(objectif.base) ?? 0) >= (RANG.get(objectif.partenaire) ?? 0)
        ? [objectif.base, objectif.partenaire]
        : [objectif.partenaire, objectif.base];
    return [idBicolore(base, partenaire)];
  }

  /** Libelle d'un objectif, pour l'affichage. */
  function libelleObjectif(objectif: Objectif): string {
    if (objectif.type === "gen9") {
      return objectif.couleurs.map((c) => nomCouleur(couleurs, c)).join(" et ") || "aucun";
    }
    return `${nomCouleur(couleurs, objectif.base)} et ${nomCouleur(couleurs, objectif.partenaire)}`;
  }

  return { catalogue: CATALOGUE, idsRecette, recettesBicolores, resoudreObjectif, libelleObjectif };
}
