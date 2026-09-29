import type { Couleur } from "../types";
import type { EspeceBrute } from "./types";

/**
 * Les 15 monocolores des Pinsons, dans l'ordre des generations.
 *
 * Couleurs partagees avec les Perruches/Canaris : meme hex. Les 4 de
 * generation 9 (Jade, Rubis, Saphir, Améthyste) n'existent que chez les
 * Pinsons : hex choisi arbitrairement, a verifier en jeu.
 */
const COULEURS: readonly Couleur[] = [
  { id: "Eb", nom: "Ardoise", hex: "#2B2320" },
  { id: "In", nom: "Nuit", hex: "#4D2E93" },
  { id: "Po", nom: "Cerise", hex: "#C2183F" },
  { id: "Or", nom: "Lilas", hex: "#D3A0E0" },
  { id: "Ro", nom: "Cannelle", hex: "#E07B24" },
  { id: "Am", nom: "Sable", hex: "#E6D8B4" },
  { id: "Iv", nom: "Nacre", hex: "#F1EDE4" },
  { id: "Tu", nom: "Lagon", hex: "#2EC4BF" },
  { id: "Pr", nom: "Figue", hex: "#B98BD0" },
  { id: "Em", nom: "Menthe", hex: "#31BD4E" },
  { id: "Do", nom: "Citron", hex: "#E4BE1A" },
  { id: "Ja", nom: "Jade", hex: "#29A876" },
  { id: "Ru", nom: "Rubis", hex: "#9E1030" },
  { id: "Sa", nom: "Saphir", hex: "#2F5FA8" },
  { id: "Ay", nom: "Améthyste", hex: "#7A4FC2" },
];

/**
 * Meme regle de bicolore que les Canaris (croiser deux monocolores donne
 * « A et B », generation max(A, B) + 1), avec un arbre de recettes different
 * pour les monocolores de generation 3 et plus. Chaque recette ici n'est
 * qu'UNE des plusieurs combinaisons valables selon le jeu : a verifier,
 * modifiable dans les reglages.
 */
const RECETTES_DEFAUT = `EbPo = Eb + Po
InPo = In + Po
Ro = EbPo + InPo
EbIn = Eb + In
EbOr = Eb + Or
Am = EbIn + EbOr
InOr = In + Or
Iv = InOr + InPo
PoOr = Po + Or
Tu = PoOr + EbOr
RoAm = Ro + Am
PoAm = Po + Am
Pr = RoAm + PoAm
IvTu = Iv + Tu
PoIv = Po + Iv
Em = IvTu + PoIv
PoPr = Po + Pr
RoEm = Ro + Em
Do = PoPr + RoEm
PoDo = Po + Do
PrEm = Pr + Em
Ja = PoDo + PrEm
OrDo = Or + Do
Ru = OrDo + PrEm
InDo = In + Do
Sa = InDo + PrEm
EbDo = Eb + Do
Ay = EbDo + PrEm`;

export const pinsons: EspeceBrute = {
  id: "pinsons",
  nom: "Pinsons",
  emoji: "🐦",
  couleurs: COULEURS,
  couleursSimples: ["Eb", "In", "Po", "Or", "Ro", "Am", "Iv", "Tu", "Pr", "Em", "Do", "Ja", "Ru", "Sa", "Ay"],
  capturables: ["Eb", "In", "Po", "Or"],
  recettesDefaut: RECETTES_DEFAUT,
  objectifDefaut: { type: "gen10", base: "Ja", partenaire: "Eb" },
};
