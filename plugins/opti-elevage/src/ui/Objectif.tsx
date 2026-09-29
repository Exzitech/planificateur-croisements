import type { CouleurId, Espece, Objectif as ObjectifType } from "../engine";
import { Pastille } from "./Pastille";

export function Objectif({
  espece,
  objectif,
  onChange,
}: {
  espece: Espece;
  objectif: ObjectifType;
  onChange: (o: ObjectifType) => void;
}) {
  const gen10 = objectif.type === "gen10";
  const { couleursSimples } = espece;
  const nom = (id: CouleurId) => espece.affichage.couleurParId(id)?.nom;

  const basculerGen9 = (c: CouleurId) => {
    const actuelles = objectif.type === "gen9" ? objectif.couleurs : [];
    const suivantes = actuelles.includes(c)
      ? actuelles.filter((x) => x !== c)
      : [...actuelles, c];
    onChange({ type: "gen9", couleurs: suivantes.length ? suivantes : [c] });
  };

  return (
    <section className="dd-section">
      <h3>Objectif</h3>
      <div className="dd-onglets" role="group" aria-label="Type d'objectif">
        <button
          type="button"
          aria-pressed={gen10}
          className={gen10 ? "btn-primary" : undefined}
          onClick={() => onChange(espece.objectifDefaut.type === "gen10"
            ? espece.objectifDefaut
            : { type: "gen10", base: couleursSimples[couleursSimples.length - 1], partenaire: couleursSimples[0] })}
        >
          Bicolore
        </button>
        <button
          type="button"
          aria-pressed={!gen10}
          className={!gen10 ? "btn-primary" : undefined}
          onClick={() => onChange({ type: "gen9", couleurs: [couleursSimples[couleursSimples.length - 1]] })}
        >
          Couleur simple
        </button>
      </div>

      {gen10 ? (
        <div className="dd-ligne">
          <label>
            Base
            <select
              value={objectif.base}
              onChange={(e) =>
                onChange({
                  ...objectif,
                  base: e.target.value,
                  partenaire:
                    objectif.partenaire === e.target.value ? objectif.base : objectif.partenaire,
                })
              }
            >
              {couleursSimples.map((c) => (
                <option key={c} value={c}>
                  {nom(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Partenaire
            <select
              value={objectif.partenaire}
              onChange={(e) => onChange({ ...objectif, partenaire: e.target.value })}
            >
              {couleursSimples.filter((c) => c !== objectif.base).map((c) => (
                <option key={c} value={c}>
                  {nom(c)}
                </option>
              ))}
            </select>
          </label>
          <span className="dd-resultat-objectif">
            → <strong>{espece.libelleObjectif(objectif)}</strong>
          </span>
        </div>
      ) : (
        <div className="dd-ligne">
          {couleursSimples.map((c) => {
            const choisi = objectif.type === "gen9" && objectif.couleurs.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={choisi}
                className={choisi ? "btn-primary" : undefined}
                onClick={() => basculerGen9(c)}
              >
                <Pastille couleur={c} couleurs={espece.couleurs} />
              </button>
            );
          })}
        </div>
      )}

      {gen10 && (
        <p className="hint">
          Deux couleurs simples au choix, dans n'importe quel ordre. Un partenaire de
          couleur de base est le moins cher : il se capture, au lieu de se fabriquer.
        </p>
      )}
    </section>
  );
}
