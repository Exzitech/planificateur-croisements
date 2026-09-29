# Opti Elevage

Plugin [ExziHub](../../README.md) : planificateur d'élevage de bêtes à
couleurs (oiseaux fictifs) — Perruches, Canaris, Pinsons, un onglet par espèce.
À partir de ton enclos, il dit **quels couples accoupler**, **quelles
paires de stériles cloner** et **combien de bêtes de base capturer** pour
atteindre la génération visée.

100 % côté client : aucun moteur, aucun appel réseau.

## Utilisation

1. **Espèce** : un onglet par espèce, en haut de l'écran. Chacune a son propre
   enclos, objectif, recettes et réglages (stockage séparé) : changer d'onglet
   ne perd rien.
2. **Vues** : une deuxième rangée d'onglets découpe l'écran — **Accoupler**
   (les 5 meilleurs couples, vue par défaut), **Cloner** (les paires de
   stériles clonables), **Captures & plan**, **Enclos** (objectif et bêtes)
   et **Réglages**. Le bouton **Analyser** et
   l'objectif restent visibles quelle que soit la vue. L'onglet ouvert est
   retenu sur cette machine.
3. **Objectif** : une couleur simple, ou une bicolore « X et Y » — deux
   couleurs simples au choix, dans n'importe quel ordre. Un partenaire de
   couleur de base est le moins cher : il se capture au lieu de se fabriquer.
4. **Enclos** : ajoute tes bêtes. Pour un enclos déjà garni, la **saisie
   rapide** remplit une grille couleur × sexe × état en une fois.
   **Exporter** télécharge l'enclos actuel dans un fichier JSON ; **Importer**
   le recharge depuis ce fichier (utile avant une manip risquée, ou pour
   passer d'un ordinateur à l'autre — les données ne sont que dans le
   `localStorage` du navigateur, propre à cette machine). **Données de test**
   remplit l'enclos avec des couleurs de base, pour essayer l'écran sans tout
   ressaisir à la main.
5. **Analyser**. Quatre réponses : à accoupler (les 5 meilleurs couples), le plan par génération, à
   cloner, à capturer.
6. Au moment d'accoupler, renseigne les **niveaux réels** des deux parents
   (facultatif) : les probabilités se recalculent aussitôt. « Recalculer le
   classement » les enregistre et rejoue les simulations.
