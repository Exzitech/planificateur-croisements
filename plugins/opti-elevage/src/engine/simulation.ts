import { tirerBebe } from "./croisement";
import { clePaire } from "./recettes";
import type { Captures, Config, CouleurId, Bete, Etape, Groupe, Sexe } from "./types";

/** Reservoir de betes par couleur. L'ordre d'insertion des cles compte (voir plus bas). */
type Reservoir = Record<CouleurId, Bete[]>;

export interface Enclos {
  /** Fertiles, accouplables. */
  pool: Reservoir;
  /** Steriles, clonables. */
  ster: Reservoir;
}

/** Cle d'un groupe : sert a retrouver, dans l'enclos deplie, la bete d'un candidat. */
export const cleGroupe = (g: Groupe): string =>
  `${g.couleur}|${g.sexe}|${g.parents.join(",")}|${g.niveau || 1}${g.enAttente ? "|att" : ""}`;

/** Deplie les groupes (couleur, sexe, quantite) en betes individuelles. */
export function deplier(groupes: Groupe[]): Enclos {
  const pool: Reservoir = {};
  const ster: Reservoir = {};
  for (const g of groupes) {
    if (g.quantite <= 0) continue;
    const cle = cleGroupe(g);
    for (let i = 0; i < g.quantite; i++) {
      const d: Bete = {
        couleur: g.couleur,
        sexe: g.sexe,
        parents: g.parents,
        niveau: g.niveau || 1,
        origine: cle,
        // Pas encore feconde : accouplable des la vague suivante.
        ...(g.fertile && g.enAttente ? { pret: 1 } : {}),
      };
      const cible = g.fertile ? pool : ster;
      (cible[g.couleur] || (cible[g.couleur] = [])).push(d);
    }
  }
  // Les fecondes d'abord : l'accouplement prend le premier couple trouve.
  for (const c of Object.keys(pool)) {
    if (pool[c].some((d) => d.pret)) pool[c].sort((u, v) => (u.pret ?? 0) - (v.pret ?? 0));
  }
  return { pool, ster };
}

/** Une partie qui boucle est abandonnee plutot que de figer l'analyse. */
const LIMITE_OPERATIONS = 40000;

/**
 * Joue une partie complete et compte les captures necessaires.
 *
 * Strategie « a la demande » : pour obtenir une couleur, on clone si on a
 * deux steriles, sinon on capture si c'est une couleur de base, sinon on
 * fabrique recursivement ses deux parents et on les accouple.
 *
 * `premier` force un accouplement en ouverture : c'est ainsi qu'on evalue un
 * couple candidat, a graines identiques.
 *
 * `journal`, s'il est fourni, recoit chaque accouplement et clonage avec sa
 * vague (voir `Bete.pret`). Il ne change rien au deroulement de la partie.
 *
 * Renvoie null si la partie a depasse la limite d'operations.
 *
 * ATTENTION : l'ordre des appels a `rng` est celui du moteur de reference.
 * Le modifier change tous les resultats, et avec eux les valeurs des tests.
 */
