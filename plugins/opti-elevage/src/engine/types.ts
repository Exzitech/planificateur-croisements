/** Identifiant court d'une couleur : "R", "DR", "Em", "EmR"... */
export type CouleurId = string;

export interface Couleur {
  id: CouleurId;
  nom: string;
  /** Couleur de la pastille dans l'interface. */
  hex: string;
}

export type Sexe = 0 | 1;

/**
 * Un groupe de betes identiques dans l'enclos : meme couleur, meme sexe, meme
 * fertilite, meme lignee, meme niveau. L'utilisateur saisit des quantites, pas
 * des individus.
 */
export interface Groupe {
  /** Cle stable pour React et pour les modifications. */
  id: string;
  couleur: CouleurId;
  sexe: Sexe;
  /**
   * Fertile : peut devenir feconde, donc etre accouplee. Sinon sterile : ne sert
   * qu'a etre clonee ou vendue.
   */
  fertile: boolean;
  /**
   * Fertile mais pas encore feconde (un bebe, un clone) : elle le devient apres
   * un delai, donc ne sert qu'a la vague suivante. Absent = feconde pour le
   * moteur ; le store migre les anciens enclos (voir `useEnclos`).
   */
  enAttente?: boolean;
  /** Lignee : les 2 couleurs parentes, connues ou non. */
  parents: CouleurId[];
  /** 1 a 200. */
  niveau: number;
  quantite: number;
}

/** Une bete individuelle, telle que la simulation la manipule. */
export interface Bete {
  couleur: CouleurId;
  sexe: Sexe;
  parents: CouleurId[];
  niveau: number;
  /** Origine : cle de groupe, "baby", "clone" ou "cap". Sert a retrouver un candidat. */
  origine: string;
  /**
   * Vague a partir de laquelle elle est accouplable (0 = tout de suite). Un
   * bebe ou un clone n'est feconde qu'apres un delai : il ne sert qu'a la vague
   * suivant celle qui l'a produit.
   */
  pret?: number;
}

/** Les recettes analysees : ce que le moteur consulte en permanence. */
export interface Recettes {
  /** enfant -> [parentA, parentB] */
  rec: Record<CouleurId, [CouleurId, CouleurId]>;
  /** "a+b" trie -> enfant */
  byPair: Record<string, CouleurId>;
  /** Couleurs qui ne sont l'enfant d'aucune recette : les capturables. */
  base: CouleurId[];
  /** Profondeur dans l'arbre (base = 0). */
  depth: Record<CouleurId, number>;
  /** Generation affichee dans le jeu = profondeur + 1 (base = 1). */
  gen: Record<CouleurId, number>;
  erreurs: string[];
}

/** Reglages du modele, tous ajustables : voir « Comment ca marche ». */
export interface Parametres {
  /** Chance de base de la generation cible (0,30 = 30 %). */
  p0: number;
  /** Gain par niveau cumule des 2 parents (0,0015 = 0,15 %). */
  lv: number;
  /** Optimakina : +10 % si utilisee. */
  opt: number;
  /** Poids d'un grand-parent, relatif a son petit-enfant, en generation 1. */
  gpF: number;
  /** Decroissance de ce poids par generation (exponentielle). */
  gpDecay: number;
  /** Niveau auquel l'utilisateur monte ses betes avant de les accoupler. */
  levelPlan: number;
}

/** Tout ce dont le moteur a besoin : recettes analysees + reglages. */
export type Config = Recettes & Parametres;

/** Probabilites d'un accouplement donne. */
export interface Croisement {
  /** Couleurs possibles du bebe, de la plus probable a la moins probable. */
  list: { couleur: CouleurId; p: number }[];
  /** Couleurs obtenues par croisement des lignees : elles se partagent la chance P. */
  cibles: CouleurId[];
  /** Plusieurs couleurs cibles se partagent le bonus. */
  partage: boolean;
  /** Chance de la generation cible. */
  P: number;
}

/** Captures comptees pendant une partie, par couleur de base. */
export interface Captures {
  parCouleur: Record<CouleurId, number>;
  accouplements: number;
  clonages: number;
}

export interface Resume {
  /** Par couleur de base : moyenne et p90 du nombre de captures. */
  parCouleur: Record<CouleurId, { moyenne: number; p90: number }>;
  total: { moyenne: number; p90: number };
  accouplements: number;
  clonages: number;
  parties: number;
}

export interface Candidat {
  enfant: CouleurId;
  /** Les 2 groupes de l'enclos a accoupler. */
  x: Groupe;
  y: Groupe;
  resume: Resume;
  croisement: Croisement;
}

/** Une operation jouee pendant une partie, rangee par vague. */
export interface Etape {
  vague: number;
  type: "accouplement" | "clonage";
  /** Accouplement : un parent. Clonage : la couleur obtenue. */
  a: CouleurId;
  b?: CouleurId;
  /** Accouplement : la couleur visee par la recette. */
  enfant?: CouleurId;
  /** Clonage : les couleurs des deux steriles consommes. */
  consomme?: CouleurId[];
}

/** Une operation type d'une vague, en nombre moyen sur les parties simulees. */
export interface EtapePlan extends Omit<Etape, "vague"> {
  moyenne: number;
  p90: number;
}

/** Ce qui se fait en meme temps : tout ce qui est deja feconde a cet instant. */
export interface VaguePlan {
  /** 1 = maintenant, avec l'enclos actuel. */
  vague: number;
  etapes: EtapePlan[];
}

/** Bêtes d'une couleur qui serviront de parent pendant tout le plan. */
export interface Besoin {
  couleur: CouleurId;
  moyenne: number;
  p90: number;
}

export interface Plan {
  vagues: VaguePlan[];
  /** Parents necessaires par couleur : le « goal » a se fixer. */
  besoins: Besoin[];
  /** Steriles consommes par les clonages du plan, par couleur. */
  steriles: Besoin[];
  /** Captures et effort de ce plan. */
  resume: Resume;
}

export interface Analyse {
  /** Vrai si l'objectif est deja dans l'enclos. */
  atteint: boolean;
  /** Objectifs pas encore possedes. */
  restants: CouleurId[];
  baseline?: Resume;
  candidats?: Candidat[];
  /** Nombre de couples possibles avant d'en garder les plus profonds. */
  totalCandidats?: number;
  /** Deroule par vagues, en commencant par le meilleur couple. */
  plan?: Plan;
  erreur?: string;
}
