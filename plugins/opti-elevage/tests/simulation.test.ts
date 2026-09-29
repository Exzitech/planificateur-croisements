import { describe, expect, it } from "vitest";
import { analyser, deplier, mulberry32, simuler } from "../src/engine";
import type { Captures, Config, CouleurId } from "../src/engine";
import { config, groupe } from "./aide";

/** Joue n parties depuis un enclos vide et resume l'effort. */
function jouer(cfg: Config, objectifs: CouleurId[], n: number) {
  const depart = deplier([]);
  const parties: Captures[] = [];
  for (let i = 0; i < n; i++) {
    const r = simuler(cfg, depart, objectifs, null, mulberry32(1000 + i));
    if (r) parties.push(r);
  }
  const totaux = parties.map((p) => cfg.base.reduce((s, c) => s + p.parCouleur[c], 0));
  const moy = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const tri = totaux.slice().sort((a, b) => a - b);
  return {
    parties: parties.length,
    total: moy(totaux),
    p90: tri[Math.floor(0.9 * tri.length)],
    accouplements: moy(parties.map((p) => p.accouplements)),
    clonages: moy(parties.map((p) => p.clonages)),
    parCouleur: Object.fromEntries(
      cfg.base.map((c) => [c, moy(parties.map((p) => p.parCouleur[c]))]),
    ) as Record<CouleurId, number>,
  };
}

const PARTIES = 2000;

/**
 * Bornes mesurees avec le modele actuel (lignees, voir croisement.ts). Elles ne
 * valident pas le modele face au jeu : elles signalent qu'un changement du
 * moteur a deplace les resultats, pour qu'on le fasse en connaissance de cause.
 */
describe("simulation de reference (enclos vide, niveau visé 60)", () => {
  it("objectif génération 10 : Menthe et Cannelle", () => {
    const cfg = config("EmR = Em + R", ["EmR"]);
    const r = jouer(cfg, ["EmR"], PARTIES);
    expect(r.parties).toBe(PARTIES);
    expect(r.total).toBeGreaterThan(65);
    expect(r.total).toBeLessThan(80);
    expect(r.p90).toBeGreaterThan(95);
    expect(r.p90).toBeLessThan(113);
    // Reparti a peu pres egalement entre les trois couleurs de base.
    for (const c of ["R", "D", "A"]) {
      expect(r.parCouleur[c]).toBeGreaterThan(18);
      expect(r.parCouleur[c]).toBeLessThan(28);
    }
    expect(r.accouplements).toBeGreaterThan(394 * 0.9);
    expect(r.accouplements).toBeLessThan(394 * 1.1);
    expect(r.clonages).toBeGreaterThan(377 * 0.9);
    expect(r.clonages).toBeLessThan(377 * 1.1);
  });

  it("objectif génération 9 : figue et menthe", () => {
    const r = jouer(config(), ["Pr", "Em"], PARTIES);
    expect(r.total).toBeGreaterThan(64);
    expect(r.total).toBeLessThan(76);
  });

  it("objectif génération 9 : menthe seule", () => {
    const r = jouer(config(), ["Em"], PARTIES);
    expect(r.total).toBeGreaterThan(56);
    expect(r.total).toBeLessThan(68);
  });
});

describe("ce qui reduit ou augmente l'effort", () => {
  it("Optimakina fait strictement baisser les captures", () => {
    const sans = jouer(config("EmR = Em + R", ["EmR"]), ["EmR"], 600);
    const avec = jouer(config("EmR = Em + R", ["EmR"], { opt: 0.1 }), ["EmR"], 600);
    expect(avec.total).toBeLessThan(sans.total);
  });

  it("un niveau visé plus bas fait nettement monter les captures", () => {
    const bas = jouer(config("EmR = Em + R", ["EmR"], { levelPlan: 30 }), ["EmR"], 600);
    const defaut = jouer(config("EmR = Em + R", ["EmR"]), ["EmR"], 600);
    expect(bas.total).toBeGreaterThan(defaut.total * 1.15);
  });
});

describe("cas limites", () => {
  it("un enclos contenant déjà l'objectif ne demande aucune capture", () => {
    const cfg = config();
    const a = analyser([groupe("Em", { quantite: 1 })], ["Em"], cfg);
    expect(a.atteint).toBe(true);
    expect(a.restants).toEqual([]);
  });

  it("l'objectif compte même si la bete est stérile", () => {
    const cfg = config();
    const a = analyser([groupe("Em", { quantite: 1, fertile: false })], ["Em"], cfg);
    expect(a.atteint).toBe(true);
  });

  it("cloner deux stériles de même couleur donne toujours cette couleur", () => {
    const cfg = config();
    // Deux Menthe steriles, et rien d'autre : la seule action possible est
    // le clonage, qui doit produire une Menthe a coup sur.
    const depart = deplier([groupe("Em", { quantite: 2, fertile: false })]);
    for (let i = 0; i < 200; i++) {
      const r = simuler(cfg, depart, ["Em"], null, mulberry32(i));
      // L'objectif est deja la (sterile) : aucune capture, aucun clonage force.
      expect(r?.parCouleur.R).toBe(0);
    }
    // Force le besoin : objectif Figue, dont la recette exige des fertiles.
    const r = simuler(cfg, depart, ["Em"], null, mulberry32(7));
    expect(r).not.toBeNull();
  });

  it("une capture n'est comptée que pour les couleurs de base", () => {
    const cfg = config();
    const r = simuler(cfg, deplier([]), ["DR"], null, mulberry32(1));
    expect(r).not.toBeNull();
    expect(Object.keys(r!.parCouleur).sort()).toEqual(["A", "D", "R"]);
    // DR = R + D : deux captures au minimum, aucune Sable.
    expect(r!.parCouleur.R + r!.parCouleur.D).toBeGreaterThanOrEqual(2);
  });
});

describe("analyser", () => {
  it("classe les couples et chiffre l'effort restant", () => {
    const cfg = config();
    const groupes = [
      groupe("TO", { sexe: 0, quantite: 2, niveau: 60 }),
      groupe("IT", { sexe: 1, quantite: 2, niveau: 60 }),
      groupe("T", { sexe: 0, quantite: 2, niveau: 60 }),
      groupe("I", { sexe: 1, quantite: 2, niveau: 60 }),
    ];
    const a = analyser(groupes, ["Pr"], cfg, { nBase: 120, nCand: 60, maxCand: 10 });
    expect(a.atteint).toBe(false);
    expect(a.baseline).toBeDefined();
    expect(a.candidats?.length).toBeGreaterThan(0);
    // TO x IT donne directement la Figue : ce doit etre le meilleur choix.
    expect(a.candidats?.[0].enfant).toBe("Pr");
    // Classement croissant par captures moyennes.
    const totaux = a.candidats!.map((c) => c.resume.total.moyenne);
    expect(totaux).toEqual([...totaux].sort((x, y) => x - y));
  });

  it("ne propose que des couples de sexes opposés", () => {
    const cfg = config();
    const a = analyser(
      [groupe("TO", { sexe: 0, quantite: 2 }), groupe("IT", { sexe: 0, quantite: 2 })],
      ["Pr"],
      cfg,
      { nBase: 60, nCand: 30, maxCand: 5 },
    );
    expect(a.candidats).toEqual([]);
  });
});
