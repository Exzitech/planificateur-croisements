import type { Couleur, CouleurId, Recettes } from "./types";

const LIGNE = /^(\w+)\s*=\s*(\w+)\s*\+\s*(\w+)$/;

/**
 * Analyse le texte des recettes (« enfant = a + b », une par ligne), pour les
 * couleurs d'une espece donnee.
 *
 * `idsSupplementaires` autorise des couleurs absentes de `couleurs` : c'est
 * ainsi qu'on declare une bicolore de generation 10, par exemple
 * « EmR = Em + R ». Sa generation se deduit de sa profondeur.
 *
 * Ne leve jamais : les erreurs sont rendues pour etre affichees sous l'editeur,
 * et ce qui a pu etre lu reste exploitable.
 */
export function analyserRecettes(
  couleurs: readonly Couleur[],
  texte: string,
  idsSupplementaires: CouleurId[] = [],
): Recettes {
  const ids = new Set<CouleurId>([...couleurs.map((c) => c.id), ...idsSupplementaires]);
  const rec: Record<CouleurId, [CouleurId, CouleurId]> = {};
  const erreurs: string[] = [];

  texte.split(/\r?\n/).forEach((brut, i) => {
    const ligne = brut.trim();
    if (!ligne) return;
    const m = LIGNE.exec(ligne);
    if (!m) {
      erreurs.push(`Ligne ${i + 1} illisible : ${ligne}`);
      return;
    }
    const [, enfant, a, b] = m;
    for (const x of [enfant, a, b]) {
      if (!ids.has(x)) erreurs.push(`Ligne ${i + 1} : couleur inconnue « ${x} »`);
    }
    if (a === b) erreurs.push(`Ligne ${i + 1} : les deux parents doivent être différents`);
    if (rec[enfant]) erreurs.push(`Ligne ${i + 1} : ${enfant} défini deux fois`);
    rec[enfant] = [a, b];
  });

  // Profondeur : 0 pour une couleur de base, sinon 1 + la plus profonde des
  // deux parentes. Une recette circulaire est signalee et compte pour 0.
  const depth: Record<CouleurId, number> = {};
  const enCours = new Set<CouleurId>();
  const profondeur = (c: CouleurId): number => {
    const connue = depth[c];
    if (connue != null) return connue;
    if (enCours.has(c)) {
      erreurs.push(`Boucle dans les recettes autour de ${c}`);
      return 0;
    }
    enCours.add(c);
    const parents = rec[c];
    const v = parents ? 1 + Math.max(profondeur(parents[0]), profondeur(parents[1])) : 0;
    enCours.delete(c);
    depth[c] = v;
    return v;
  };
  ids.forEach(profondeur);

  const byPair: Record<string, CouleurId> = {};
  for (const enfant of Object.keys(rec)) byPair[clePaire(rec[enfant][0], rec[enfant][1])] = enfant;

  const base = [...ids].filter((c) => !rec[c]);
  const gen: Record<CouleurId, number> = {};
  ids.forEach((c) => {
    gen[c] = depth[c] + 1;
  });

  return { rec, byPair, base, depth, gen, erreurs };
}

/** Cle d'une paire de parents, independante de l'ordre. */
export const clePaire = (a: CouleurId, b: CouleurId): string => [a, b].sort().join("+");

/**
 * Les ids definis (cote gauche du signe =) dans un texte de recettes, sans
 * validation : sert a enregistrer automatiquement le vocabulaire propre a une
 * espece (ses bicolores intermediaires, sans nom ni couleur dedies) aupres
 * de `analyserRecettes`.
 */
export function idsDefinis(texte: string): CouleurId[] {
  const ids: CouleurId[] = [];
  for (const brut of texte.split(/\r?\n/)) {
    const m = LIGNE.exec(brut.trim());
    if (m) ids.push(m[1]);
  }
  return ids;
}
