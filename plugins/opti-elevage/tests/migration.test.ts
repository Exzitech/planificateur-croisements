import { describe, expect, it } from "vitest";
import { migrerVersPerruches } from "../src/store/migration";
import type { Stockage } from "../src/storage/storage";

/** Stockage en memoire, pour tester la migration sans navigateur. */
function stockageMemoire(initial: Record<string, unknown> = {}): Stockage {
  const donnees = new Map(Object.entries(initial));
  return {
    lire: <T>(cle: string, defaut: T): T => (donnees.has(cle) ? (donnees.get(cle) as T) : defaut),
    ecrire: (cle, valeur) => donnees.set(cle, valeur),
  };
}

describe("migrerVersPerruches", () => {
  it("copie l'ancien enclos (sans suffixe) vers enclos:perruches", () => {
    const groupes = [{ id: "g1", couleur: "R", sexe: 0, fertile: true, parents: [], niveau: 60, quantite: 12 }];
    const stockage = stockageMemoire({ enclos: groupes });
    migrerVersPerruches(stockage);
    expect(stockage.lire("enclos:perruches", null)).toEqual(groupes);
    // L'ancienne cle reste intacte : rien n'est jamais supprime.
    expect(stockage.lire("enclos", null)).toEqual(groupes);
  });

  it("migre les quatre cles (enclos, objectif, parametres, recettes)", () => {
    const stockage = stockageMemoire({
      enclos: [{ id: "g1" }],
      objectif: { type: "gen9", couleurs: ["Em"] },
      parametres: { p0: 0.3 },
      recettes: "DR = R + D",
    });
    migrerVersPerruches(stockage);
    expect(stockage.lire("enclos:perruches", null)).toEqual([{ id: "g1" }]);
    expect(stockage.lire("objectif:perruches", null)).toEqual({ type: "gen9", couleurs: ["Em"] });
    expect(stockage.lire("parametres:perruches", null)).toEqual({ p0: 0.3 });
    expect(stockage.lire("recettes:perruches", null)).toBe("DR = R + D");
  });

  it("n'ecrase pas des donnees deja presentes sous la nouvelle cle", () => {
    const stockage = stockageMemoire({
      enclos: [{ id: "ancien" }],
      "enclos:perruches": [{ id: "deja-migre" }],
    });
    migrerVersPerruches(stockage);
    expect(stockage.lire("enclos:perruches", null)).toEqual([{ id: "deja-migre" }]);
  });

  it("ne fait rien si l'ancienne cle n'existe pas", () => {
    const stockage = stockageMemoire({});
    migrerVersPerruches(stockage);
    expect(stockage.lire("enclos:perruches", "absent")).toBe("absent");
  });
});
