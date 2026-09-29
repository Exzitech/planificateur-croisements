import { Fragment, useMemo, useRef, useState } from "react";
import { exportFile } from "../../../shared/hub";
import { nomCouleur } from "../engine";
import type { Espece, Groupe, Sexe as SexeType } from "../engine";
import { genererDonneesTest } from "../store/donneesTest";
import { PLAFOND_ENCLOS, type NouveauGroupe } from "../store/enclos";
import { SaisieRapide } from "./SaisieRapide";
import { Pastille, Sexe } from "./Pastille";

type Recettes = Record<string, [string, string]>;

/** Un groupe tel qu'exporte : sans id, il sera reattribue au chargement. */
type GroupeExporte = Omit<Groupe, "id">;

/**
 * Ecrit l'enclos dans un fichier JSON du dossier Telechargements. Passe par le
 * hub (et non par un lien de telechargement) : il rend le chemin du fichier et
 * confirme l'ecriture a l'ecran, sinon un export rate ressemble a un clic perdu.
 */
function exporter(espece: Espece, groupes: Groupe[]): Promise<string> {
  const donnees: GroupeExporte[] = groupes.map(({ id: _id, ...reste }) => reste);
  const nom = `opti-elevage-${espece.id}-${new Date().toISOString().slice(0, 10)}.json`;
  return exportFile(nom, JSON.stringify(donnees, null, 2));
}

/**
 * Lit un fichier d'export et rend les groupes valides pour cette espece :
 * les couleurs inconnues du catalogue actuel (mauvaise espece, fichier
 * corrompu) sont ecartees plutot que de planter l'ecran.
 */
async function importer(
  espece: Espece,
  fichier: File,
): Promise<{ groupes: NouveauGroupe[]; ignores: number }> {
  const brut = JSON.parse(await fichier.text());
  if (!Array.isArray(brut)) throw new Error("Le fichier ne contient pas une liste.");
  const idsConnus = new Set(espece.catalogue.map((c) => c.id));
  const valides = brut.filter(
    (g): g is NouveauGroupe =>
      g && typeof g === "object" && typeof g.couleur === "string" && typeof g.quantite === "number"
      && idsConnus.has(g.couleur),
  );
  return { groupes: valides, ignores: brut.length - valides.length };
}

type Etat = "feconde" | "fertile" | "sterile";

