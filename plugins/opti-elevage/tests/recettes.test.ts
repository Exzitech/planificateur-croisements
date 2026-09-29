import { describe, expect, it } from "vitest";
import { analyserRecettes } from "../src/engine";
import { perruches } from "./aide";

const { couleurs, recettesDefaut } = perruches;

describe("analyserRecettes", () => {
  it("lit les recettes par defaut sans erreur", () => {
    const r = analyserRecettes(couleurs, recettesDefaut);
    expect(r.erreurs).toEqual([]);
    expect(r.base.sort()).toEqual(["A", "D", "R"]);
  });

  it("calcule les generations du jeu", () => {
    const { gen } = analyserRecettes(couleurs, recettesDefaut);
    expect(gen.R).toBe(1);
    expect(gen.P).toBe(5);
    expect(gen.EO).toBe(6);
    expect(gen.IT).toBe(8);
    expect(gen.IvP).toBe(8);
    expect(gen.Pr).toBe(9);
    expect(gen.Em).toBe(9);
  });

  it("donne la generation 10 a une bicolore ajoutee", () => {
    const r = analyserRecettes(couleurs, `${recettesDefaut}\nEmR = Em + R`, ["EmR"]);
    expect(r.erreurs).toEqual([]);
    expect(r.gen.EmR).toBe(10);
    // Une bicolore n'est pas capturable : elle a une recette.
    expect(r.base).not.toContain("EmR");
  });

  it("refuse une couleur inconnue", () => {
    const r = analyserRecettes(couleurs, "XX = R + D");
    expect(r.erreurs.join(" ")).toContain("XX");
  });

  it("refuse deux parents identiques", () => {
    const r = analyserRecettes(couleurs, "DR = R + R");
    expect(r.erreurs.join(" ")).toContain("différents");
  });

  it("refuse un enfant defini deux fois", () => {
    const r = analyserRecettes(couleurs, "DR = R + D\nDR = A + D");
    expect(r.erreurs.join(" ")).toContain("deux fois");
  });

  it("refuse une ligne illisible", () => {
    const r = analyserRecettes(couleurs, "DR := R et D");
    expect(r.erreurs.join(" ")).toContain("illisible");
  });

  it("detecte un cycle", () => {
    // Eb depend de DR qui depend de Eb : la profondeur ne converge pas.
    const r = analyserRecettes(couleurs, "DR = Eb + D\nEb = DR + AD");
    expect(r.erreurs.join(" ")).toContain("Boucle");
  });

  it("ignore les lignes vides", () => {
    const r = analyserRecettes(couleurs, "\n\nDR = R + D\n\n");
    expect(r.erreurs).toEqual([]);
    expect(r.rec.DR).toEqual(["R", "D"]);
  });
});
