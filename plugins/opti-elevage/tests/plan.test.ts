import { describe, expect, it } from "vitest";
import { analyser } from "../src/engine";
import { config, groupe } from "./aide";

describe("plan par vagues", () => {
  const cfg = config();
  // Sable cannelle (AR) a fabriquer : il y a de l'Sable et de la Cannelle fecondes.
  const enclos = [
    groupe("A", { sexe: 0, quantite: 3 }),
    groupe("A", { sexe: 1, quantite: 3 }),
    groupe("R", { sexe: 0, quantite: 3 }),
    groupe("R", { sexe: 1, quantite: 3 }),
  ];
  const a = analyser(enclos, ["AR"], cfg, { nBase: 50, nCand: 30, nPlan: 100 });

  it("la vague 1 n'utilise que des couleurs deja feconde dans l'enclos", () => {
    const vague1 = a.plan!.vagues[0];
    expect(vague1.vague).toBe(1);
    for (const e of vague1.etapes) {
      expect(e.type).toBe("accouplement");
      expect(["A", "R"]).toContain(e.a);
      expect(["A", "R"]).toContain(e.b);
    }
  });

  it("le goal compte les parents : au moins une Sable et une Cannelle pour une Sable cannelle", () => {
    const besoins = Object.fromEntries(a.plan!.besoins.map((b) => [b.couleur, b.moyenne]));
    expect(besoins.A).toBeGreaterThanOrEqual(1);
    expect(besoins.R).toBeGreaterThanOrEqual(1);
  });
});

describe("fertile, feconde, sterile", () => {
  const cfg = config();

  it("une fertile pas encore feconde n'est pas accouplable maintenant, mais compte pour la vague suivante", () => {
    const enclos = [
      groupe("A", { sexe: 0, quantite: 2 }),
      groupe("A", { sexe: 1, quantite: 2 }),
      groupe("R", { sexe: 0, quantite: 2, enAttente: true }),
      groupe("R", { sexe: 1, quantite: 2, enAttente: true }),
    ];
    const a = analyser(enclos, ["AR"], cfg, { nBase: 30, nCand: 20, nPlan: 60 });
    expect(a.candidats).toEqual([]);
    // Rien de feconde a accoupler : la premiere vague est la deuxieme.
    expect(a.plan!.vagues[0].vague).toBe(2);
    expect(a.plan!.vagues.some((v) => v.vague >= 2
      && v.etapes.some((e) => e.a === "A" && e.b === "R" || e.a === "R" && e.b === "A"))).toBe(true);
  });
});
