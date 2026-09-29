/**
 * L'analyse tourne ici : quelques milliers de parties simulees figeraient
 * l'interface si elles s'executaient sur le fil principal.
 *
 * Tout ce qui transite est du JSON simple (structuredClone) : le moteur ne
 * manipule ni fonctions ni classes, donc rien a serialiser a la main.
 */
import { analyser } from "../engine";
import type { Analyse, Config, CouleurId, Groupe, OptionsAnalyse } from "../engine";

export interface DemandeAnalyse {
  groupes: Groupe[];
  objectifs: CouleurId[];
  cfg: Config;
  options?: OptionsAnalyse;
}

self.onmessage = (e: MessageEvent<DemandeAnalyse>) => {
  const { groupes, objectifs, cfg, options } = e.data;
  let reponse: Analyse;
  try {
    reponse = analyser(groupes, objectifs, cfg, options);
  } catch (err) {
    reponse = { atteint: false, restants: objectifs, erreur: String(err) };
  }
  (self as unknown as Worker).postMessage(reponse);
};
