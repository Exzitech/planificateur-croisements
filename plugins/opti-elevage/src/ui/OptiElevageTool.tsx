import { useCallback, useEffect, useMemo, useRef } from "react";
import { SyncSetup } from "../../../shared/hub";
import {
  ESPECES,
  PARAMETRES_DEFAUT,
  analyserRecettes,
} from "../engine";
import type { Candidat, Config, CouleurId, Espece, Objectif as ObjectifType, Parametres, Sexe } from "../engine";
import { useEnclos } from "../store/enclos";
import { DOSSIER, FournisseurElevage, ID, useElevage, usePersistantSync } from "../store/fichier";
import { usePersistant } from "../store/persistant";
import { useAnalyse } from "../worker/useAnalyse";
import { CommentCaMarche } from "./CommentCaMarche";
import { Enclos } from "./Enclos";
import { Objectif } from "./Objectif";
import { Reglages } from "./Reglages";
import { Resultats } from "./Resultats";

/**
 * Tout l'ecran pour une espece donnee. Monte a neuf a chaque changement
 * d'espece (via la `key` posee par le parent) : chaque `usePersistant` relit
 * alors sa propre cle de stockage au lieu de garder celle de l'espece
 * precedente.
 */
/** Onglets de l'ecran : chacun ne montre que ce qu'on utilise a ce moment-la. */
type Vue = "accoupler" | "cloner" | "plan" | "enclos" | "reglages";
const VUES: { id: Vue; nom: string }[] = [
  { id: "accoupler", nom: "Accoupler" },
  { id: "cloner", nom: "Cloner" },
  { id: "plan", nom: "Captures & plan" },
  { id: "enclos", nom: "Enclos" },
  { id: "reglages", nom: "Réglages" },
];

