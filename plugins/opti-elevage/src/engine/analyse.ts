import { croisement } from "./croisement";
import { mulberry32 } from "./hasard";
import { cleGroupe, deplier, simuler } from "./simulation";
import type {
  Analyse, Besoin, Candidat, Captures, Config, CouleurId, Etape, EtapePlan, Groupe, Plan, Resume,
} from "./types";

const moyenne = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);

const quantile = (a: number[], q: number) => {
  const tri = a.slice().sort((x, y) => x - y);
  return tri[Math.min(tri.length - 1, Math.floor(q * tri.length))];
};

function resumer(parties: Captures[], base: CouleurId[]): Resume {
  const parCouleur: Resume["parCouleur"] = {};
  for (const c of base) {
    const v = parties.map((r) => r.parCouleur[c]);
    parCouleur[c] = { moyenne: moyenne(v), p90: quantile(v, 0.9) };
  }
  const totaux = parties.map((r) => base.reduce((s, c) => s + r.parCouleur[c], 0));
  return {
    parCouleur,
    total: { moyenne: moyenne(totaux), p90: quantile(totaux, 0.9) },
    accouplements: moyenne(parties.map((r) => r.accouplements)),
    clonages: moyenne(parties.map((r) => r.clonages)),
    parties: parties.length,
  };
}

/**
 * Regroupe les journaux de plusieurs parties : pour chaque vague et chaque
 * operation, le nombre moyen (et prudent) sur l'ensemble des parties.
 */
function regrouper(journaux: Etape[][]): Plan["vagues"] {
  const parCle = new Map<string, { vague: number; etape: Etape; comptes: number[] }>();
  journaux.forEach((journal, i) => {
    for (const e of journal) {
      const cle = `${e.vague}|${e.type}|${e.a}|${e.b ?? ""}`;
      let ligne = parCle.get(cle);
      if (!ligne) {
        ligne = { vague: e.vague, etape: e, comptes: new Array(journaux.length).fill(0) };
        parCle.set(cle, ligne);
      }
      ligne.comptes[i]++;
    }
  });

  const vagues = new Map<number, EtapePlan[]>();
  for (const { vague, etape, comptes } of parCle.values()) {
    const m = moyenne(comptes);
    if (m < 0.05) continue;
    const liste = vagues.get(vague) ?? [];
    liste.push({ type: etape.type, a: etape.a, b: etape.b, enfant: etape.enfant, moyenne: m, p90: quantile(comptes, 0.9) });
    vagues.set(vague, liste);
  }
  return [...vagues.entries()]
    .sort((u, v) => u[0] - v[0])
    .map(([vague, etapes]) => ({
      vague: vague + 1,
      etapes: etapes.sort((u, v) => v.moyenne - u.moyenne),
    }));
}

/** Combien de parents (ou de steriles clones) de chaque couleur le plan consomme, toutes vagues confondues. */
function besoinsParents(journaux: Etape[][], type: Etape["type"] = "accouplement"): Besoin[] {
  const parCouleur = new Map<CouleurId, number[]>();
  journaux.forEach((journal, i) => {
    for (const e of journal) {
      if (e.type !== type) continue;
      for (const c of type === "accouplement" ? [e.a, e.b as CouleurId] : e.consomme ?? []) {
        let v = parCouleur.get(c);
        if (!v) parCouleur.set(c, (v = new Array(journaux.length).fill(0)));
        v[i]++;
      }
    }
  });
  return [...parCouleur.entries()].map(([couleur, v]) => ({
    couleur,
    moyenne: moyenne(v),
    p90: quantile(v, 0.9),
  }));
}

export interface OptionsAnalyse {
  /** Parties jouees depuis l'etat actuel, pour la reference. */
  nBase?: number;
  /** Parties par couple candidat. */
  nCand?: number;
  /** Couples evalues, les plus profonds dans l'arbre d'abord. */
  maxCand?: number;
  /** Parties jouees pour derouler le plan par vagues. */
  nPlan?: number;
}

/** Au-dela de cet enclos, on reduit les echantillons pour rester sous la seconde. */
const ENCLOS_LOURD = 120;

export function optionsPour(nbBetes: number): Required<OptionsAnalyse> {
  return nbBetes > ENCLOS_LOURD
    ? { nBase: 400, nCand: 150, maxCand: 30, nPlan: 200 }
    : { nBase: 700, nCand: 250, maxCand: 40, nPlan: 300 };
}

/**
 * Compare les accouplements possibles et chiffre l'effort restant.
 *
 * Chaque candidat est evalue sur LES MEMES graines que la reference (common
 * random numbers) : l'ecart mesure vient du couple force, pas du hasard. Sans
 * ca, il faudrait bien plus de parties pour distinguer deux couples proches.
 */