export function simuler(
  cfg: Config,
  depart: Enclos,
  objectifs: CouleurId[],
  premier: [Bete, Bete] | null,
  rng: () => number,
  journal?: Etape[],
): Captures | null {
  const pool: Reservoir = {};
  const ster: Reservoir = {};
  for (const c of Object.keys(depart.pool)) pool[c] = depart.pool[c].slice();
  for (const c of Object.keys(depart.ster)) ster[c] = depart.ster[c].slice();

  const parCouleur: Record<CouleurId, number> = {};
  for (const c of cfg.base) parCouleur[c] = 0;
  let accouplements = 0;
  let clonages = 0;
  let operations = 0;

  const sexe = (): Sexe => (rng() < 0.5 ? 0 : 1);
  const ajouter = (d: Bete) => {
    (pool[d.couleur] || (pool[d.couleur] = [])).push(d);
  };
  // Copie : les betes de depart sont partagees entre les parties.
  const steriliser = (d: Bete, pret: number) => {
    (ster[d.couleur] || (ster[d.couleur] = [])).push({ ...d, pret });
  };
  const nbSteriles = (c: CouleurId) => (ster[c] ? ster[c].length : 0);

  /** 2 steriles -> 1 fertile ; la couleur vient de l'un des deux, au hasard. */
  function cloner(c: CouleurId, autre: CouleurId) {
    clonages++;
    const x1 = ster[c].pop() as Bete;
    const x2 = ster[autre].pop() as Bete;
    const src = rng() < 0.5 ? x1 : x2;
    const vague = Math.max(x1.pret ?? 0, x2.pret ?? 0);
    journal?.push({ vague, type: "clonage", a: src.couleur, consomme: [x1.couleur, x2.couleur] });
    ajouter({ couleur: src.couleur, sexe: sexe(), parents: src.parents, niveau: 1, origine: "clone", pret: vague + 1 });
  }

  function bebe(x: Bete, y: Bete, enfant: CouleurId) {
    accouplements++;
    const couleur = tirerBebe(x, y, enfant, cfg, rng);
    const vague = Math.max(x.pret ?? 0, y.pret ?? 0);
    journal?.push({ vague, type: "accouplement", a: x.couleur, b: y.couleur, enfant });
    ajouter({
      couleur,
      sexe: sexe(),
      parents: [x.couleur, y.couleur],
      niveau: 1,
      origine: "bebe",
      pret: vague + 1,
    });
  }

  /** Produit une bete de cette couleur, par le moyen le moins cher disponible. */
  function produire(c: CouleurId) {
    if (++operations > LIMITE_OPERATIONS) throw new Error("boucle");
    if (nbSteriles(c) >= 2) {
      cloner(c, c);
      return;
    }
    if (nbSteriles(c) >= 1) {
      const autres = Object.keys(ster).filter((y) => y !== c && ster[y].length >= 1);
      if (autres.length) {
        cloner(c, autres[Math.floor(rng() * autres.length)]);
        return;
      }
    }
    if (!cfg.rec[c]) {
      parCouleur[c]++;
      ajouter({ couleur: c, sexe: sexe(), parents: [], niveau: 1, origine: "capture", pret: 0 });
      return;
    }
    const [a, b] = cfg.rec[c];
    const [x, y] = accoupler(a, b);
    bebe(x, y, c);
  }

  /** Trouve (ou fabrique) un couple a x b de sexes opposes, et le sterilise. */
  function accoupler(a: CouleurId, b: CouleurId): [Bete, Bete] {
    for (;;) {
      const pa = pool[a] || (pool[a] = []);
      const pb = pool[b] || (pool[b] = []);
      for (let i = 0; i < pa.length; i++) {
        for (let j = 0; j < pb.length; j++) {
          if (pa[i].sexe !== pb[j].sexe) {
            const x = pa.splice(i, 1)[0];
            const y = pb.splice(j, 1)[0];
            const pret = Math.max(x.pret ?? 0, y.pret ?? 0) + 1;
            steriliser(x, pret);
            steriliser(y, pret);
            return [x, y];
          }
        }
      }
      // Rien d'accouplable : produire ce qui manque, en commencant par le plus rare.
      if (!pa.length) produire(a);
      else if (!pb.length) produire(b);
      else produire(pa.length <= pb.length ? a : b);
    }
  }

  try {
    if (premier) {
      const [x, y] = premier;
      pool[x.couleur].splice(pool[x.couleur].indexOf(x), 1);
      pool[y.couleur].splice(pool[y.couleur].indexOf(y), 1);
      steriliser(x, 1);
      steriliser(y, 1);
      bebe(x, y, cfg.byPair[clePaire(x.couleur, y.couleur)]);
    }
    for (const t of objectifs) {
      while (!(pool[t]?.length || ster[t]?.length)) produire(t);
    }
  } catch {
    return null;
  }

  return { parCouleur, accouplements, clonages };
}
