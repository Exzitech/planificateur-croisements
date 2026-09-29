import { describe, expect, it } from "vitest";
import { analyserRecettes } from "../src/engine";
import { perruches } from "./aide";

const { catalogue, couleurs, recettesDefaut, recettesBicolores, resoudreObjectif } = perruches;
const { byPair } = analyserRecettes(couleurs, recettesDefaut);

describe("resoudreObjectif", () => {
  it("reprend la couleur existante d'une paire deja produite", () => {
    expect(resoudreObjectif({ type: "gen10", base: "O", partenaire: "Eb" }, byPair)).toEqual(["EO"]);
  });

  it("donne le meme id quel que soit l'ordre choisi", () => {
    const a = resoudreObjectif({ type: "gen10", base: "D", partenaire: "Eb" }, byPair);
    const b = resoudreObjectif({ type: "gen10", base: "Eb", partenaire: "D" }, byPair);
    expect(a).toEqual(["EbD"]);
    expect(b).toEqual(a);
  });
});

describe("catalogue", () => {
  it("propose Ardoise et Citron en generation 4, declarable comme recette", () => {
    const e = catalogue.find((c) => c.id === "EbD");
    expect(e).toMatchObject({ nom: "Ardoise et Citron", gen: 4 });
    const { lignes, ids } = recettesBicolores(["EbD", "R"]);
    expect(analyserRecettes(couleurs, `${recettesDefaut}\n${lignes}`, ids).erreurs).toEqual([]);
  });

  it("compte les couleurs par generation comme dans le jeu", () => {
    const n = (g: number) => catalogue.filter((c) => c.gen === g).length;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n)).toEqual([3, 3, 2, 7, 2, 11, 2, 15, 2, 19]);
  });
});
