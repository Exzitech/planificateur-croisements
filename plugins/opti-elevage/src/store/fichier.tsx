import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useFichierSync, type FichierSync } from "../../../shared/fichierSync";
import { stockageLocal } from "../storage/storage";

export const ID = "opti-elevage";
export const FICHIER = "elevage.json";
export const DOSSIER = "ExziHub/Elevage";
/** Miroir de la derniere version connue (forme du fichier, pas des anciennes cles). */
const CLE_MIROIR = "opti-elevage:fichier";

/**
 * Le fichier reprend telles quelles les cles d'avant la synchro
 * (`enclos:perruches`, `objectif:canaris`…), dans un seul objet : une espece
 * ajoutee plus tard n'impose donc aucune migration.
 *
 * Reste local, parce que propre a l'appareil : `espece` (l'onglet ouvert ici).
 */
export type Contenu = Record<string, unknown>;

/** Cles reprises a la premiere synchro, pour chaque espece connue. */
const PREFIXES = ["enclos", "objectif", "parametres", "recettes"];

const vide = (): Contenu => ({});

function analyser(texte: string): Contenu {
  try {
    const d = JSON.parse(texte) as unknown;
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Contenu) : {};
  } catch {
    return {};
  }
}

/**
 * Donnees d'avant la synchro. Les anciennes cles sont seulement lues : elles
 * restent en place comme filet si la reprise se passe mal.
 */
function reprendreLocal(especes: string[]): () => Contenu | null {
  return () => {
    const d: Contenu = {};
    for (const espece of especes) {
      for (const prefixe of PREFIXES) {
        const cle = `${prefixe}:${espece}`;
        const v = stockageLocal.lire<unknown>(cle, undefined);
        if (v !== undefined) d[cle] = v;
      }
    }
    return Object.keys(d).length ? d : null;
  };
}

const Contexte = createContext<FichierSync<Contenu> | null>(null);

export function FournisseurElevage({ especes, children }: { especes: string[]; children: ReactNode }) {
  const f = useFichierSync<Contenu>({
    id: ID, fichier: FICHIER, cleLocale: CLE_MIROIR, vide, analyser,
    reprendreLocal: reprendreLocal(especes),
  });
  return <Contexte.Provider value={f}>{children}</Contexte.Provider>;
}

export function useElevage(): FichierSync<Contenu> {
  const f = useContext(Contexte);
  if (!f) throw new Error("useElevage hors de FournisseurElevage");
  return f;
}

/**
 * Meme signature que l'ancien `usePersistant`, mais la valeur vit dans le
 * fichier Nextcloud : une seule synchro pour toutes les cles du plugin.
 *
 * L'ecriture passe par `modifierPlusTard` : l'ecran voit le changement tout de
 * suite, l'envoi part apres un court silence. Avec `modifier`, la valeur ne
 * revenait qu'apres l'aller-retour reseau — un accouplement enchaine relancait
 * alors l'analyse sur l'enclos d'avant, et chaque frappe dans les recettes
 * partait sur Nextcloud.
 */
export function usePersistantSync<T>(cle: string, defaut: T) {
  const f = useElevage();
  const brut = f.donnees?.[cle];
  const valeur = (brut === undefined ? defaut : brut) as T;

  const changer = useCallback(
    (suivant: T | ((precedent: T) => T)) => {
      f.modifierPlusTard((d) => {
        const precedent = (d[cle] === undefined ? defaut : d[cle]) as T;
        const v = typeof suivant === "function" ? (suivant as (p: T) => T)(precedent) : suivant;
        return { ...d, [cle]: v };
      });
    },
    [cle, defaut, f],
  );

  return [valeur, changer] as const;
}
