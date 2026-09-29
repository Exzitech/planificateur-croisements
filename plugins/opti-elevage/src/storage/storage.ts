/**
 * Petite couche de stockage, pour que le reste du plugin ignore d'ou viennent
 * les donnees. L'implementation par defaut utilise localStorage ; elle pourra
 * etre remplacee par un store Tauri sans toucher aux composants.
 *
 * Toutes les cles sont prefixees : le hub et ses plugins partagent la meme
 * origine, donc le meme localStorage.
 */
export interface Stockage {
  lire<T>(cle: string, defaut: T): T;
  ecrire(cle: string, valeur: unknown): void;
}

const PREFIXE = "opti-elevage:";

export const stockageLocal: Stockage = {
  lire<T>(cle: string, defaut: T): T {
    try {
      const brut = localStorage.getItem(PREFIXE + cle);
      return brut ? (JSON.parse(brut) as T) : defaut;
    } catch {
      // Navigation privee, stockage bloque, JSON corrompu : on repart du defaut
      // plutot que de casser l'ecran.
      return defaut;
    }
  },
  ecrire(cle: string, valeur: unknown): void {
    try {
      localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    } catch {
      /* confort : perdre la persistance ne doit pas interrompre l'utilisateur */
    }
  },
};
