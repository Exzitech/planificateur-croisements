import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistantSync } from "./fichier";
import { appliquerClonage, memeGroupe, nouvelId } from "./groupes";
import type { CouleurId, Groupe, Sexe } from "../engine";

/** Plafond de betes simultanees dans un enclos du jeu. */
export const PLAFOND_ENCLOS = 250;

/** Constante : un tableau neuf a chaque rendu relancerait les memos en aval. */
const VIDE: Groupe[] = [];

export interface NouveauGroupe {
  couleur: CouleurId;
  sexe: Sexe;
  fertile: boolean;
  enAttente?: boolean;
  niveau: number;
  parents: CouleurId[];
  quantite: number;
}

export function useEnclos(especeId: string) {
  const [groupes, setBrut] = usePersistantSync<Groupe[]>(`enclos:${especeId}`, VIDE);

  // Historique pour annuler : les etats precedents, en memoire seulement. Une
  // suite de modifications d'un meme evenement (une saisie rapide, un
  // accouplement + ses niveaux) partage le meme etat de depart : une seule
  // entree, donc un seul « annuler ».
  const [historique, setHistorique] = useState<Groupe[][]>([]);
  const setGroupes = useCallback(
    (suivant: Groupe[] | ((liste: Groupe[]) => Groupe[])) => {
      setHistorique((h) => (h[h.length - 1] === groupes ? h : [...h.slice(-49), groupes]));
      setBrut(suivant);
    },
    [groupes, setBrut],
  );
  const annuler = useCallback(() => {
    const dernier = historique[historique.length - 1];
    if (!dernier) return;
    setHistorique((h) => h.slice(0, -1));
    setBrut(dernier);
  }, [historique, setBrut]);

  // Avant la distinction feconde / fertile, « fertile » etait saisi pour des
  // betes pas encore fecondes : les anciens groupes passent en attente, une
  // seule fois (ensuite enAttente est toujours renseigne).
  useEffect(() => {
    if (groupes.some((g) => g.fertile && g.enAttente === undefined)) {
      setBrut((liste) =>
        liste.map((g) => (g.fertile && g.enAttente === undefined ? { ...g, enAttente: true } : g)),
      );
    }
    // Au montage uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => groupes.reduce((s, g) => s + g.quantite, 0), [groupes]);

  /** Ajoute, ou augmente la quantite d'un groupe identique deja present. */
  const ajouter = useCallback(
    (n: NouveauGroupe) => {
      setGroupes((liste) => {
        const existant = liste.find((g) => memeGroupe(n, g));
        if (existant) {
          return liste.map((g) =>
            g.id === existant.id ? { ...g, quantite: g.quantite + n.quantite } : g,
          );
        }
        return [...liste, { ...n, id: nouvelId() }];
      });
    },
    [setGroupes],
  );

  /** Fait varier la quantite ; un groupe tombe a zero disparait. */
  const varier = useCallback(
    (id: string, delta: number) => {
      setGroupes((liste) =>
        liste
          .map((g) => (g.id === id ? { ...g, quantite: g.quantite + delta } : g))
          .filter((g) => g.quantite > 0),
      );
    },
    [setGroupes],
  );

  const retirer = useCallback(
    (id: string) => setGroupes((liste) => liste.filter((g) => g.id !== id)),
    [setGroupes],
  );

  const vider = useCallback(() => setGroupes([]), [setGroupes]);

  /**
   * Remplace tout l'enclos (import d'une sauvegarde, ou donnees de test) :
   * chaque groupe recoit un nouvel id, pour ne jamais entrer en collision avec
   * ceux deja affiches. Passe par l'historique comme les autres actions :
   * « Annuler » revient sur l'enclos d'avant le chargement.
   */
  const charger = useCallback(
    (nouveaux: NouveauGroupe[]) => {
      setGroupes(nouveaux.filter((n) => n.quantite > 0).map((n) => ({ ...n, id: nouvelId() })));
    },
    [setGroupes],
  );

  /**
   * Fixe le niveau d'UNE bete du groupe, en la detachant si le groupe en
   * contient plusieurs : savoir qu'une rousse est niveau 120 ne dit rien des
   * vingt-neuf autres.
   */
  const preciserNiveau = useCallback(
    (id: string, niveau: number) => {
      setGroupes((liste) => {
        const g = liste.find((x) => x.id === id);
        if (!g || g.niveau === niveau) return liste;
        if (g.quantite === 1) return liste.map((x) => (x.id === id ? { ...x, niveau } : x));
        const reste = liste.map((x) => (x.id === id ? { ...x, quantite: x.quantite - 1 } : x));
        const detachee = { ...g, niveau, quantite: 1 };
        const jumeau = reste.find((x) => memeGroupe(detachee, x));
        return jumeau
          ? reste.map((x) => (x.id === jumeau.id ? { ...x, quantite: x.quantite + 1 } : x))
          : [...reste, { ...detachee, id: nouvelId() }];
      });
    },
    [setGroupes],
  );

  /** Ajoute plusieurs groupes d'un coup (saisie rapide d'un enclos deja garni). */
  const ajouterPlusieurs = useCallback(
    (nouveaux: NouveauGroupe[]) => {
      for (const n of nouveaux.filter((n) => n.quantite > 0)) ajouter(n);
    },
    [ajouter],
  );

  /**
   * Enregistre un accouplement : les deux parents deviennent steriles, le bebe
   * rejoint l'enclos avec sa lignee. `sansLignee` la lui refuse : on travaille
   * alors sur des betes interchangeables, sans avoir a les reconnaitre en jeu.
   */
  const enregistrerAccouplement = useCallback(
    (x: Groupe, y: Groupe, bebe: { couleur: CouleurId; sexe: Sexe }, sansLignee = false) => {
      setGroupes((liste) => {
        let suivant = liste;
        for (const parent of [x, y]) {
          suivant = suivant
            .map((g) => (g.id === parent.id ? { ...g, quantite: g.quantite - 1 } : g))
            .filter((g) => g.quantite > 0);
          const devenuSterile = { ...parent, fertile: false, enAttente: false, quantite: 1 };
          const jumeau = suivant.find((g) => memeGroupe(devenuSterile, g));
          suivant = jumeau
            ? suivant.map((g) => (g.id === jumeau.id ? { ...g, quantite: g.quantite + 1 } : g))
            : [...suivant, { ...devenuSterile, id: nouvelId() }];
        }
        // Le bebe nait fertile mais pas encore feconde, niveau 1, de la lignee de ses parents.
        const ne = {
          couleur: bebe.couleur,
          sexe: bebe.sexe,
          fertile: true,
          enAttente: true,
          niveau: 1,
          parents: sansLignee ? [] : [x.couleur, y.couleur],
          quantite: 1,
        };
        const jumeau = suivant.find((g) => memeGroupe(ne, g));
        return jumeau
          ? suivant.map((g) => (g.id === jumeau.id ? { ...g, quantite: g.quantite + 1 } : g))
          : [...suivant, { ...ne, id: nouvelId() }];
      });
    },
    [setGroupes],
  );

  /**
   * `n` betes d'un groupe fertile deviennent fecondes (elles peuvent desormais
   * etre accouplees) : un lot ne murit pas d'un coup.
   */
  const devenirFeconde = useCallback(
    (id: string, n: number) => {
      setGroupes((liste) => {
        const g = liste.find((x) => x.id === id);
        if (!g || !g.enAttente) return liste;
        const nb = Math.min(g.quantite, Math.max(1, Math.floor(n)));
        const feconde = { ...g, enAttente: false, quantite: nb };
        const reste = liste
          .map((x) => (x.id === id ? { ...x, quantite: x.quantite - nb } : x))
          .filter((x) => x.quantite > 0);
        const jumeau = reste.find((x) => memeGroupe(feconde, x));
        return jumeau
          ? reste.map((x) => (x.id === jumeau.id ? { ...x, quantite: x.quantite + nb } : x))
          : [...reste, { ...feconde, id: nb === g.quantite ? g.id : nouvelId() }];
      });
    },
    [setGroupes],
  );

  const enregistrerClonage = useCallback(
    (couleur: CouleurId, sexe: Sexe, fois = 1) => {
      setGroupes((liste) => appliquerClonage(liste, couleur, sexe, fois));
    },
    [setGroupes],
  );

  return {
    groupes,
    total,
    annuler,
    peutAnnuler: historique.length > 0,
    ajouter,
    ajouterPlusieurs,
    varier,
    retirer,
    vider,
    charger,
    preciserNiveau,
    devenirFeconde,
    enregistrerAccouplement,
    enregistrerClonage,
  };
}
