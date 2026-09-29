import { describe, expect, it } from "vitest";
import { ESPECES, analyserRecettes, especeParId } from "../src/engine";

describe("especes", () => {
  it("propose Perruches, Canaris et Pinsons", () => {
    expect(ESPECES.map((e) => e.id)).toEqual(["perruches", "canaris", "pinsons"]);
  });

  for (const espece of ESPECES) {
    it(`${espece.nom} : recettes par defaut sans erreur, base = capturables`, () => {
      const r = analyserRecettes(espece.couleurs, espece.recettesDefaut, [...espece.idsRecette]);
      expect(r.erreurs).toEqual([]);
      expect(r.base.sort()).toEqual([...espece.capturables].sort());
    });
  }

  // Generations enoncees par l'utilisateur, deduites des tableaux du jeu : la
  // regle bicolore (croiser deux monocolores donne « A et B », generation
  // max + 1) est verifiee ailleurs (catalogue) ; ici on verifie que les
  // recettes de generation 3+ choisies reproduisent les generations attendues.
  it("Canaris : generations des monocolores", () => {
    const { gen } = analyserRecettes(especeParId("canaris").couleurs, especeParId("canaris").recettesDefaut, [...especeParId("canaris").idsRecette]);
    expect({
      Eb: gen.Eb, In: gen.In, Po: gen.Po, Or: gen.Or, Do: gen.Do,
      Ro: gen.Ro, Am: gen.Am,
      Iv: gen.Iv, Tu: gen.Tu,
      Pr: gen.Pr, Em: gen.Em,
      Ab: gen.Ab, Co: gen.Co, Az: gen.Az, Ag: gen.Ag,
    }).toEqual({
      Eb: 1, In: 1, Po: 1, Or: 1, Do: 1,
      Ro: 3, Am: 3,
      Iv: 5, Tu: 5,
      Pr: 7, Em: 7,
      Ab: 9, Co: 9, Az: 9, Ag: 9,
    });
  });

  it("Pinsons : generations des monocolores", () => {
    const { gen } = analyserRecettes(especeParId("pinsons").couleurs, especeParId("pinsons").recettesDefaut, [...especeParId("pinsons").idsRecette]);
    expect({
      Eb: gen.Eb, In: gen.In, Po: gen.Po, Or: gen.Or,
      Ro: gen.Ro, Am: gen.Am, Iv: gen.Iv, Tu: gen.Tu,
      Pr: gen.Pr, Em: gen.Em,
      Do: gen.Do,
      Ja: gen.Ja, Ru: gen.Ru, Sa: gen.Sa, Ay: gen.Ay,
    }).toEqual({
      Eb: 1, In: 1, Po: 1, Or: 1,
      Ro: 3, Am: 3, Iv: 3, Tu: 3,
      Pr: 5, Em: 5,
      Do: 7,
      Ja: 9, Ru: 9, Sa: 9, Ay: 9,
    });
  });

  it("une bicolore libre suit la regle max(gen) + 1, pour chaque espece", () => {
    for (const espece of ESPECES) {
      // Deux monocolores non deja lies par une recette : Canaris Ambre + Cannelle (9, 3) -> 10.
      const cible = espece.catalogue.find((c) => c.parents);
      expect(cible).toBeTruthy();
      if (!cible?.parents) continue;
      const { gen } = analyserRecettes(espece.couleurs, espece.recettesDefaut, [...espece.idsRecette]);
      const [a, b] = cible.parents;
      expect(cible.gen).toBe(Math.max(gen[a], gen[b]) + 1);
    }
  });
});