7. **Ignorer les lignées** (case en haut de l'onglet Accoupler) : les bêtes
   d'une même couleur et d'un même sexe deviennent interchangeables — plus
   besoin de retrouver en jeu celle qui a la bonne lignée. Les lignées déjà
   saisies sont ignorées (jamais effacées), les bébés naissent sans lignée et
   les couples en double disparaissent de la liste. En échange, les chances
   affichées ne tiennent plus compte des grands-parents.
8. Au moment d'enregistrer le bébé, la liste ne montre que les couleurs que ce
   croisement peut donner. Coche **Autre couleur** pour choisir dans tout le
   catalogue (toutes générations) : le jeu donne parfois un résultat que la
   règle ne prévoit pas.
9. **Cloner par lot** : chaque ligne de l'onglet Cloner a un nombre, rempli
   avec tout ce qui est possible. « J'ai cloné ×4 » consomme 8 stériles et
   ajoute 4 clones d'un coup ; s'il reste un stérile dépareillé, il est laissé
   en place.
10. **Annuler la dernière saisie** : le bouton est en haut des onglets Accoupler
   et Cloner (et dans l'enclos) — un clic de trop sur « J'ai cloné » se répare
   sans ressaisir l'enclos. L'analyse se relance sur l'état revenu.
11. « J'ai fait cet accouplement » / « J'ai cloné » mettent l'enclos à jour et
   relancent l’analyse toute seule, sans quitter l’onglet où tu es : les
   accouplements s'enchaînent. Les modifications s'affichent tout de suite et
   partent sur Nextcloud après un court silence (regroupées), au lieu d'un
   aller-retour réseau par clic.

Sans niveau renseigné, tout compte au **niveau visé** (60 par défaut) : c'est
le niveau auquel tu montes tes bêtes avant de les accoupler. Un niveau
saisi en dessous ne fait rien baisser, pour la même raison.

## Les espèces

Chaque espèce a ses propres monocolores et son propre arbre de recettes
(`src/engine/especes/`). La règle des bicolores est commune aux trois :
croiser deux monocolores, de n'importe quelle génération, donne la bicolore
« A et B », de génération max(A, B) + 1 — c'est ce qui alimente le choix
d'objectif « bicolore » et le catalogue de couleurs de l'enclos.

**Perruches** : calibrée sur le jeu (voir « Le modèle » ci-dessous), avec
des bicolores intermédiaires nommées (Dorée rousse, Ébène indigo...).

**Canaris et Pinsons** : ajoutées sans accès direct au jeu, à partir d'une
description des monocolores et de leurs recettes de génération 3 et plus.
Points non vérifiés :
- Quand plusieurs recettes différentes sont valables pour une même couleur
  (cas fréquent : voir les tableaux fournis), une seule est retenue par
  défaut, comme pour les recettes Perruches — à corriger dans l'éditeur de
  recettes des réglages si elle est fausse en jeu.
- Les hex des 4 couleurs de génération 9 propres à chaque espèce (Ambre,
  Corail, Azur, Aigue-marine pour les Canaris ; Jade, Rubis, Saphir, Améthyste
  pour les Pinsons) sont choisis arbitrairement, faute de référence.
- Les paramètres de chance (`p0`, `lv`, poids des grands-parents...) sont
  ceux mesurés sur les Perruches : rien n'indique qu'ils valent aussi pour
  ces deux espèces.

## Le modèle

`P = p0 + lv × (niveau X + niveau Y) + Optimakina`.

Chaque parent apporte une **lignée** : sa couleur (poids 1) et celles de ses deux
parents (poids `r` chacune, `r` décroissant avec sa génération). Chaque parent pèse
la moitié du résultat. Avec la chance `P`, le bébé croise une couleur de la lignée
du père avec une couleur de celle de la mère (celles qui forment une recette, poids
= produit des deux) ; sinon il reprend une couleur de l'un des deux parents.

**Vérifié** : deux captures de l'interface du jeu sont reproduites au centième de
pourcent (Rousse niv. 65 de Amande + Rousse × Dorée niv. 55 ; Pourpre niv. 200 ×
Émeraude niv. 1), voir `tests/croisement.test.ts`.

**Non vérifié** : `r` est mesuré en génération 1 (0,6) et 9 (0,1335) ; entre les
deux il est interpolé. Les recettes viennent d'une image, sauf Émeraude = Ivoire
turquoise + Ivoire pourpre, confirmée en jeu. Tout est modifiable dans les
réglages, et l'écran « Comment ça marche » le dit à l'utilisateur.

**Limite connue** : le jeu n'affiche que les parents d'une perruche, pas ses
grands-parents. Si ceux-ci pèsent aussi dans le calcul, l'outil ne les connaît pas :
une Dorée de « Dorée + Amande » donne dans le jeu 37 % Dorée / 63 % Amande côté
lignée, là où l'outil en prévoit 73 % / 27 %. L'estimation est donc approximative
pour une perruche issue d'un accouplement, et exacte pour une capturée.

## Développement

```
npm run dev     le plugin seul dans le navigateur, avec HMR
npm run test    Vitest, en watch
npm run build   compile dans hub/plugins/opti-elevage/
```

`src/engine/` est du TypeScript pur, sans React ni DOM : c'est là qu'est toute
la logique, et c'est ce que couvrent les tests. L'analyse tourne dans un Web
Worker (`src/worker/`), embarqué en base64 dans le bundle — un plugin est
injecté dans la page du hub, il ne peut pas charger de fichier annexe.

### À savoir

Le résultat d'une partie dépend de l'**ordre exact des appels au générateur
aléatoire** : deux implémentations qui calculent les mêmes probabilités mais tirent
dans un ordre différent donnent des simulations différentes. Il n'y a plus de test
de fidélité à un moteur d'origine (le modèle a changé avec la seconde capture) ;
`tests/simulation.test.ts` garde des bornes mesurées sur le modèle actuel, pour
signaler qu'un changement du moteur déplace les résultats.
