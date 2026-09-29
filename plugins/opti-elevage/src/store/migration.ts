import { stockageLocal } from "../storage/storage";
import type { Stockage } from "../storage/storage";

/**
 * Avant le multi-espece, tout etait stocke sous "enclos", "objectif",
 * "parametres", "recettes" (sans suffixe d'espece) : c'etait forcement des
 * donnees Perruches, seule espece existante a l'epoque.
 *
 * Ces cles sont copiees vers leur equivalent "<cle>:perruches" une seule
 * fois, sans jamais toucher a l'ancienne cle (au cas ou) : si la nouvelle cle
 * a deja une valeur (l'utilisateur a rouvert l'appli depuis la migration), on
 * ne l'ecrase pas.
 */
const CLES = ["enclos", "objectif", "parametres", "recettes"];

export function migrerVersPerruches(stockage: Stockage = stockageLocal): void {
  for (const cle of CLES) {
    const ancienne = stockage.lire<unknown>(cle, undefined);
    if (ancienne === undefined) continue;
    const nouvelleCle = `${cle}:perruches`;
    const deja = stockage.lire<unknown>(nouvelleCle, undefined);
    if (deja !== undefined) continue;
    stockage.ecrire(nouvelleCle, ancienne);
  }
}
