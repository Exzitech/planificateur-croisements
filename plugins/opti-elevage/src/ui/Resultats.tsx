import { useMemo, useState } from "react";
import type { MutableRefObject } from "react";
import { croisement as calculerCroisement, nomCouleur } from "../engine";
import type {
  Analyse, Candidat, Config, Couleur, CouleurId, Bete, Espece, Groupe, Plan, Sexe as SexeType,
} from "../engine";
import { PLAFOND_ENCLOS } from "../store/enclos";
import { OptionsCouleurs } from "./Enclos";
import { BarreProbabilites } from "./BarreProbabilites";
import { Pastille, Sexe } from "./Pastille";

type Recettes = Record<string, [string, string]>;

const arrondi = (n: number) => Math.round(n).toLocaleString("fr-FR");

/**
 * Niveau reel d'un des deux parents, facultatif : vide = le niveau vise des
 * reglages. On le lit dans le jeu juste avant d'accoupler, pas en remplissant
 * l'enclos.
 */
function ChampNiveau({
  parent,
  couleurs,
  valeur,
  defaut,
  recettes,
  onChange,
}: {
  parent: Groupe;
  couleurs: readonly Couleur[];
  valeur: string;
  defaut: number;
  recettes?: Recettes;
  onChange: (v: string) => void;
}) {
  const couleur = nomCouleur(couleurs, parent.couleur, recettes);
  const nom = `${couleur} ${parent.sexe === 0 ? "♂" : "♀"}`;
  return (
    <label className="dd-niveau">
      <span>
        Niveau <Pastille couleur={parent.couleur} couleurs={couleurs} recettes={recettes} compact />{" "}
        {couleur} <Sexe sexe={parent.sexe} />
      </span>
      <input type="number" min={1} max={200} placeholder={String(defaut)} value={valeur}
        onChange={(e) => onChange(e.target.value)} aria-label={`Niveau de la ${nom}`} />
    </label>
  );
}

const niveauSaisi = (v: string, defaut: number) => {
  const n = Number(v);
  return v.trim() && Number.isFinite(n) ? Math.min(200, Math.max(1, n)) : defaut;
};

/** La lignée d'une bête : ses deux parents, ou « sans lignée » si on ne les connaît pas. */
function Lignee({ groupe, couleurs, recettes }: { groupe: Groupe; couleurs: readonly Couleur[]; recettes?: Recettes }) {
  return (
    <span className="muted dd-lignee">
      {groupe.parents.length === 2
        ? `de ${groupe.parents.map((p) => nomCouleur(couleurs, p, recettes)).join(" + ")}`
        : "sans lignée"}
    </span>
  );
}

