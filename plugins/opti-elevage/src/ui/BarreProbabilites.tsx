import { hexCouleur, nomCouleur } from "../engine";
import type { Couleur, Croisement } from "../engine";

type Recettes = Record<string, [string, string]>;

const pct = (p: number) => `${(p * 100).toFixed(1).replace(".", ",")} %`;

/**
 * Ce que peut donner un accouplement, en une barre : chaque segment est une
 * couleur possible, large a proportion de sa chance.
 *
 * Les couleurs cibles sont soulignees : ce sont elles qui se partagent le
 * bonus, et voir laquelle domine explique le classement mieux qu'un chiffre.
 */
export function BarreProbabilites({
  croisement,
  couleurs,
  recettes,
}: {
  croisement: Croisement;
  couleurs: readonly Couleur[];
  recettes?: Recettes;
}) {
  const { list, cibles } = croisement;
  // Sous ce seuil, un segment devient invisible : on le laisse dans la legende.
  const visibles = list.filter((o) => o.p >= 0.005);

  return (
    <div className="dd-probas">
      <div className="dd-barre" role="img"
        aria-label={list.map((o) => `${nomCouleur(couleurs, o.couleur, recettes)} ${pct(o.p)}`).join(", ")}>
        {visibles.map((o) => (
          <span
            key={o.couleur}
            className={cibles.includes(o.couleur) ? "dd-segment dd-cible" : "dd-segment"}
            style={{ width: `${o.p * 100}%`, background: hexCouleur(couleurs, o.couleur, recettes) }}
            title={`${nomCouleur(couleurs, o.couleur, recettes)} : ${pct(o.p)}`}
          />
        ))}
      </div>
      <ul className="dd-legende">
        {list.slice(0, 6).map((o) => (
          <li key={o.couleur} className={cibles.includes(o.couleur) ? "dd-cible-texte" : undefined}>
            <span className="dd-point" style={{ background: hexCouleur(couleurs, o.couleur, recettes) }} />
            {nomCouleur(couleurs, o.couleur, recettes)} <strong>{pct(o.p)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
