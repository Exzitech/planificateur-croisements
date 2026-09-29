import { PARAMETRES_DEFAUT, analyserRecettes, especeParId } from "../src/engine";
import type { Config, CouleurId, Parametres, Bete, Groupe, Sexe } from "../src/engine";

/** Les tests de simulation/croisement portent sur les Perruches, l'espece calibree en jeu. */
export const perruches = especeParId("perruches");

/** Config de test : recettes par defaut + recettes et reglages supplementaires. */
export function config(
  lignesEnPlus = "",
  idsEnPlus: CouleurId[] = [],
  reglages: Partial<Parametres> = {},
): Config {
  const texte = lignesEnPlus ? `${perruches.recettesDefaut}\n${lignesEnPlus}` : perruches.recettesDefaut;
  return { ...analyserRecettes(perruches.couleurs, texte, idsEnPlus), ...PARAMETRES_DEFAUT, ...reglages };
}

export function bete(
  couleur: CouleurId,
  options: { sexe?: Sexe; niveau?: number; parents?: CouleurId[] } = {},
): Bete {
  return {
    couleur,
    sexe: options.sexe ?? 0,
    parents: options.parents ?? [],
    niveau: options.niveau ?? 1,
    origine: "test",
  };
}

export function groupe(
  couleur: CouleurId,
  options: Partial<Omit<Groupe, "couleur">> = {},
): Groupe {
  return {
    id: `${couleur}-${options.sexe ?? 0}-${options.niveau ?? 1}`,
    couleur,
    sexe: options.sexe ?? 0,
    fertile: options.fertile ?? true,
    parents: options.parents ?? [],
    niveau: options.niveau ?? 1,
    quantite: options.quantite ?? 1,
    ...options,
  };
}

/** Probabilite d'une couleur dans un croisement, en %. */
export function pourcent(list: { couleur: CouleurId; p: number }[], couleur: CouleurId): number {
  return (list.find((o) => o.couleur === couleur)?.p ?? 0) * 100;
}