/** Un couple propose, avec ce qu'il peut donner et ce qu'il reste ensuite. */
function Couple({
  candidat,
  rang,
  espece,
  sansLignee,
  cfg,
  couleurs,
  recettes,
  onFait,
  onNiveaux,
}: {
  candidat: Candidat;
  rang: number;
  espece: Espece;
  sansLignee: boolean;
  cfg: Config;
  couleurs: readonly Couleur[];
  recettes?: Recettes;
  onFait: (c: Candidat, bebe: { couleur: CouleurId; sexe: SexeType }) => void;
  /** Enregistre les niveaux saisis et rejoue l'analyse avec eux. */
  onNiveaux: (x: { id: string; niveau: number }, y: { id: string; niveau: number }) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [sexe, setSexe] = useState<SexeType>(0);
  // Niveaux reels, lus dans le jeu juste avant d'accoupler. Vides par defaut :
  // le classement suppose deja que tout est monte au niveau vise.
  const [nivX, setNivX] = useState("");
  const [nivY, setNivY] = useState("");

  const precise = nivX.trim() !== "" || nivY.trim() !== "";
  const croisement = useMemo(() => {
    if (!precise) return candidat.croisement;
    const bete = (g: Groupe, niveau: string): Bete => ({
      couleur: g.couleur,
      sexe: g.sexe,
      parents: g.parents,
      niveau: niveauSaisi(niveau, cfg.levelPlan),
      origine: "saisi",
    });
    return calculerCroisement(bete(candidat.x, nivX), bete(candidat.y, nivY), cfg);
  }, [precise, candidat, cfg, nivX, nivY]);

  const [couleur, setCouleur] = useState<CouleurId>(candidat.croisement.list[0]?.couleur ?? couleurs[0]?.id);
  // Le jeu donne parfois un resultat que le croisement ne prevoit pas : on doit
  // pouvoir enregistrer n'importe quelle couleur du catalogue, toutes generations.
  const [horsCroisement, setHorsCroisement] = useState(false);
  // La couleur choisie doit exister dans la liste affichee, sinon le <select>
  // montrerait sa premiere option pendant qu'on enregistrerait l'ancienne.
  const basculer = (actif: boolean) => {
    setHorsCroisement(actif);
    const liste = actif
      ? espece.catalogue.map((c) => c.id)
      : croisement.list.map((o) => o.couleur);
    if (!liste.includes(couleur) && liste[0] !== undefined) setCouleur(liste[0]);
  };

  return (
    <li className={rang === 0 ? "dd-couple dd-meilleur" : "dd-couple"}>
      <div className="dd-couple-tete">
        <span className="dd-parents">
          <Pastille couleur={candidat.x.couleur} couleurs={couleurs} recettes={recettes} />
          <Sexe sexe={candidat.x.sexe} />
          {!sansLignee && <Lignee groupe={candidat.x} couleurs={couleurs} recettes={recettes} />}
          <span className="muted">×</span>
          <Pastille couleur={candidat.y.couleur} couleurs={couleurs} recettes={recettes} />
          <Sexe sexe={candidat.y.sexe} />
          {!sansLignee && <Lignee groupe={candidat.y} couleurs={couleurs} recettes={recettes} />}
        </span>
        {rang === 0 && <span className="dd-badge">Meilleur choix</span>}
        <span className="spacer" />
        <span className="muted">
          ≈ {arrondi(candidat.resume.total.moyenne)} captures restantes ensuite
        </span>
      </div>

      <div className="dd-niveaux">
        <ChampNiveau parent={candidat.x} couleurs={couleurs} valeur={nivX} defaut={cfg.levelPlan}
          recettes={recettes} onChange={setNivX} />
        <ChampNiveau parent={candidat.y} couleurs={couleurs} valeur={nivY} defaut={cfg.levelPlan}
          recettes={recettes} onChange={setNivY} />
        <span className="muted dd-chance">
          chance <strong>{(croisement.P * 100).toFixed(1).replace(".", ",")} %</strong>
          {!precise && <> (au niveau visé {cfg.levelPlan})</>}
        </span>
        {precise && (
          <button type="button" className="btn-ghost"
            onClick={() => onNiveaux(
              { id: candidat.x.id, niveau: niveauSaisi(nivX, cfg.levelPlan) },
              { id: candidat.y.id, niveau: niveauSaisi(nivY, cfg.levelPlan) },
            )}
            title="Enregistre ces niveaux dans l'enclos et rejoue les simulations">
            Recalculer le classement
          </button>
        )}
      </div>

      <BarreProbabilites croisement={croisement} couleurs={couleurs} recettes={recettes} />

      {croisement.partage && (
        <p className="dd-avertissement">
          <strong>Chance partagée</strong> entre{" "}
          {croisement.cibles.map((c) => nomCouleur(couleurs, c, recettes)).join(" et ")} : les
          grands-parents ouvrent d'autres croisements. Une lignée plus simple concentrerait
          la chance.
        </p>
      )}

      {ouvert ? (
        <div className="dd-ligne dd-enregistrer">
          <label>
            Bébé obtenu
            <select value={couleur} onChange={(e) => setCouleur(e.target.value)}>
              {horsCroisement ? <OptionsCouleurs espece={espece} /> : croisement.list.map((o) => (
                <option key={o.couleur} value={o.couleur}>
                  {nomCouleur(couleurs, o.couleur, recettes)} ({(o.p * 100).toFixed(1)} %)
                </option>
              ))}
            </select>
          </label>
          <label className="dd-case" title="Le jeu a donné une couleur que ce croisement ne prévoit pas">
            <input type="checkbox" checked={horsCroisement}
              onChange={(e) => basculer(e.target.checked)} />
            Autre couleur
          </label>
          <label>
            Sexe
            <select value={sexe} onChange={(e) => setSexe(Number(e.target.value) as SexeType)}>
              <option value={0}>♂ mâle</option>
              <option value={1}>♀ femelle</option>
            </select>
          </label>
          <button type="button" className="btn-primary"
            onClick={() => { onFait(candidat, { couleur, sexe }); setOuvert(false); }}>
            Enregistrer
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOuvert(false)}>
            Annuler
          </button>
        </div>
      ) : (
        <button type="button" className="btn-ghost" onClick={() => setOuvert(true)}>
          J'ai fait cet accouplement
        </button>
      )}
    </li>
  );
}

