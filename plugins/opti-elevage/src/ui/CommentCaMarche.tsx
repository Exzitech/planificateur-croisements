/**
 * Les limites du modele, dites franchement : l'outil donne des ordres de
 * grandeur, et l'utilisateur doit savoir sur quoi ils reposent.
 */
export function CommentCaMarche() {
  return (
    <details className="dd-section dd-explications">
      <summary><h3>Comment ça marche</h3></summary>

      <p>
        L'outil rejoue des milliers de parties depuis ton enclos, en suivant une stratégie
        simple : cloner si possible, sinon capturer une couleur de base, sinon fabriquer les
        deux parents et les accoupler. Il en tire le nombre de captures à prévoir, puis
        compare les accouplements possibles en forçant chacun en ouverture.
      </p>
      <p>
        La comparaison des couples utilise les <strong>mêmes tirages aléatoires</strong> pour
        tous : l'écart mesuré vient du couple, pas de la chance.
      </p>

      <h4>Ce qui est vérifié</h4>
      <ul>
        <li>
          Le calcul des probabilités reproduit deux captures de l'interface du jeu (Cannelle ×
          Citron avec lignée, Cerise × Menthe), au centième de pourcent.
        </li>
        <li>La recette Menthe = Nacre lagon + Nacre cerise est confirmée en jeu.</li>
      </ul>

      <h4>Ce qui ne l'est pas</h4>
      <ul>
        <li>
          <strong>Les grands-parents cachés</strong> : le jeu n'affiche que les parents d'une
          bête. Si leurs propres parents comptent aussi, l'outil ne peut pas les
          connaître, et la chance affichée pour une bête née d'un accouplement peut
          s'écarter de celle du jeu. Vérifie-la dans l'écran d'accouplement avant de te
          fier au classement.
        </li>
        <li>
          <strong>Le poids des grands-parents</strong> est mesuré en génération 1 (0,6 fois
          celui du parent) et en génération 9 (0,13 fois) ; entre les deux, il est interpolé.
        </li>
        <li>
          <strong>Les autres recettes</strong> viennent d'une image, pas du jeu. L'éditeur de
          recettes est là pour les corriger.
        </li>
        <li>
          <strong>Le bonus partagé</strong> entre plusieurs couleurs de même génération est
          supposé réparti à parts égales.
        </li>
        <li>
          <strong>Les clones</strong> : on suppose qu'ils héritent de la lignée du stérile
          dont ils prennent la couleur, et repartent niveau 1. Deux stériles de même couleur et de
          même sexe donnent un clone identique : c'est ce que l'appli conseille. La simulation, elle,
          suppose un sexe tiré au hasard, donc elle est prudente sur les clones.
        </li>
      </ul>

      <p className="hint">
        Les nombres de captures sont des moyennes. La colonne « prudent » donne la valeur
        dépassée seulement une fois sur dix : c'est elle qu'il faut regarder pour ne pas être
        pris de court.
      </p>
    </details>
  );
}
