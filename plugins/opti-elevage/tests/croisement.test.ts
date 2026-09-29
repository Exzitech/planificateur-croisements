import { describe, expect, it } from "vitest";
import { croisement } from "../src/engine";
import { config, bete, pourcent } from "./aide";

/**
 * Ces valeurs viennent de deux captures de l'interface d'accouplement du jeu.
 * Ce sont elles qui calibrent gpF et gpDecay : si elles cassent, c'est le modele qui
 * a bouge, pas un detail d'implementation.
 */
describe("capture du jeu : Pourpre niv.200 x Émeraude niv.1", () => {
  // EmP « Émeraude et Pourpre », generation 10, telle que le jeu l'affiche.
  const avecEmP = (opt: number) => config("EmP = Em + P", ["EmP"], { levelPlan: 1, opt });

  const pourpre = bete("P", { sexe: 1, niveau: 200 });
  const emeraude = bete("Em", { sexe: 0, niveau: 1, parents: ["IT", "IvP"] });

  it("sans Optimakina", () => {
    const { list, P } = croisement(pourpre, emeraude, avecEmP(0));
    expect(P * 100).toBeCloseTo(60.15, 1);
    expect(pourcent(list, "EmP")).toBeCloseTo(60.15, 1);
    expect(pourcent(list, "P")).toBeCloseTo(19.92, 1);
    expect(pourcent(list, "Em")).toBeCloseTo(15.73, 1);
    expect(pourcent(list, "IT")).toBeCloseTo(2.1, 1);
    expect(pourcent(list, "IvP")).toBeCloseTo(2.1, 1);
  });

  it("avec Optimakina (+10 %)", () => {
    const { list, P } = croisement(pourpre, emeraude, avecEmP(0.1));
    expect(P * 100).toBeCloseTo(70.15, 1);
    expect(pourcent(list, "EmP")).toBeCloseTo(70.15, 1);
    expect(pourcent(list, "P")).toBeCloseTo(14.92, 1);
    expect(pourcent(list, "Em")).toBeCloseTo(11.78, 1);
    expect(pourcent(list, "IT")).toBeCloseTo(1.57, 1);
    expect(pourcent(list, "IvP")).toBeCloseTo(1.57, 1);
  });

  it("la somme des probabilites vaut 1", () => {
    const { list } = croisement(pourpre, emeraude, avecEmP(0));
    expect(list.reduce((s, o) => s + o.p, 0)).toBeCloseTo(1, 10);
  });
});

describe("capture du jeu : Rousse niv.65 (de Amande + Rousse) x Dorée niv.55", () => {
  const cfg = config("", [], { levelPlan: 1 });
  const rousse = bete("R", { sexe: 0, niveau: 65, parents: ["A", "R"] });
  const doree = bete("D", { sexe: 1, niveau: 55 });
  const { list, cibles, partage } = croisement(rousse, doree, cfg);

  it("les deux couleurs cibles et les autres", () => {
    expect(pourcent(list, "DR")).toBeCloseTo(34.91, 1);
    expect(pourcent(list, "AD")).toBeCloseTo(13.09, 1);
    expect(pourcent(list, "R")).toBeCloseTo(18.91, 1);
    expect(pourcent(list, "D")).toBeCloseTo(25.99, 1);
    expect(pourcent(list, "A")).toBeCloseTo(7.1, 1);
  });

  it("la chance est partagee entre Doree rousse et Amande doree", () => {
    expect(partage).toBe(true);
    expect([...cibles].sort()).toEqual(["AD", "DR"]);
  });
});

describe("croisement", () => {
  it("TO x IT niveau 1 : Prune a 30,3 %", () => {
    const cfg = config("", [], { levelPlan: 1 });
    const { list } = croisement(bete("TO", { sexe: 0 }), bete("IT", { sexe: 1 }), cfg);
    expect(list.reduce((s, o) => s + o.p, 0)).toBeCloseTo(1, 10);
    expect(pourcent(list, "Pr")).toBeCloseTo(30.3, 1);
    expect(pourcent(list, "TO")).toBeCloseTo(34.85, 1);
    expect(pourcent(list, "IT")).toBeCloseTo(34.85, 1);
  });

  it("au niveau vise par defaut (60), la meme paire monte a 48 %", () => {
    const { list } = croisement(bete("TO", { sexe: 0 }), bete("IT", { sexe: 1 }), config());
    expect(pourcent(list, "Pr")).toBeCloseTo(48, 1);
  });

  it("sans lignee, un seul croisement : pas de chance partagee", () => {
    const r = croisement(bete("R", { sexe: 0 }), bete("D", { sexe: 1 }), config());
    expect(r.partage).toBe(false);
    expect(r.cibles).toEqual(["DR"]);
  });

  it("un couple sans recette ne donne aucun bonus", () => {
    const r = croisement(bete("R", { sexe: 0 }), bete("Em", { sexe: 1 }), config());
    expect(r.P).toBe(0);
  });

  it("la chance est plafonnee a 99 %", () => {
    const cfg = config("", [], { levelPlan: 200, opt: 0.5 });
    const r = croisement(bete("TO", { sexe: 0 }), bete("IT", { sexe: 1 }), cfg);
    expect(r.P).toBeCloseTo(0.99, 10);
  });
});