/** Une couleur clonable : combien de clones d'un coup, puis « J'ai cloné ». */
function LigneClone({
  couleur, sexe, clonages, conseille, couleurs, recettes, onFait,
}: {
  couleur: CouleurId;
  sexe: SexeType;
  clonages: number;
  conseille: boolean;
  couleurs: readonly Couleur[];
  recettes?: Recettes;
  onFait: (couleur: CouleurId, sexe: SexeType, fois: number) => void;
}) {
  // Par defaut tout ce qui est possible : on clone en serie, pas un par un.
  const [fois, setFois] = useState(String(clonages));
  const n = Math.min(clonages, Math.max(1, Math.floor(Number(fois)) || 1));

  return (
    <li>
      <Pastille couleur={couleur} couleurs={couleurs} recettes={recettes} />
      <Sexe sexe={sexe} />
      <span className="muted">
        {clonages} clonage{clonages > 1 ? "s" : ""} possible{clonages > 1 ? "s" : ""} (2 → 1)
      </span>
      {conseille && <span className="dd-badge">Conseillé</span>}
      <span className="spacer" />
      <input className="dd-nb" type="number" min={1} max={clonages} value={fois}
        onChange={(e) => setFois(e.target.value)}
        aria-label={`Nombre de clonages de ${nomCouleur(couleurs, couleur, recettes)}`} />
      <button type="button" className="btn-ghost" onClick={() => onFait(couleur, sexe, n)}>
        J'ai cloné{n > 1 ? ` ×${n}` : ""}
      </button>
    </li>
  );
}

/**
 * Clonages possibles : deux stériles de même couleur ET de même sexe donnent un
 * clone identique. Conseillé quand le plan a besoin de cette couleur (il en
 * manque) ou de ce sexe (il y a moins de fertiles que de l'autre sexe).
 */
function aCloner(groupes: Groupe[], plan?: Plan) {
  const nb = (c: CouleurId, sexe: number, fertile: boolean) => groupes
    .filter((g) => g.fertile === fertile && g.couleur === c && g.sexe === sexe)
    .reduce((n, g) => n + g.quantite, 0);
  const besoins = new Map(plan?.besoins.map((b) => [b.couleur, Math.ceil(b.moyenne - 1e-9)]));

  const lignes: { couleur: CouleurId; sexe: SexeType; clonages: number; conseille: boolean }[] = [];
  for (const g of groupes) {
    if (g.fertile) continue;
    if (lignes.some((l) => l.couleur === g.couleur && l.sexe === g.sexe)) continue;
    const clonages = Math.floor(nb(g.couleur, g.sexe, false) / 2);
    if (clonages < 1) continue;
    const autre = (g.sexe === 0 ? 1 : 0) as SexeType;
    const fertiles = nb(g.couleur, 0, true) + nb(g.couleur, 1, true);
    const besoin = besoins.get(g.couleur) ?? 0;
    const conseille = besoin > 0
      && (besoin > fertiles || nb(g.couleur, g.sexe, true) < nb(g.couleur, autre, true));
    lignes.push({ couleur: g.couleur, sexe: g.sexe, clonages, conseille });
  }
  return lignes.sort((a, b) => Number(b.conseille) - Number(a.conseille) || b.clonages - a.clonages);
}

const nombreVague = (n: number) => (n < 10 ? n.toFixed(1).replace(".", ",").replace(",0", "") : arrondi(n));

/**
 * Le goal : combien de bêtes de chaque couleur il faut avoir fécondes,
 * face à ce que l'enclos contient. Le « manque » est ce sur quoi se concentrer.
 */
