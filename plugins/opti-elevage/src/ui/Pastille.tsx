import { hexCouleur, nomCouleur } from "../engine";
import type { Couleur, CouleurId } from "../engine";

type Recettes = Record<string, [string, string]>;

/** Pastille de couleur + nom, l'element de base de tout l'ecran. */
export function Pastille({
  couleur,
  couleurs,
  recettes,
  compact = false,
}: {
  couleur: CouleurId;
  couleurs: readonly Couleur[];
  recettes?: Recettes;
  compact?: boolean;
}) {
  const nom = nomCouleur(couleurs, couleur, recettes);
  return (
    <span className="dd-pastille" title={nom}>
      <span className="dd-point" style={{ background: hexCouleur(couleurs, couleur, recettes) }} />
      {!compact && <span>{nom}</span>}
    </span>
  );
}

/** Le symbole du sexe, lisible sans couleur. */
export function Sexe({ sexe }: { sexe: 0 | 1 }) {
  return (
    <span className={sexe === 0 ? "dd-sexe dd-male" : "dd-sexe dd-femelle"}>
      {sexe === 0 ? "♂" : "♀"}
    </span>
  );
}