function EspaceEspece({ espece }: { espece: Espece }) {
  const enclos = useEnclos(espece.id);
  // L'onglet ouvert reste local : un choix d'affichage, pas une donnee.
  const [vue, setVue] = usePersistant<Vue>("vue", "accoupler");
  const [objectif, setObjectif] = usePersistantSync<ObjectifType>(`objectif:${espece.id}`, espece.objectifDefaut);
  const [stockes, setParametres] = usePersistantSync<Parametres>(`parametres:${espece.id}`, PARAMETRES_DEFAUT);
  // Un reglage enregistre par une version plus ancienne peut manquer.
  const parametres = useMemo(() => ({ ...PARAMETRES_DEFAUT, ...stockes }), [stockes]);
  const [texteRecettes, setTexteRecettes] = usePersistantSync(`recettes:${espece.id}`, espece.recettesDefaut);
  // Travailler sans lignees : les betes d'une meme couleur et d'un meme sexe
  // deviennent interchangeables, on n'a plus a reconnaitre laquelle en jeu.
  const [sansLignee, setSansLignee] = usePersistantSync(`sansLignee:${espece.id}`, false);
  const { resultat, enCours, lancer, arreter, oublier } = useAnalyse();

  const couleurs = useMemo(
    () => espece.resoudreObjectif(objectif, analyserRecettes(espece.couleurs, texteRecettes).byPair),
    [espece, objectif, texteRecettes],
  );

  // L'objectif et l'enclos peuvent citer des bicolores libres (Ebene et
  // Doree...) : on les declare pour que le moteur les connaisse, en plus du
  // vocabulaire propre a l'espece (ses bicolores intermediaires).
  const recettes = useMemo(() => {
    const utilisees = [...couleurs, ...enclos.groupes.flatMap((g) => [g.couleur, ...g.parents])];
    const { lignes, ids } = espece.recettesBicolores(utilisees);
    return analyserRecettes(
      espece.couleurs,
      lignes ? `${texteRecettes}\n${lignes}` : texteRecettes,
      [...espece.idsRecette, ...ids],
    );
  }, [espece, texteRecettes, couleurs, enclos.groupes]);

  // Les lignees existantes ne sont pas effacees, seulement ignorees : les ids
  // restent ceux de l'enclos, donc « J'ai fait cet accouplement » retrouve bien
  // ses groupes.
  const groupes = useMemo(
    () => (sansLignee ? enclos.groupes.map((g) => (g.parents.length ? { ...g, parents: [] } : g)) : enclos.groupes),
    [sansLignee, enclos.groupes],
  );

  const cfg: Config = useMemo(() => ({ ...recettes, ...parametres }), [recettes, parametres]);

  const bloquant = recettes.erreurs.length > 0;

  const analyser = useCallback(() => {
    lancer({ groupes, objectifs: couleurs, cfg });
  }, [lancer, groupes, couleurs, cfg]);

  // Apres un accouplement ou un clonage, le resultat affiche ne vaut plus : on
  // le retire et on relance sur le nouvel enclos. L'enclos est ecrit dans le
  // fichier Nextcloud, donc il n'est a jour qu'apres l'aller-retour : la relance
  // attend ce changement (lancee tout de suite, elle rejouerait l'ancien enclos
  // et rendrait le meme classement).
  const relanceDemandee = useRef(false);
  const relancer = useCallback(() => {
    oublier();
    relanceDemandee.current = true;
  }, [oublier]);
  useEffect(() => {
    if (!relanceDemandee.current) return;
    relanceDemandee.current = false;
    analyser();
    // Uniquement quand l'enclos a change, pas a chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enclos.groupes]);

  // Les accouplements s'enchainent : apres le bebe encode, l'analyse repart et
  // on replace l'ecran sur « A accoupler », que la disparition du resultat
  // pendant l'analyse avait fait remonter.
  const ancreAccouplement = useRef<HTMLElement | null>(null);
  const revenirAccouplement = useRef(false);
  useEffect(() => {
    if (!resultat || !revenirAccouplement.current) return;
    revenirAccouplement.current = false;
    ancreAccouplement.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultat]);

  const surAccouplement = useCallback(
    (c: Candidat, bebe: { couleur: CouleurId; sexe: Sexe }) => {
      enclos.enregistrerAccouplement(c.x, c.y, bebe, sansLignee);
      revenirAccouplement.current = true;
      relancer();
    },
    [enclos, relancer, sansLignee],
  );

  const surClonage = useCallback(
    (couleur: CouleurId, sexe: Sexe, fois: number) => {
      enclos.enregistrerClonage(couleur, sexe, fois);
      relancer();
    },
    [enclos, relancer],
  );

  /**
   * Niveaux saisis sur un couple : on les enregistre dans l'enclos, puis on
   * rejoue les simulations. Le classement en tient alors compte, alors que la
   * saisie seule ne changeait que les probabilites affichees.
   */
  const surNiveaux = useCallback(
    (x: { id: string; niveau: number }, y: { id: string; niveau: number }) => {
      enclos.preciserNiveau(x.id, x.niveau);
      enclos.preciserNiveau(y.id, y.niveau);
      relancer();
    },
    [enclos, relancer],
  );

  // Le resultat affiche portait sur l'enclos d'avant : on le rejoue.
  const surAnnuler = useCallback(() => {
    enclos.annuler();
    if (resultat) relancer();
  }, [enclos, resultat, relancer]);

  return (
    <>
      <div className="dd-entete">
        <span className="muted">Objectif : {espece.libelleObjectif(objectif)}</span>
        <span className="spacer" />
        {enCours ? (
          <>
            <span className="dd-encours">Analyse en cours…</span>
            <button type="button" className="btn-ghost" onClick={arreter}>Annuler</button>
          </>
        ) : (
          <button type="button" className="btn-primary" onClick={analyser} disabled={bloquant}
            title={bloquant ? "Corrige les recettes d'abord" : undefined}>
            Analyser
          </button>
        )}
      </div>

      {bloquant && (
        <p className="dd-alerte">
          Les recettes contiennent une erreur : corrige-les dans les réglages avant d'analyser.
        </p>
      )}

      <div className="dd-onglets" role="group" aria-label="Vue">
        {VUES.map((v) => (
          <button key={v.id} type="button" aria-pressed={v.id === vue}
            className={v.id === vue ? "btn-primary" : undefined} onClick={() => setVue(v.id)}>
            {v.id === "enclos" ? `Enclos (${enclos.total})` : v.nom}
          </button>
        ))}
      </div>

      {vue !== "enclos" && vue !== "reglages" && !resultat && !enCours && (
        <p className="hint">Lance une analyse pour voir quoi faire.</p>
      )}

      {vue !== "enclos" && vue !== "reglages" && resultat && (
        <Resultats
          espece={espece}
          analyse={resultat}
          groupes={groupes}
          cfg={cfg}
          recettes={recettes.rec}
          vue={vue}
          sansLignee={sansLignee}
          onSansLignee={setSansLignee}
          onAnnuler={surAnnuler}
          peutAnnuler={enclos.peutAnnuler}
          ancreAccouplement={ancreAccouplement}
          onAccouplement={surAccouplement}
          onClonage={surClonage}
          onNiveaux={surNiveaux}
        />
      )}

      {vue === "enclos" && (
        <>
          <Objectif espece={espece} objectif={objectif} onChange={setObjectif} />

          <Enclos
            espece={espece}
            groupes={enclos.groupes}
            total={enclos.total}
            recettes={recettes.rec}
            gen={recettes.gen}
            onAjouter={enclos.ajouter}
            onAjouterPlusieurs={enclos.ajouterPlusieurs}
            onVarier={enclos.varier}
            onRetirer={enclos.retirer}
            onFeconde={enclos.devenirFeconde}
            onVider={enclos.vider}
            onCharger={enclos.charger}
            onAnnuler={surAnnuler}
            peutAnnuler={enclos.peutAnnuler}
          />
        </>
      )}

      {vue === "reglages" && (
        <>
          <Reglages
            espece={espece}
            parametres={parametres}
            onChange={setParametres}
            recettes={texteRecettes}
            onRecettes={setTexteRecettes}
            erreurs={recettes.erreurs}
          />
          <CommentCaMarche />
        </>
      )}
    </>
  );
}

export function OptiElevageTool() {
  // L'espece ouverte reste locale : c'est un choix d'affichage, pas une donnee.
  const [especeId, setEspeceId] = usePersistant("espece", ESPECES[0].id);
  const espece = ESPECES.find((e) => e.id === especeId) ?? ESPECES[0];

  return (
    <FournisseurElevage especes={ESPECES.map((e) => e.id)}>
      <Ecran espece={espece} setEspeceId={setEspeceId} />
    </FournisseurElevage>
  );
}

function Ecran({ espece, setEspeceId }: { espece: Espece; setEspeceId: (id: string) => void }) {
  const f = useElevage();

  // Tant qu'aucun espace n'est choisi, l'ecran sert a en choisir un : l'enclos,
  // l'objectif, les reglages et les recettes vivent sur Nextcloud (elevage.json).
  if (f.chargement) return <p className="hint">Chargement…</p>;
  if (!f.dossier) {
    return (
      <div className="dd">
        <header className="dd-entete"><h2>{espece.emoji} Opti Élevage</h2></header>
        <p className="hint">
          Choisis un espace Nextcloud : ton enclos et tes objectifs te suivent d'un appareil a l'autre.
        </p>
        <SyncSetup id={ID} dossierParDefaut={DOSSIER} lien onChange={f.relire} />
      </div>
    );
  }

  return (
    <div className="dd">
      <header className="dd-entete">
        <h2>{espece.emoji} Opti Élevage</h2>
        <div className="dd-onglets" role="group" aria-label="Espèce">
          {ESPECES.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={e.id === espece.id}
              className={e.id === espece.id ? "btn-primary" : undefined}
              onClick={() => setEspeceId(e.id)}
            >
              {e.nom}
            </button>
          ))}
        </div>
      </header>

      {f.enAttente && <p className="hint">Enregistrement…</p>}
      {f.horsLigne && <div className="banner banner-warn">Nextcloud injoignable : derniere copie connue, en lecture seule.</div>}
      {f.erreur && <div className="banner banner-alert">{f.erreur}</div>}

      <EspaceEspece key={espece.id} espece={espece} />
    </div>
  );
}
