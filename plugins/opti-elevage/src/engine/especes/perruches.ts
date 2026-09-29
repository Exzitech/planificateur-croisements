import type { Couleur } from "../types";
import type { EspeceBrute } from "./types";

/** Les 21 couleurs du jeu, dans l'ordre des generations. */
const COULEURS: readonly Couleur[] = [
  { id: "R", nom: "Rousse", hex: "#E07B24" },
  { id: "D", nom: "Dorée", hex: "#E4BE1A" },
  { id: "A", nom: "Amande", hex: "#E6D8B4" },
  { id: "DR", nom: "Dorée rousse", hex: "#E9A02E" },
  { id: "AD", nom: "Amande dorée", hex: "#DCC77E" },
  { id: "AR", nom: "Amande rousse", hex: "#D9A16E" },
  { id: "Eb", nom: "Ébène", hex: "#2B2320" },
  { id: "In", nom: "Indigo", hex: "#4D2E93" },
  { id: "EI", nom: "Ébène indigo", hex: "#2F2352" },
  { id: "O", nom: "Orchidée", hex: "#D3A0E0" },
  { id: "P", nom: "Pourpre", hex: "#C2183F" },
  { id: "EO", nom: "Ébène orchidée", hex: "#B45FCE" },
  { id: "OP", nom: "Orchidée pourpre", hex: "#A63B86" },
  { id: "InP", nom: "Indigo pourpre", hex: "#6E2A9E" },
  { id: "T", nom: "Turquoise", hex: "#2EC4BF" },
  { id: "I", nom: "Ivoire", hex: "#F1EDE4" },
  { id: "TO", nom: "Turquoise orchidée", hex: "#5CC9D6" },
  { id: "IT", nom: "Ivoire turquoise", hex: "#BFE6E0" },
  { id: "IvP", nom: "Ivoire pourpre", hex: "#E9A7B6" },
  { id: "Pr", nom: "Prune", hex: "#B98BD0" },
  { id: "Em", nom: "Émeraude", hex: "#31BD4E" },
];

/**
 * Recettes par defaut, lues sur une image du jeu.
 *
 * Seul « Em = IT + IvP » est confirme par une capture d'ecran : le reste est a
 * verifier en jeu, d'ou l'editeur de recettes dans les reglages.
 */
const RECETTES_DEFAUT = `DR = R + D
AD = D + A
AR = A + R
Eb = DR + AD
In = AD + AR
EI = Eb + In
O = DR + EI
P = EI + AR
EO = Eb + O
OP = O + P
InP = In + P
T = EO + OP
I = OP + InP
TO = T + O
IT = T + I
IvP = I + P
Pr = TO + IT
Em = IT + IvP`;

export const perruches: EspeceBrute = {
  id: "perruches",
  nom: "Perruches",
  emoji: "🦜",
  couleurs: COULEURS,
  /** Les couleurs simples : celles qui ont un nom propre, hors bicolores intermediaires. */
  couleursSimples: ["R", "D", "A", "Eb", "In", "O", "P", "T", "I", "Pr", "Em"],
  capturables: ["R", "D", "A"],
  recettesDefaut: RECETTES_DEFAUT,
  objectifDefaut: { type: "gen10", base: "Em", partenaire: "R" },
};