export function analyser(
  groupes: Groupe[],
  objectifs: CouleurId[],
  cfg: Config,
  options: OptionsAnalyse = {},
): Analyse {
  const total = groupes.reduce((s, g) => s + g.quantite, 0);
  const defauts = optionsPour(total);
  const nBase = options.nBase ?? defauts.nBase;
  const nCand = options.nCand ?? defauts.nCand;
  const maxCand = options.maxCand ?? defauts.maxCand;
  const nPlan = options.nPlan ?? defauts.nPlan;

  const depart = deplier(groupes);
  const possede = (t: CouleurId) => !!(depart.pool[t]?.length || depart.ster[t]?.length);
  const restants = objectifs.filter((t) => !possede(t));
  if (!restants.length) return { atteint: true, restants: [] };

  const parties: Captures[] = [];
  for (let i = 0; i < nBase; i++) {
    const r = simuler(cfg, depart, restants, null, mulberry32(1000 + i));
    if (r) parties.push(r);
  }
  if (!parties.length) {
    return { atteint: false, restants, erreur: "Simulation impossible : vérifie les recettes." };
  }
  const baseline = resumer(parties, cfg.base);

  // Candidats : les recettes dont les deux parents sont dans l'enclos, fertiles
  // et de sexes opposes.
  const candidats: { enfant: CouleurId; x: Groupe; y: Groupe; dx: Parameters<typeof croisement>[0]; dy: Parameters<typeof croisement>[1] }[] = [];
  const vus = new Set<string>();
  for (const enfant of Object.keys(cfg.rec)) {
    const [a, b] = cfg.rec[enfant];
    const ga = groupes.filter((g) => g.fertile && !g.enAttente && g.quantite > 0 && g.couleur === a);
    const gb = groupes.filter((g) => g.fertile && !g.enAttente && g.quantite > 0 && g.couleur === b);
    for (const x of ga) {
      for (const y of gb) {
        if (x.sexe === y.sexe) continue;
        const cle = `${cleGroupe(x)}#${cleGroupe(y)}`;
        if (vus.has(cle)) continue;
        vus.add(cle);
        const dx = depart.pool[a]?.find((d) => d.origine === cleGroupe(x));
        const dy = depart.pool[b]?.find((d) => d.origine === cleGroupe(y));
        if (dx && dy) candidats.push({ enfant, x, y, dx, dy });
      }
    }
  }

  // Les couleurs profondes d'abord : c'est la que se joue l'essentiel du cout.
  candidats.sort((u, v) => cfg.depth[v.enfant] - cfg.depth[u.enfant]);
  const gardes = candidats.slice(0, maxCand);

  const evalues: Candidat[] = [];
  for (const cd of gardes) {
    const rs: Captures[] = [];
    for (let i = 0; i < nCand; i++) {
      const r = simuler(cfg, depart, restants, [cd.dx, cd.dy], mulberry32(1000 + i));
      if (r) rs.push(r);
    }
    if (!rs.length) continue;
    evalues.push({
      enfant: cd.enfant,
      x: cd.x,
      y: cd.y,
      resume: resumer(rs, cfg.base),
      croisement: croisement(cd.dx, cd.dy, cfg),
    });
  }

  evalues.sort((u, v) => u.resume.total.moyenne - v.resume.total.moyenne);

  // Le plan part du meilleur couple s'il fait mieux que de laisser faire.
  const meilleur = evalues[0];
  const ouverture = meilleur && meilleur.resume.total.moyenne < baseline.total.moyenne
    ? gardes.find((cd) => cd.x === meilleur.x && cd.y === meilleur.y && cd.enfant === meilleur.enfant)
    : undefined;
  const partiesPlan: Captures[] = [];
  const journaux: Etape[][] = [];
  for (let i = 0; i < nPlan; i++) {
    const journal: Etape[] = [];
    const r = simuler(cfg, depart, restants, ouverture ? [ouverture.dx, ouverture.dy] : null,
      mulberry32(1000 + i), journal);
    if (!r) continue;
    partiesPlan.push(r);
    journaux.push(journal);
  }
  const plan = partiesPlan.length
    ? { vagues: regrouper(journaux), besoins: besoinsParents(journaux), steriles: besoinsParents(journaux, "clonage"), resume: resumer(partiesPlan, cfg.base) }
    : undefined;

  return {
    atteint: false,
    restants,
    baseline,
    candidats: evalues,
    totalCandidats: candidats.length,
    plan,
  };
}
