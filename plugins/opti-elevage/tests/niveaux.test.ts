import { describe, expect, it } from "vitest";
import { croisement } from "../src/engine";
import { config, bete, pourcent } from "./aide";

/**
 * Le niveau se saisit au moment de l'accouplement. Tant qu'il ne l'est pas,
 * tout compte au niveau vise (60 par defaut) : c'est ce que voit le joueur
 * avant d'avoir regarde ses betes dans le jeu.
 */
describe("niveau renseigné au moment de l'accouplement", () => {
  const paire = (nx: number, ny: number, levelPlan = 60) =>
    croisement(
      bete("TO", { sexe: 0, niveau: nx }),
      bete("IT", { sexe: 1, niveau: ny }),
      config("", [], { levelPlan }),
    );

  it("sans rien préciser, tout compte comme du niveau 60", () => {
    // 30 % + 0,15 % x 120 = 48 %
    expect(pourcent(paire(1, 1).list, "Pr")).toBeCloseTo(48, 1);
  });

  it("un niveau saisi au-dessus du niveau visé est pris en compte", () => {
    // 30 % + 0,15 % x (200 + 60) = 69 %
    expect(paire(200, 1).P * 100).toBeCloseTo(69, 1);
    // Les deux a 200 : 30 % + 0,15 % x 400 = 90 %
    expect(paire(200, 200).P * 100).toBeCloseTo(90, 1);
  });

  it("un niveau saisi en dessous du niveau visé ne baisse rien", () => {
    // La bete sera montee avant usage : elle ne compte jamais moins que 60.
    expect(paire(10, 10).P).toBeCloseTo(paire(60, 60).P, 10);
  });

  it("préciser un seul des deux niveaux suffit", () => {
    expect(paire(120, 1).P * 100).toBeCloseTo(30 + 0.15 * (120 + 60), 1);
  });

  it("le niveau visé des réglages déplace le plancher", () => {
    expect(paire(1, 1, 30).P * 100).toBeCloseTo(30 + 0.15 * 60, 1);
  });
});
