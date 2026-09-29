import { useState } from "react";
import type { Espece, Parametres } from "../engine";

export function Reglages({
  espece,
  parametres,
  onChange,
  recettes,
  onRecettes,
  erreurs,
}: {
  espece: Espece;
  parametres: Parametres;
  onChange: (p: Parametres) => void;
  recettes: string;
  onRecettes: (texte: string) => void;
  erreurs: string[];
}) {
  const [avances, setAvances] = useState(false);
  const nombre = (cle: keyof Parametres, v: string) => onChange({ ...parametres, [cle]: +v });

  return (
    <details className="dd-section">
      <summary><h3>Réglages</h3></summary>

      <div className="dd-ligne">
        <label>
          Chance de base
          <span className="dd-avec-unite">
            <input type="number" min={0} max={100} step={1}
              value={Math.round(parametres.p0 * 100)}
              onChange={(e) => onChange({ ...parametres, p0: +e.target.value / 100 })} />
            %
          </span>
        </label>
        <label>
          Gain par niveau
          <span className="dd-avec-unite">
            <input type="number" min={0} max={1} step={0.01}
              value={+(parametres.lv * 100).toFixed(4)}
              onChange={(e) => onChange({ ...parametres, lv: +e.target.value / 100 })} />
            % / niv.
          </span>
        </label>
        <label>
          Niveau visé
          <input type="number" min={1} max={200} value={parametres.levelPlan}
            onChange={(e) => nombre("levelPlan", e.target.value)} />
        </label>
        <label className="dd-case">
          <input type="checkbox" checked={parametres.opt > 0}
            onChange={(e) => onChange({ ...parametres, opt: e.target.checked ? 0.1 : 0 })} />
          Optimakina
        </label>
        {parametres.opt > 0 && (
          <label>
            Bonus Optimakina
            <span className="dd-avec-unite">
              <input type="number" min={0} max={100} step={1}
                value={Math.round(parametres.opt * 100)}
                onChange={(e) => onChange({ ...parametres, opt: +e.target.value / 100 })} />
              %
            </span>
          </label>
        )}
      </div>
      <p className="hint">
        Le niveau visé est celui auquel tu montes tes bêtes avant de les accoupler.
        Deux bêtes niveau {parametres.levelPlan} donnent{" "}
        {Math.round((parametres.p0 + parametres.lv * parametres.levelPlan * 2 + parametres.opt) * 100)} %.
      </p>

      <button type="button" className="btn-ghost" onClick={() => setAvances((v) => !v)}
        aria-expanded={avances}>
        {avances ? "Masquer" : "Afficher"} les réglages avancés
      </button>

      {avances && (
        <div className="dd-avances">
          <p className="dd-avertissement">
            <strong>
              Calibrés sur deux captures d'écran du jeu{espece.id !== "perruches" ? ", chez les Perruches" : ""}.
            </strong>{" "}
            Ils décident du poids des grands-parents dans la lignée d'une bête. À ajuster si tu
            observes autre chose en jeu{espece.id !== "perruches" ? " avec cette espèce" : ""}.
          </p>
          <div className="dd-ligne">
            <label>
              Poids d'un grand-parent (génération 1)
              <input type="number" min={0} max={2} step={0.05} value={parametres.gpF}
                onChange={(e) => nombre("gpF", e.target.value)} />
            </label>
            <label>
              Baisse par génération
              <input type="number" min={0} max={1} step={0.005} value={parametres.gpDecay}
                onChange={(e) => nombre("gpDecay", e.target.value)} />
            </label>
          </div>
        </div>
      )}

      <h4>Recettes</h4>
      <textarea className="dd-recettes" rows={10} value={recettes} spellCheck={false}
        onChange={(e) => onRecettes(e.target.value)}
        aria-label="Recettes, une par ligne, au format enfant = a + b" />
      {erreurs.length > 0 && (
        <ul className="dd-erreurs">
          {erreurs.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <button type="button" className="btn-ghost" onClick={() => onRecettes(espece.recettesDefaut)}>
        Rétablir les recettes
      </button>
    </details>
  );
}