function Goal({ plan, groupes, cfg, couleurs, recettes }: {
  plan: Plan; groupes: Groupe[]; cfg: Config; couleurs: readonly Couleur[]; recettes?: Recettes;
}) {
  const nombre = (c: CouleurId, attente: boolean) =>
    groupes
      .filter((g) => g.fertile && !!g.enAttente === attente && g.couleur === c)
      .reduce((s, g) => s + g.quantite, 0);
  const lignes = plan.besoins
    .map((b) => {
      const besoin = Math.ceil(b.moyenne - 1e-9);
      const stock = nombre(b.couleur, false);
      const attente = nombre(b.couleur, true);
      return { ...b, besoin, stock, attente, manque: Math.max(0, besoin - stock - attente) };
    })
    .sort((u, v) => (v.manque > 0 ? 1 : 0) - (u.manque > 0 ? 1 : 0)
      || cfg.gen[v.couleur] - cfg.gen[u.couleur]);
  if (!lignes.length) return null;
  const aFaire = lignes.filter((l) => l.manque > 0);

  return (
    <section className="dd-section">
      <h3>Goal : bêtes fécondes à obtenir</h3>
      <p className="hint">
        {aFaire.length
          ? "Concentre-toi sur les lignes avec un manque : ce sont les bêtes à fabriquer (les fertiles en attente sont déjà comptées)."
          : "Tu as déjà assez de fécondes de chaque couleur pour tout le plan."}
      </p>
      <table className="dd-table dd-captures">
        <thead>
          <tr>
            <th>Couleur</th>
            <th>Génération</th>
            <th>Besoin</th>
            <th>Fécondes</th>
            <th>Fertiles (en attente)</th>
            <th>Manque</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.couleur}>
              <td><Pastille couleur={l.couleur} couleurs={couleurs} recettes={recettes} /></td>
              <td>{cfg.gen[l.couleur]}</td>
              <td>{l.besoin} <span className="muted">({l.p90})</span></td>
              <td>{l.stock}</td>
              <td>{l.attente}</td>
              <td>{l.manque > 0 ? <strong>{l.manque}</strong> : <span className="muted">0</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Le deroule complet, vague par vague. Une bete nee (ou clonee) n'est feconde
 * qu'apres un delai : la vague 1 n'utilise que l'enclos actuel, la 2 ce que la
 * 1 a produit, etc.
 */
interface Vente {
  couleur: CouleurId;
  /** Absent pour les stériles : le clonage se moque du sexe du surplus. */
  sexe?: SexeType;
  nombre: number;
  motif: "sterile" | "trop";
}

/**
 * Ce qu'on peut vendre sans gêner le plan, même dans le cas prudent (9 fois sur 10) :
 *  - les stériles que le plan ne clonera pas ;
 *  - les fertiles ou fécondes d'une couleur en surplus, ou dont le plan n'a pas du tout
 *    besoin. On retire d'abord le sexe le plus nombreux : un accouplement veut un mâle
 *    et une femelle.
 */
function aVendre(groupes: Groupe[], plan: Plan): Vente[] {
  const nb = (c: CouleurId, fertile: boolean, sexe?: number) => groupes
    .filter((g) => g.fertile === fertile && g.couleur === c && (sexe === undefined || g.sexe === sexe))
    .reduce((n, g) => n + g.quantite, 0);
  const clones = new Map(plan.steriles.map((b) => [b.couleur, Math.ceil(b.p90 - 1e-9)]));
  const parents = new Map(plan.besoins.map((b) => [b.couleur, Math.ceil(b.p90 - 1e-9)]));
  const ventes: Vente[] = [];

  for (const c of new Set(groupes.map((g) => g.couleur))) {
    const sterile = nb(c, false) - (clones.get(c) ?? 0);
    if (sterile > 0) ventes.push({ couleur: c, nombre: sterile, motif: "sterile" });

    let surplus = nb(c, true) - (parents.get(c) ?? 0);
    let m = nb(c, true, 0);
    let f = nb(c, true, 1);
    const vendus = [0, 0];
    while (surplus > 0 && m + f > 0) {
      const sexe = m >= f ? 0 : 1;
      if (sexe === 0) m--; else f--;
      vendus[sexe]++;
      surplus--;
    }
    for (const sexe of [0, 1] as const) {
      if (vendus[sexe] > 0) ventes.push({ couleur: c, sexe, nombre: vendus[sexe], motif: "trop" });
    }
  }
  return ventes;
}

function PlanVagues({ plan, couleurs, recettes }: { plan: Plan; couleurs: readonly Couleur[]; recettes?: Recettes }) {
  return (
    <details className="dd-section">
      <summary><h3>Plan par génération</h3> <span className="muted">({plan.vagues.length} vagues)</span></summary>
      <p className="hint">
        Chaque vague n'utilise que des bêtes déjà fécondes : les bébés et les clones de
        la vague N ne servent qu'à la vague N+1. Nombres moyens sur{" "}
        {plan.resume.parties.toLocaleString("fr-FR")} parties simulées, entre parenthèses le cas
        prudent (9 fois sur 10). Ce qui manque est fabriqué par une vague précédente.
      </p>
      {plan.vagues.map((v) => (
        <div key={v.vague}>
          <h4>Vague {v.vague}{v.vague === 1 ? " — maintenant, avec l'enclos actuel" : ""}</h4>
          <ul className="dd-clones">
            {v.etapes.map((e) => (
              <li key={`${e.type}${e.a}${e.b ?? ""}`}>
                {e.type === "accouplement" ? (
                  <>
                    <Pastille couleur={e.a} couleurs={couleurs} recettes={recettes} />
                    <span className="muted">×</span>
                    <Pastille couleur={e.b!} couleurs={couleurs} recettes={recettes} />
                    <span className="muted">→ {nomCouleur(couleurs, e.enfant!, recettes)}</span>
                  </>
                ) : (
                  <>
                    <span className="muted">Cloner</span>
                    <Pastille couleur={e.a} couleurs={couleurs} recettes={recettes} />
                  </>
                )}
                <span className="spacer" />
                <span>
                  ≈ <strong>{nombreVague(e.moyenne)}</strong>{" "}
                  <span className="muted">({e.p90})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

/**
 * Captures a faire d'abord, sans depasser la place libre de l'enclos : si le plan
 * en demande plus, chaque couleur en garde sa part proportionnelle, les plus
 * demandees d'abord. Le reste se capture apres avoir libere de la place.
 */
function repartirCaptures(demandes: Map<CouleurId, number>, place: number, proportionnel = false) {
  const total = [...demandes.values()].reduce((s, n) => s + n, 0);
  if (total <= 0) return new Map<CouleurId, number>();
  if (!proportionnel && total <= place) return new Map(demandes);
  const part = new Map<CouleurId, number>();
  let utilise = 0;
  for (const [c, n] of demandes) {
    const v = Math.floor((n * place) / total);
    part.set(c, v);
    utilise += v;
  }
  const parReste = [...demandes.entries()].sort(
    (u, v) => (v[1] - (part.get(v[0]) ?? 0)) - (u[1] - (part.get(u[0]) ?? 0)),
  );
  for (const [c, n] of parReste) {
    if (utilise >= place) break;
    if ((part.get(c) ?? 0) < n) {
      part.set(c, (part.get(c) ?? 0) + 1);
      utilise++;
    }
  }
  return part;
}

export function Resultats({
  espece,
  analyse,
  groupes,
  cfg,
  recettes,
  vue,
  sansLignee,
  onSansLignee,
  onAnnuler,
  peutAnnuler,
  ancreAccouplement,
  onAccouplement,
  onClonage,
  onNiveaux,
}: {
  espece: Espece;
  analyse: Analyse;
  groupes: Groupe[];
  cfg: Config;
  recettes?: Recettes;
  /** Onglet affiche : les accouplements, les clonages, ou le plan et les captures. */
  vue: "accoupler" | "cloner" | "plan";
  /** Lignees ignorees : betes interchangeables a couleur et sexe egaux. */
  sansLignee: boolean;
  onSansLignee: (v: boolean) => void;
  /** Revient sur la derniere saisie (accouplement ou clonage enregistre par erreur). */
  onAnnuler: () => void;
  peutAnnuler: boolean;
  /** Le parent s'en sert pour revenir ici apres un accouplement enchaine. */
  ancreAccouplement?: MutableRefObject<HTMLElement | null>;
  onAccouplement: (c: Candidat, bebe: { couleur: CouleurId; sexe: SexeType }) => void;
  onClonage: (couleur: CouleurId, sexe: SexeType, fois: number) => void;
  onNiveaux: (x: { id: string; niveau: number }, y: { id: string; niveau: number }) => void;
}) {
  const couleurs = espece.couleurs;
  const clonables = aCloner(groupes, analyse.plan);

  if (analyse.erreur) return <p className="dd-alerte">{analyse.erreur}</p>;
  if (analyse.atteint) {
    return (
      <section className="dd-section">
        <h3>Objectif atteint</h3>
        <p>L'enclos contient déjà ce que tu cherches. Rien à capturer.</p>
      </section>
    );
  }
  if (!analyse.baseline) return null;

  const { baseline, candidats = [] } = analyse;
  const ventes = analyse.plan ? aVendre(groupes, analyse.plan) : [];
  // Le plan part du meilleur couple : ses captures sont celles qu'on recommande.
  const source = analyse.plan?.resume ?? baseline;
  const aMonter = Math.round(source.accouplements * 2);
  // Clonages faisables tout de suite avec les steriles actuels : la premiere vague.
  const clonesMaintenant = (analyse.plan?.vagues[0]?.vague === 1
    ? analyse.plan.vagues[0].etapes.filter((e) => e.type === "clonage")
    : []).reduce((n, e) => n + e.moyenne, 0);

  const totalEnclos = groupes.reduce((s, g) => s + g.quantite, 0);
  const place = Math.max(0, PLAFOND_ENCLOS - totalEnclos);
  const demandes = new Map<CouleurId, number>(
    couleurs.filter((c) => source.parCouleur[c.id]?.moyenne >= 0.05)
      .map((c) => [c.id, Math.ceil(source.parCouleur[c.id].moyenne - 1e-9)]),
  );
  // Vendre libere de la place : l'enclos se remplit de nouveau apres la vente.
  const totalVente = ventes.reduce((n, v) => n + v.nombre, 0);
  const capacite = place + totalVente;
  const minimum = repartirCaptures(demandes, capacite);
  const totalDemande = [...demandes.values()].reduce((s, n) => s + n, 0);
  const totalMinimum = [...minimum.values()].reduce((s, n) => s + n, 0);
  const aLiberer = totalDemande - totalMinimum;

  // Plus on a de parents, plus on accouple en parallele : la place qui reste est
  // repartie entre les couleurs de base au prorata de leur poids dans l'arbre de
  // l'objectif (combien de fois chacune entre dans sa fabrication). Les bebes
  // se logent en vendant des steriles.
  const feuilles = new Map<CouleurId, number>();
  const compter = (c: CouleurId): Map<CouleurId, number> => {
    if (!cfg.rec[c]) return new Map([[c, 1]]);
    const total = new Map<CouleurId, number>();
    for (const parent of cfg.rec[c]) {
      for (const [f, n] of compter(parent)) total.set(f, (total.get(f) ?? 0) + n);
    }
    return total;
  };
  for (const objectif of analyse.restants) {
    for (const [f, n] of compter(objectif)) feuilles.set(f, (feuilles.get(f) ?? 0) + n);
  }
  // On remplit l'enclos, en evitant les couleurs dont on a deja trop (sauf s'il n'en
  // reste aucune : l'enclos doit etre plein).
  const dejaTrop = new Set(ventes.filter((v) => v.motif === "trop").map((v) => v.couleur));
  const sansTrop = new Map([...feuilles].filter(([c]) => !dejaTrop.has(c)));
  const poidsBoost = sansTrop.size ? sansTrop : feuilles;
  const extra = Math.max(0, capacite - totalMinimum);
  const boost = repartirCaptures(poidsBoost, extra, true);
  const conseil = new Map<CouleurId, number>();
  for (const c of new Set([...minimum.keys(), ...boost.keys()])) {
    conseil.set(c, (minimum.get(c) ?? 0) + (boost.get(c) ?? 0));
  }
  // Un accouplement veut un male et une femelle : les captures comblent l'ecart.
  const sexes = (c: CouleurId, sexe: number) => groupes
    .filter((g) => g.fertile && g.couleur === c && g.sexe === sexe)
    .reduce((n, g) => n + g.quantite, 0);
  const partage = (c: CouleurId) => {
    const n = conseil.get(c) ?? 0;
    const m = Math.min(n, Math.max(0, Math.round((n + sexes(c, 1) - sexes(c, 0)) / 2)));
    return [m, n - m];
  };
  // Capturer et vendre le meme sexe de la meme couleur n'a pas de sens : on retire de
  // la vente ce qu'on capture (l'enclos reste plein).
  const capturesSexe = new Map<CouleurId, number[]>();
  for (const c of conseil.keys()) capturesSexe.set(c, partage(c));
  const vendables: Vente[] = [];
  for (const v of ventes) {
    const cap = capturesSexe.get(v.couleur);
    const reste = v.motif === "trop" && v.sexe !== undefined && cap ? v.nombre - cap[v.sexe] : v.nombre;
    if (reste > 0) vendables.push({ ...v, nombre: reste });
  }
  const parSexe = (c: CouleurId) => {
    const cap = capturesSexe.get(c) ?? [0, 0];
    return { m: cap[0], f: cap[1] };
  };
  const totalConseil = [...conseil.values()].reduce((s, n) => s + n, 0);
  // Ce qui tient dans la place libre d'aujourd'hui ; le reste attend la vente.
  const maintenant = repartirCaptures(conseil, place);
  const totalMaintenant = [...maintenant.values()].reduce((n, v) => n + v, 0);
  const apresVente = totalConseil - totalMaintenant;
  // Sexe de ceux qu'on capture tout de suite : la part du total, sans depasser ce qui
  // est conseille pour chaque sexe.
  const maintenantSexe = (c: CouleurId) => {
    const n = maintenant.get(c) ?? 0;
    const { m: cm, f: cf } = parSexe(c);
    const m = Math.min(cm, n, Math.max(n - cf, cm + cf ? Math.round((n * cm) / (cm + cf)) : 0));
    return { m, f: n - m };
  };
  const lignesCapture = couleurs.filter((c) => cfg.base.includes(c.id)
    && ((source.parCouleur[c.id]?.moyenne ?? 0) >= 0.05 || (conseil.get(c.id) ?? 0) > 0));

  const sectionCapturer = (
      <section className="dd-section">
        <h3>À capturer</h3>
        <p className="hint">
          À partir de l'enclos actuel, pour atteindre{" "}
          {analyse.restants.map((c) => nomCouleur(couleurs, c, recettes)).join(" et ")}. Place libre :{" "}
          <strong>{place}</strong> sur {PLAFOND_ENCLOS}
          {totalVente > 0 && <> (et {totalVente} de plus en vendant)</>}.
        </p>
        {totalConseil > totalMinimum && (
          <p className="hint">
            Le plan n'exige que {totalMinimum} capture{totalMinimum > 1 ? "s" : ""}, mais tu as de
            la place : en capturer davantage donne plus de parents à accoupler en même temps, donc
            un plan plus rapide. Les {totalConseil - totalMinimum} en plus sont réparties entre les
            couleurs qui entrent le plus dans l'objectif, en comblant l'écart entre mâles et
            femelles.
          </p>
        )}
        {apresVente > 0 && (
          <p className="dd-alerte">
            Capture d'abord les <strong>{totalMaintenant}</strong> qui tiennent dans la place
            libre. Vends ensuite les <strong>{totalVente}</strong> de « À vendre », puis capture
            les <strong>{apresVente}</strong> restantes (relance l'analyse après la vente).
          </p>
        )}
        {aLiberer > 0 && (
          <p className="dd-alerte">
            Même en vendant tout ce qui est conseillé, il manque{" "}
            <strong>{aLiberer}</strong> places pour capturer le nécessaire.
          </p>
        )}
        <table className="dd-table dd-captures">
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Nécessaire (moyenne)</th>
              <th>Nécessaire, prudent</th>
              <th>À capturer (conseillé)</th>
              <th>Tout de suite</th>
            </tr>
          </thead>
          <tbody>
            {lignesCapture.map((c) => (
              <tr key={c.id}>
                <td><Pastille couleur={c.id} couleurs={couleurs} /></td>
                <td>{arrondi(source.parCouleur[c.id]?.moyenne ?? 0)}</td>
                <td>{source.parCouleur[c.id]?.p90 ?? 0}</td>
                <td>
                  <strong>{conseil.get(c.id) ?? 0}</strong>
                  {(conseil.get(c.id) ?? 0) > 0 && (
                    <span className="muted"> (♂ {parSexe(c.id).m} / ♀ {parSexe(c.id).f})</span>
                  )}
                </td>
                <td>
                  <strong>{maintenant.get(c.id) ?? 0}</strong>
                  {(maintenant.get(c.id) ?? 0) > 0 && (
                    <span className="muted"> (♂ {maintenantSexe(c.id).m} / ♀ {maintenantSexe(c.id).f})</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="dd-total">
              <td>Total</td>
              <td><strong>{arrondi(source.total.moyenne)}</strong></td>
              <td><strong>{source.total.p90}</strong></td>
              <td><strong>{totalConseil}</strong></td>
              <td><strong>{totalMaintenant}</strong></td>
            </tr>
          </tbody>
        </table>
        <p className="dd-effort">
          Puis environ <strong>{arrondi(source.accouplements)}</strong> accouplements,{" "}
          <strong>{arrondi(source.clonages)}</strong> clonages
          {analyse.plan && (
            <> (dont <strong>{arrondi(clonesMaintenant)}</strong> tout de suite avec tes stériles, les
            autres avec ceux que les accouplements produiront)</>
          )}, et{" "}
          <strong>{arrondi(aMonter)}</strong> bêtes à monter au niveau visé — chaque
          parent naît niveau 1.
        </p>
        <p className="hint">
          Moyennes sur {source.parties.toLocaleString("fr-FR")} parties simulées.
        </p>
      </section>
  );

  const annuler = (
    <>
      <span className="spacer" />
      <button type="button" className="btn-ghost" onClick={onAnnuler} disabled={!peutAnnuler}
        title="Revient sur la dernière saisie et relance l'analyse">
        Annuler la dernière saisie
      </button>
    </>
  );

  // Sans lignees, deux groupes de meme couleur et de meme sexe donnent le meme
  // couple : n'en proposer qu'un, sinon la liste se remplit de doublons.
  const couples: Candidat[] = [];
  const vus = new Set<string>();
  for (const c of candidats) {
    const cle = sansLignee ? `${c.x.couleur}${c.x.sexe}-${c.y.couleur}${c.y.sexe}-${c.enfant}` : "";
    if (cle && vus.has(cle)) continue;
    if (cle) vus.add(cle);
    couples.push(c);
    if (couples.length === 5) break;
  }

  if (vue === "accoupler") return (
    <>
      <section className="dd-section" ref={ancreAccouplement}>
        <div className="dd-section-tete"><h3>À accoupler</h3>{annuler}</div>
        <label className="dd-case" title="Deux bêtes de même couleur et de même sexe deviennent interchangeables : plus besoin de reconnaître laquelle en jeu">
          <input type="checkbox" checked={sansLignee} onChange={(e) => onSansLignee(e.target.checked)} />
          Ignorer les lignées
        </label>
        {sansLignee && (
          <p className="hint">
            Les lignées existantes sont ignorées (pas effacées) et les bébés naissent sans
            lignée. Les chances affichées ne tiennent donc plus compte des grands-parents.
          </p>
        )}
        {candidats.length === 0 ? (
          <p className="hint">
            Aucun couple possible dans l'enclos : il faut d'abord capturer ou cloner.
          </p>
        ) : (
          <ul className="dd-couples">
            {couples.map((c, i) => (
              <Couple key={`${c.x.id}-${c.y.id}-${c.enfant}`} candidat={c} rang={i} espece={espece}
                sansLignee={sansLignee} cfg={cfg} couleurs={couleurs} recettes={recettes}
                onFait={onAccouplement} onNiveaux={onNiveaux} />
            ))}
          </ul>
        )}
      </section>
    </>
  );

  if (vue === "cloner") return (
    <>
      <section className="dd-section">
        <div className="dd-section-tete"><h3>À cloner</h3>{annuler}</div>
        {clonables.length === 0 ? (
          <p className="hint">
            Aucune paire de stériles de même couleur et de même sexe. Deux stériles identiques
            donnent un clone identique.
          </p>
        ) : (
          <ul className="dd-clones">
            {clonables.map((c) => (
              <LigneClone key={`${c.couleur}${c.sexe}-${c.clonages}`} {...c} couleurs={couleurs}
                recettes={recettes} onFait={onClonage} />
            ))}
          </ul>
        )}
      </section>

    </>
  );

  return (
    <>
      {place > 0 && sectionCapturer}

      {analyse.plan && <Goal plan={analyse.plan} groupes={groupes} cfg={cfg} couleurs={couleurs} recettes={recettes} />}
      {analyse.plan && <PlanVagues plan={analyse.plan} couleurs={couleurs} recettes={recettes} />}

      {vendables.length > 0 && (
        <section className="dd-section">
          <h3>À vendre</h3>
          <p className="hint">
            Le plan n'en a plus besoin, même dans le cas prudent : tu peux les vendre pour
            libérer de la place. C'est facultatif.
          </p>
          <ul className="dd-clones">
            {vendables.map((l) => (
              <li key={`${l.couleur}${l.motif}${l.sexe ?? ""}`}>
                <Pastille couleur={l.couleur} couleurs={couleurs} recettes={recettes} />
                {l.sexe !== undefined && <Sexe sexe={l.sexe} />}
                <span className="muted">
                  {l.motif === "sterile" ? "stériles, plus de clonage prévu" : "en trop pour le plan"}
                </span>
                <span className="spacer" />
                <strong>{l.nombre}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {place <= 0 && sectionCapturer}
    </>
  );
}
