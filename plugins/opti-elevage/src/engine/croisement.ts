import { clePaire } from "./recettes";
import type { Config, Couleur, CouleurId, Croisement, Bete } from "./types";

/**
 * Modele d'accouplement, calibre sur deux captures de l'interface du jeu.
 *
 *   P (chance de la generation cible) = p0 + lv x (niveauX + niveauY) + Optimakina
 *
 * Chaque parent apporte une « lignee » : sa propre couleur (poids 1) et celles
 * de ses deux parents (poids `r` chacune, `r` decroissant avec sa generation).
 * Ces poids sont normalises : chaque parent pese la moitie du resultat.
 *
 *  - Avec la chance P, le bebe est un croisement d'une couleur de la lignee du
 *    pere avec une couleur de celle de la mere, pour celles qui forment une
 *    recette. Le poids du croisement est le produit des deux poids.
 *  - Sinon (1 - P), le bebe reprend une couleur de la lignee de l'un des deux
 *    parents, a parts egales entre eux, au prorata des poids.
 *
 * Capture 1 : Cannelle niv. 65 (de Sable + Cannelle) x Citron niv. 55 : Citron et
 * Cannelle 34,91 %, Sable et Citron 13,09 %, Cannelle 18,91 %, Citron 25,99 %,
 * Sable 7,1 %  ->  r = 0,6 en generation 1.
 * Capture 2 : Cerise niv. 200 x Menthe niv. 1 (de IT + IvP) : r = 0,1335 en
 * generation 9.  Entre les deux, `r` est interpole (decroissance exponentielle) :
 * c'est une hypothese, pas une mesure.
 */

/** Niveau retenu pour une bete : jamais moins que le niveau vise. */
const niveauRetenu = (d: Bete, cfg: Config): number => Math.max(d.niveau || 1, cfg.levelPlan || 1);

/** Chance de la generation cible pour ce couple, bornee a [1 %, 99 %]. */
export function chanceCible(x: Bete, y: Bete, cfg: Config): number {
  const v = cfg.p0 + cfg.lv * (niveauRetenu(x, cfg) + niveauRetenu(y, cfg)) + (cfg.opt || 0);
  return Math.max(0.01, Math.min(0.99, v));
}

/** Poids d'une couleur dans la lignee d'un parent, somme = 1. */
interface Poids {
  couleur: CouleurId;
  w: number;
}

/** Poids relatif de chaque grand-parent, par rapport a la bete elle-meme. */
const poidsGrandParent = (d: Bete, cfg: Config): number =>
  cfg.gpF * Math.exp(-cfg.gpDecay * Math.max(0, (cfg.gen[d.couleur] ?? 1) - 1));

/** La lignee d'une bete : elle-meme et ses parents connus, normalises. */
function lignee(d: Bete, cfg: Config): Poids[] {
  const parents = d.parents.filter(Boolean);
  const r = parents.length ? poidsGrandParent(d, cfg) : 0;
  const m = new Map<CouleurId, number>([[d.couleur, 1]]);
  for (const p of parents) m.set(p, (m.get(p) ?? 0) + r);
  const total = [...m.values()].reduce((s, w) => s + w, 0);
  return [...m.entries()].map(([couleur, w]) => ({ couleur, w: w / total }));
}

/**
 * Les deux moities du resultat, en probabilites absolues : ce que donne la
 * chance cible (croisements de lignees) et le reste (couleurs d'un parent).
 */
type Repartition = ReturnType<typeof calculerRepartition>;

/**
 * La simulation reprend des milliers de fois les memes couples : on memorise le
 * resultat par couple, pour chaque config (elle change des qu'un reglage change).
 */
const memo = new WeakMap<Config, Map<string, Repartition>>();

function repartition(x: Bete, y: Bete, cfg: Config): Repartition {
  let cache = memo.get(cfg);
  if (!cache) memo.set(cfg, (cache = new Map()));
  const cle = `${x.couleur}|${x.parents.join(",")}|${niveauRetenu(x, cfg)}#${y.couleur}|${y.parents.join(",")}|${niveauRetenu(y, cfg)}`;
  let r = cache.get(cle);
  if (!r) cache.set(cle, (r = calculerRepartition(x, y, cfg)));
  return r;
}

function calculerRepartition(x: Bete, y: Bete, cfg: Config) {
  const enfant = cfg.byPair[clePaire(x.couleur, y.couleur)];
  const lx = lignee(x, cfg);
  const ly = lignee(y, cfg);

  const croisements = new Map<CouleurId, number>();
  if (enfant) {
    for (const a of lx) {
      for (const b of ly) {
        const c = cfg.byPair[clePaire(a.couleur, b.couleur)];
        if (c) croisements.set(c, (croisements.get(c) ?? 0) + a.w * b.w);
      }
    }
  }
  const masse = [...croisements.values()].reduce((s, w) => s + w, 0);
  const P = enfant && masse > 0 ? chanceCible(x, y, cfg) : 0;

  const cibles: { couleur: CouleurId; p: number }[] = [];
  for (const [couleur, w] of croisements) cibles.push({ couleur, p: (P * w) / masse });

  const autres = new Map<CouleurId, number>();
  for (const l of [...lx.map((a) => ({ ...a, w: a.w / 2 })), ...ly.map((a) => ({ ...a, w: a.w / 2 }))]) {
    autres.set(l.couleur, (autres.get(l.couleur) ?? 0) + (1 - P) * l.w);
  }
  return { P, cibles, autres: [...autres.entries()].map(([couleur, p]) => ({ couleur, p })) };
}

/** Toutes les couleurs possibles du bebe, avec leur probabilite. */
export function croisement(x: Bete, y: Bete, cfg: Config): Croisement {
  const { P, cibles, autres } = repartition(x, y, cfg);
  const m = new Map<CouleurId, number>();
  for (const o of [...cibles, ...autres]) m.set(o.couleur, (m.get(o.couleur) ?? 0) + o.p);
  const list = [...m.entries()]
    .filter(([, p]) => p > 0)
    .map(([couleur, p]) => ({ couleur, p }))
    .sort((a, b) => b.p - a.p);

  return {
    list,
    cibles: cibles.filter((o) => o.p > 0).map((o) => o.couleur),
    partage: cibles.filter((o) => o.p > 0).length > 1,
    P,
  };
}

/**
 * Tire la couleur d'un bebe avec un seul tirage : les croisements d'abord, puis
 * les couleurs des parents.
 */
export function tirerBebe(
  x: Bete,
  y: Bete,
  enfant: CouleurId,
  cfg: Config,
  rng: () => number,
): CouleurId {
  const { cibles, autres } = repartition(x, y, cfg);
  const tous = [...cibles, ...autres];
  let u = rng();
  for (const o of tous) {
    u -= o.p;
    if (u < 0) return o.couleur;
  }
  return tous.length ? tous[tous.length - 1].couleur : enfant;
}

/** Type reexporte par commodite pour l'UI. */
export type { Couleur };
