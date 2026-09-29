import { useState } from "react";
import type { Espece } from "../engine";
import type { NouveauGroupe } from "../store/enclos";
import { Pastille } from "./Pastille";

/** Les six etats possibles d'une bete, en colonnes. */
const COLONNES = [
  { cle: "mf", libelle: "♂ féconde", sexe: 0 as const, fertile: true, enAttente: false },
  { cle: "ff", libelle: "♀ féconde", sexe: 1 as const, fertile: true, enAttente: false },
  { cle: "ma", libelle: "♂ fertile", sexe: 0 as const, fertile: true, enAttente: true },
  { cle: "fa", libelle: "♀ fertile", sexe: 1 as const, fertile: true, enAttente: true },
  { cle: "ms", libelle: "♂ stérile", sexe: 0 as const, fertile: false, enAttente: false },
  { cle: "fs", libelle: "♀ stérile", sexe: 1 as const, fertile: false, enAttente: false },
];

type Grille = Record<string, string>;

const nombre = (v: string | undefined) => {
  const n = Number(v);
  return v?.trim() && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/**
 * Saisie d'un enclos deja garni, en une fois : une ligne par couleur, une
 * colonne par etat. Les betes ainsi ajoutees sont sans lignee — c'est le cas
 * de toutes celles qu'on a capturees, et le formulaire detaille reste la pour
 * les quelques-unes dont on connait les parents.
 */
export function SaisieRapide({
  espece,
  onAjouter,
  onFerme,
}: {
  espece: Espece;
  onAjouter: (groupes: NouveauGroupe[]) => void;
  onFerme: () => void;
}) {
  const [grille, setGrille] = useState<Grille>({});
  const [toutes, setToutes] = useState(false);

  // Par defaut, seules les couleurs de base : ce sont celles qu'on possede en
  // nombre, puisque ce sont les seules capturables.
  const visibles = toutes
    ? espece.couleurs
    : espece.couleurs.filter((c) => espece.capturables.includes(c.id));
  const total = Object.values(grille).reduce((s, v) => s + nombre(v), 0);

  const valider = () => {
    const groupes: NouveauGroupe[] = [];
    for (const couleur of espece.couleurs) {
      for (const col of COLONNES) {
        const quantite = nombre(grille[`${couleur.id}-${col.cle}`]);
        if (quantite > 0) {
          groupes.push({
            couleur: couleur.id,
            sexe: col.sexe,
            fertile: col.fertile,
            enAttente: col.enAttente,
            niveau: 1,
            parents: [],
            quantite,
          });
        }
      }
    }
    onAjouter(groupes);
    setGrille({});
    onFerme();
  };

  return (
    <div className="dd-rapide">
      <p className="hint">
        Pour un enclos déjà garni. Ces bêtes sont ajoutées <strong>sans lignée</strong> ;
        celles dont tu connais les parents se saisissent une par une. <strong>Féconde</strong> :
        accouplable maintenant. <strong>Fertile</strong> : pas encore féconde. <strong>Stérile</strong> :
        bonne à cloner ou à vendre.
      </p>

      <div className="dd-rapide-defilement">
        <table className="dd-table dd-grille">
          <thead>
            <tr>
              <th>Couleur</th>
              {COLONNES.map((c) => <th key={c.cle}>{c.libelle}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map((couleur) => (
              <tr key={couleur.id}>
                <td><Pastille couleur={couleur.id} couleurs={espece.couleurs} /></td>
                {COLONNES.map((col) => {
                  const cle = `${couleur.id}-${col.cle}`;
                  return (
                    <td key={col.cle}>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={grille[cle] ?? ""}
                        onChange={(e) => setGrille((g) => ({ ...g, [cle]: e.target.value }))}
                        aria-label={`${couleur.nom} ${col.libelle}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dd-ligne">
        <label className="dd-case">
          <input type="checkbox" checked={toutes} onChange={(e) => setToutes(e.target.checked)} />
          Toutes les couleurs
        </label>
        <span className="spacer" />
        <span className="muted">{total} à ajouter</span>
        <button type="button" className="btn-primary" onClick={valider} disabled={total === 0}>
          Ajouter
        </button>
        <button type="button" className="btn-ghost" onClick={onFerme}>Annuler</button>
      </div>
    </div>
  );
}
