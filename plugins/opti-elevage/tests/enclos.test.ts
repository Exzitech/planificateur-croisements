import { describe, expect, it } from "vitest";
import { deplier } from "../src/engine";
import type { Groupe } from "../src/engine";
import { appliquerClonage } from "../src/store/groupes";
import { groupe } from "./aide";

/**
 * Reproduit ce que fait le store quand on precise le niveau d'une bete d'un
 * groupe : la detacher sans toucher aux autres. Savoir qu'une cannelle est
 * niveau 120 ne dit rien des vingt-neuf autres.
 */
function preciserNiveau(liste: Groupe[], id: string, niveau: number): Groupe[] {
  const g = liste.find((x) => x.id === id);
  if (!g || g.niveau === niveau) return liste;
  if (g.quantite === 1) return liste.map((x) => (x.id === id ? { ...x, niveau } : x));
  const reste = liste.map((x) => (x.id === id ? { ...x, quantite: x.quantite - 1 } : x));
  return [...reste, { ...g, niveau, quantite: 1, id: `${id}-detachee` }];
}

describe("préciser le niveau d'une perruche", () => {
  it("détache une seule bete d'un groupe de trente", () => {
    const liste = [groupe("R", { quantite: 30 })];
    const apres = preciserNiveau(liste, liste[0].id, 120);
    expect(apres).toHaveLength(2);
    expect(apres[0].quantite).toBe(29);
    expect(apres[0].niveau).toBe(1);
    expect(apres[1].quantite).toBe(1);
    expect(apres[1].niveau).toBe(120);
    // Le total ne bouge pas : on precise, on n'ajoute rien.
    expect(apres.reduce((s, g) => s + g.quantite, 0)).toBe(30);
  });

  it("modifie sur place un groupe d'une seule bete", () => {
    const liste = [groupe("R", { quantite: 1 })];
    const apres = preciserNiveau(liste, liste[0].id, 80);
    expect(apres).toHaveLength(1);
    expect(apres[0].niveau).toBe(80);
  });

  it("ne fait rien si le niveau est déjà celui-là", () => {
    const liste = [groupe("R", { quantite: 5, niveau: 60 })];
    expect(preciserNiveau(liste, liste[0].id, 60)).toBe(liste);
  });

  it("le dépliage rend bien autant de betes que la quantité", () => {
    const { pool } = deplier([
      groupe("R", { quantite: 29 }),
      groupe("R", { quantite: 1, niveau: 120, sexe: 1 }),
    ]);
    expect(pool.R).toHaveLength(30);
    expect(pool.R.filter((d) => d.niveau === 120)).toHaveLength(1);
  });
});

describe("saisie rapide", () => {
  it("ajoute des groupes sans lignée, un par couleur et par état", () => {
    // Ce que produit la grille pour « 28 cannelle mâles fertiles, 2 femelles stériles ».
    const saisis = [
      { couleur: "R", sexe: 0 as const, fertile: true, niveau: 1, parents: [], quantite: 28 },
      { couleur: "R", sexe: 1 as const, fertile: false, niveau: 1, parents: [], quantite: 2 },
    ];
    const { pool, ster } = deplier(saisis.map((s, i) => ({ ...s, id: `g${i}` })));
    expect(pool.R).toHaveLength(28);
    expect(ster.R).toHaveLength(2);
    expect(pool.R.every((d) => d.parents.length === 0)).toBe(true);
  });
});

describe("cloner par lot", () => {
  const steriles = (n: number, sexe: 0 | 1 = 0) =>
    groupe("R", { sexe, fertile: false, enAttente: false, quantite: n });
  const compter = (liste: Groupe[], accepte: (g: Groupe) => boolean) =>
    liste.filter(accepte).reduce((s, g) => s + g.quantite, 0);

  it("consomme deux stériles par clone demandé", () => {
    const apres = appliquerClonage([steriles(6)], "R", 0, 3);
    expect(compter(apres, (g) => !g.fertile)).toBe(0);
    expect(compter(apres, (g) => g.fertile)).toBe(3);
  });

  it("laisse le stérile orphelin quand le compte est impair", () => {
    // 3 steriles : un seul clone possible, le troisieme ne doit pas disparaitre.
    const apres = appliquerClonage([steriles(3)], "R", 0, 2);
    expect(compter(apres, (g) => !g.fertile)).toBe(1);
    expect(compter(apres, (g) => g.fertile)).toBe(1);
  });

  it("plafonne la demande sur ce que l'enclos permet", () => {
    const apres = appliquerClonage([steriles(4)], "R", 0, 99);
    expect(compter(apres, (g) => g.fertile)).toBe(2);
  });

  it("ne touche à rien s'il n'y a pas de paire", () => {
    const liste = [steriles(1)];
    expect(appliquerClonage(liste, "R", 0, 5)).toBe(liste);
  });

  it("prend d'abord les stériles du sexe demandé", () => {
    const apres = appliquerClonage([steriles(2, 1), steriles(4, 0)], "R", 0, 2);
    // Les quatre males y passent, les deux femelles restent intactes.
    expect(compter(apres, (g) => !g.fertile && g.sexe === 1)).toBe(2);
    expect(compter(apres, (g) => !g.fertile && g.sexe === 0)).toBe(0);
    expect(compter(apres, (g) => g.fertile && g.sexe === 0)).toBe(2);
  });
});
