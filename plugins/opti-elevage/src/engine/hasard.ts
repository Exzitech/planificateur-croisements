/**
 * PRNG deterministe (mulberry32) : a graine egale, meme suite de tirages.
 *
 * Indispensable a la comparaison des couples : chaque candidat est evalue sur
 * les MEMES graines que la reference (common random numbers), donc l'ecart
 * mesure vient du couple force, pas du hasard.
 *
 * Toute modification de l'ordre des appels a rng() change les resultats, et
 * avec eux les valeurs attendues par les tests.
 */
export type Rng = () => number;

export function mulberry32(graine: number): Rng {
  let a = graine | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