/** Toutes les couleurs de l'espece, regroupees par generation. */
export function OptionsCouleurs({ espece }: { espece: Espece }) {
  const gens = [...new Set(espece.catalogue.map((c) => c.gen))];
  return (
    <>
      {gens.map((n) => (
        <optgroup key={n} label={`Génération ${n}`}>
          {espece.catalogue.filter((c) => c.gen === n).map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function Formulaire({ espece, onAjouter }: { espece: Espece; onAjouter: (g: NouveauGroupe) => void }) {
  const vide: NouveauGroupe = useMemo(
    () => ({ couleur: espece.capturables[0], sexe: 0, fertile: true, niveau: 1, parents: [], quantite: 1 }),
    [espece],
  );
  const [g, setG] = useState<NouveauGroupe>(vide);
  const [etat, setEtat] = useState<Etat>("feconde");
  const [lignee, setLignee] = useState(false);

  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (g.quantite < 1) return;
    onAjouter({
      ...g,
      fertile: etat !== "sterile",
      enAttente: etat === "fertile",
      parents: lignee ? g.parents.filter(Boolean) : [],
    });
    setG((p) => ({ ...vide, couleur: p.couleur, sexe: p.sexe }));
  };

  return (
    <form className="dd-formulaire" onSubmit={valider}>
      <label>
        Couleur
        <select value={g.couleur} onChange={(e) => setG({ ...g, couleur: e.target.value })}>
          <OptionsCouleurs espece={espece} />
        </select>
      </label>
      <label>
        Sexe
        <select
          value={g.sexe}
          onChange={(e) => setG({ ...g, sexe: Number(e.target.value) as SexeType })}
        >
          <option value={0}>♂ mâle</option>
          <option value={1}>♀ femelle</option>
        </select>
      </label>
      <label>
        Quantité
        <input
          type="number"
          min={1}
          max={PLAFOND_ENCLOS}
          value={g.quantite || ""}
          onChange={(e) => setG({ ...g, quantite: Math.max(0, +e.target.value || 0) })}
        />
      </label>
      <label>
        État
        <select value={etat} onChange={(e) => setEtat(e.target.value as Etat)}>
          <option value="feconde">Féconde (accouplable)</option>
          <option value="fertile">Fertile (pas encore féconde)</option>
          <option value="sterile">Stérile (clone / vente)</option>
        </select>
      </label>
      <label className="dd-case">
        <input type="checkbox" checked={lignee} onChange={(e) => setLignee(e.target.checked)} />
        Lignée connue
      </label>
      {lignee && (
        <>
          {[0, 1].map((i) => (
            <label key={i}>
              {i === 0 ? "Parent 1" : "Parent 2"}
              <select
                value={g.parents[i] ?? ""}
                onChange={(e) => {
                  const p = [...g.parents];
                  p[i] = e.target.value;
                  setG({ ...g, parents: p });
                }}
              >
                <option value="">—</option>
                <OptionsCouleurs espece={espece} />
              </select>
            </label>
          ))}
        </>
      )}
      <button type="submit" className="btn-primary">Ajouter</button>
    </form>
  );
}

/** Fertile en attente : on choisit combien de betes du lot sont deja fecondes. */
function PasserFeconde({ groupe, onFeconde }: {
  groupe: Groupe;
  onFeconde: (id: string, n: number) => void;
}) {
  const [n, setN] = useState("");
  const nb = Math.min(groupe.quantite, Math.max(1, Math.floor(Number(n)) || groupe.quantite));
  return (
    <>
      fertile{" "}
      <input type="number" min={1} max={groupe.quantite} placeholder={String(groupe.quantite)}
        value={n} onChange={(e) => setN(e.target.value)} className="dd-nb-feconde"
        aria-label="Nombre devenues fécondes" />
      <button type="button" className="btn-ghost"
        onClick={() => { onFeconde(groupe.id, nb); setN(""); }}
        title="Ces bêtes peuvent maintenant être accouplées">
        → {nb} féconde{nb > 1 ? "s" : ""}
      </button>
    </>
  );
}

export function Enclos({
  espece,
  groupes,
  total,
  recettes,
  gen,
  onAjouter,
  onAjouterPlusieurs,
  onVarier,
  onRetirer,
  onFeconde,
  onVider,
  onCharger,
  onAnnuler,
  peutAnnuler,
}: {
  espece: Espece;
  groupes: Groupe[];
  total: number;
  recettes?: Recettes;
  /** Generation de chaque couleur : l'enclos s'affiche du plus ancien au plus avance. */
  gen: Record<string, number>;
  onAjouter: (g: NouveauGroupe) => void;
  onAjouterPlusieurs: (g: NouveauGroupe[]) => void;
  onVarier: (id: string, delta: number) => void;
  onRetirer: (id: string) => void;
  onFeconde: (id: string, n: number) => void;
  onVider: () => void;
  /** Remplace tout l'enclos : import d'une sauvegarde, ou donnees de test. */
  onCharger: (g: NouveauGroupe[]) => void;
  onAnnuler: () => void;
  peutAnnuler: boolean;
}) {
  const [rapide, setRapide] = useState(false);
  const [erreurFichier, setErreurFichier] = useState("");
  const fichierRef = useRef<HTMLInputElement>(null);
  const trop = total > PLAFOND_ENCLOS;
  // Tri d'affichage seulement : l'ordre du magasin (et de l'analyse) ne change pas.
  const tries = useMemo(
    () => [...groupes].sort((a, b) => (gen[a.couleur] ?? 0) - (gen[b.couleur] ?? 0)),
    [groupes, gen],
  );

  const exporterEnclos = async () => {
    setErreurFichier("");
    try {
      await exporter(espece, groupes);
    } catch (e) {
      setErreurFichier(`Export impossible : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const surFichierChoisi = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreurFichier("");
    try {
      const { groupes: importes, ignores } = await importer(espece, fichier);
      if (importes.length === 0) {
        setErreurFichier("Aucune bête reconnue dans ce fichier pour cette espèce.");
        return;
      }
      onCharger(importes);
      if (ignores > 0) {
        setErreurFichier(`${ignores} ligne${ignores > 1 ? "s" : ""} ignorée${ignores > 1 ? "s" : ""} (couleur inconnue).`);
      }
    } catch {
      setErreurFichier("Fichier illisible : ce n'est pas un export Opti Élevage valide.");
    }
  };

  return (
    <section className="dd-section">
      <h3>
        Enclos{" "}
        <span className={trop ? "dd-compteur dd-trop" : "dd-compteur"}>
          {total} / {PLAFOND_ENCLOS}
        </span>{" "}
        <button type="button" className="btn-ghost" onClick={onAnnuler} disabled={!peutAnnuler}
          title="Annule la dernière modification de l'enclos">
          ↶ Annuler
        </button>
      </h3>

      <div className="dd-ligne">
        <button type="button" className="btn-ghost" onClick={() => void exporterEnclos()}
          disabled={groupes.length === 0} title="Enregistre l'enclos actuel dans un fichier JSON">
          ⭳ Exporter (sauvegarde)
        </button>
        <button type="button" className="btn-ghost" onClick={() => fichierRef.current?.click()}
          title="Recharge un enclos depuis un fichier exporté">
          ⭱ Importer
        </button>
        <input ref={fichierRef} type="file" accept="application/json" hidden
          aria-label="Choisir un fichier d'export à importer"
          onChange={(e) => { void surFichierChoisi(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" className="btn-ghost" onClick={() => onCharger(genererDonneesTest(espece))}
          title="Remplace l'enclos par des bêtes de couleurs de base, pour tester l'écran sans tout ressaisir">
          Données de test
        </button>
      </div>
      {erreurFichier && <p className="dd-alerte">{erreurFichier}</p>}

      {trop && (
        <p className="dd-alerte">
          Un enclos ne tient que {PLAFOND_ENCLOS} bêtes : le plan suppose que tu en
          libères au fur et à mesure.
        </p>
      )}

      {rapide ? (
        <SaisieRapide espece={espece} onAjouter={onAjouterPlusieurs} onFerme={() => setRapide(false)} />
      ) : (
        <>
          <Formulaire espece={espece} onAjouter={onAjouter} />
          <button type="button" className="btn-ghost" onClick={() => setRapide(true)}>
            Saisie rapide (enclos déjà garni)
          </button>
        </>
      )}

      {groupes.length === 0 ? (
        <p className="dd-alerte">
          Enclos vide : l'analyse partira de zéro et comptera toutes les captures nécessaires.
        </p>
      ) : (
        <table className="dd-table">
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Sexe</th>
              <th>État</th>
              <th className="dd-col-souple">Lignée</th>
              <th>Nombre</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tries.map((g, i) => (
              <Fragment key={g.id}>
                {(i === 0 || gen[g.couleur] !== gen[tries[i - 1].couleur]) && (
                  <tr className="dd-gen">
                    <th colSpan={6}>Génération {gen[g.couleur] ?? "?"}</th>
                  </tr>
                )}
              <tr>
                <td><Pastille couleur={g.couleur} couleurs={espece.couleurs} recettes={recettes} /></td>
                <td><Sexe sexe={g.sexe} /></td>
                <td>
                  {!g.fertile ? (
                    <span className="muted">stérile</span>
                  ) : g.enAttente ? (
                    <PasserFeconde groupe={g} onFeconde={onFeconde} />
                  ) : (
                    "féconde"
                  )}
                </td>
                <td className="muted dd-col-souple">
                  {g.parents.length === 2
                    ? g.parents.map((p) => nomCouleur(espece.couleurs, p, recettes)).join(" + ")
                    : "—"}
                </td>
                {/* Le flex est sur un div interieur : un <td> en display:flex quitte
                    le modele de colonnes et la cellule ne s'aligne plus sur l'en-tete. */}
                <td>
                  <div className="dd-quantite">
                    <button type="button" onClick={() => onVarier(g.id, -1)} aria-label="Une de moins">−</button>
                    <strong>{g.quantite}</strong>
                    <button type="button" onClick={() => onVarier(g.id, +1)} aria-label="Une de plus">+</button>
                  </div>
                </td>
                <td>
                  <button type="button" className="btn-ghost" onClick={() => onRetirer(g.id)}
                    aria-label={`Retirer ou vendre ${nomCouleur(espece.couleurs, g.couleur, recettes)}`}
                    title="Retirer de l'enclos (vendue)">✕</button>
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      {groupes.length > 0 && (
        <button type="button" className="btn-ghost" onClick={onVider}>Vider l'enclos</button>
      )}
    </section>
  );
}
