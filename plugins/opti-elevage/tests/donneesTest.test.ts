import { describe, expect, it } from "vitest";
import { ESPECES } from "../src/engine";
import { genererDonneesTest } from "../src/store/donneesTest";

/**
 * Le critere de la migration de l'enclos (store/enclos.ts) : un groupe fertile
 * dont enAttente n'est pas renseigne vient d'avant la distinction feconde /
 * fertile, donc il passe « en attente » au chargement.
 */
const migreEnAttente = (g: { fertile: boolean; enAttente?: boolean }): boolean =>
  g.fertile && g.enAttente === undefined;

describe("genererDonneesTest", () => {
  it("renseigne enAttente sur les fertiles, sinon la migration les repasse en attente", () => {
    for (const espece of ESPECES) {
      const groupes = genererDonneesTest(espece);
      expect(groupes.filter(migreEnAttente)).toEqual([]);
    }
  });

  it("donne des fecondes et des fertiles en attente pour chaque couleur capturable", () => {
    const espece = ESPECES[0];
    const groupes = genererDonneesTest(espece);
    for (const couleur of espece.capturables) {
      const pourCouleur = groupes.filter((g) => g.couleur === couleur);
      expect(pourCouleur.some((g) => g.fertile && g.enAttente === false)).toBe(true);
      expect(pourCouleur.some((g) => g.fertile && g.enAttente === true)).toBe(true);
    }
  });
});
