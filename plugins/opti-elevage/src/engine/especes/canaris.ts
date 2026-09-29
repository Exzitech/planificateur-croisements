import type { Couleur } from "../types";
import type { EspeceBrute } from "./types";

/**
 * Les 15 monocolores des Canaris, dans l'ordre des generations.
 *
 * Couleurs de generation 1 a partager avec les Perruches : meme hex, meme
 * palette cosmetique du jeu. Les 4 de generation 9 (Ambre, Corail, Azur,
 * Aigue-marine) n'existent que chez les Canaris : hex choisi arbitrairement,
 * a verifier en jeu.
 */
const COULEURS: readonly Couleur[] = [
  { id: "Eb", nom: "Ébène", hex: "#2B2320" },
  { id: "In", nom: "Indigo", hex: "#4D2E93" },
  { id: "Po", nom: "Pourpre", hex: "#C2183F" },
  { id: "Or", nom: "Orchidée", hex: "#D3A0E0" },
  { id: "Do", nom: "Doré", hex: "#E4BE1A" },
  { id: "Ro", nom: "Roux", hex: "#E07B24" },
  { id: "Am", nom: "Amande", hex: "#E6D8B4" },
  { id: "Iv", nom: "Ivoire", hex: "#F1EDE4" },
  { id: "Tu", nom: "Turquoise", hex: "#2EC4BF" },
  { id: "Pr", nom: "Prune", hex: "#B98BD0" },
  { id: "Em", nom: "Émeraude", hex: "#31BD4E" },
  { id: "Ab", nom: "Ambre", hex: "#C68A1E" },
  { id: "Co", nom: "Corail", hex: "#FF6F59" },
  { id: "Az", nom: "Azur", hex: "#2E7FE0" },
  { id: "Ag", nom: "Aigue-marine", hex: "#6FE0D6" },
];

/**
 * Recette d'une bicolore « A et B » : croiser un monocolore A avec un
 * monocolore B, de n'importe quelle generation, donne la bicolore de
 * generation max(A, B) + 1. Regle deduite des tableaux du jeu, pas ecrite
 * telle quelle dans une source — voir le README pour les captures utilisees.
 *
 * Seuls les monocolores de generation 3 et plus ont une recette propre ;
 * chacune n'a ici qu'UN des plusieurs croisements possibles listes par le
 * jeu (ex. Roux : 6 combinaisons valables, une seule retenue) : a verifier
 * en jeu, et modifiable dans les reglages comme pour les Perruches.
 */
const RECETTES_DEFAUT = `PoDo = Po + Do
OrDo = Or + Do
Ro = PoDo + OrDo
InPo = In + Po
EbOr = Eb + Or
Am = InPo + EbOr
DoRo = Do + Ro
EbAm = Eb + Am
Iv = DoRo + EbAm
DoAm = Do + Am
EbRo = Eb + Ro
Tu = DoAm + EbRo
EbIv = Eb + Iv
PoTu = Po + Tu
Pr = EbIv + PoTu
IvTu = Iv + Tu
DoTu = Do + Tu
Em = IvTu + DoTu
PoEm = Po + Em
RoEm = Ro + Em
Ab = PoEm + RoEm
PoPr = Po + Pr
RoPr = Ro + Pr
Co = PoPr + RoPr
Az = PoEm + RoPr
Ag = PoPr + RoEm`;

export const canaris: EspeceBrute = {
  id: "canaris",
  nom: "Canaris",
  emoji: "🐤",
  couleurs: COULEURS,
  couleursSimples: ["Eb", "In", "Po", "Or", "Do", "Ro", "Am", "Iv", "Tu", "Pr", "Em", "Ab", "Co", "Az", "Ag"],
  capturables: ["Eb", "In", "Po", "Or", "Do"],
  recettesDefaut: RECETTES_DEFAUT,
  objectifDefaut: { type: "gen10", base: "Ab", partenaire: "Eb" },
};
