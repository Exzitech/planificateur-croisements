import { useCallback, useEffect, useRef, useState } from "react";
import Worker from "./analyse.worker?worker&inline";
import type { DemandeAnalyse } from "./analyse.worker";
import type { Analyse } from "../engine";

/**
 * Lance l'analyse dans un worker, avec annulation.
 *
 * Annuler = terminer le worker : la simulation est une longue boucle
 * synchrone, elle ne peut pas s'interrompre d'elle-meme. Le suivant est cree
 * a la demande.
 *
 * `?worker&inline` embarque le worker en base64 dans le bundle : un plugin est
 * injecte dans la page du hub, il ne peut pas charger de fichier annexe.
 */
export function useAnalyse() {
  const workerRef = useRef<globalThis.Worker | null>(null);
  const [resultat, setResultat] = useState<Analyse | null>(null);
  const [enCours, setEnCours] = useState(false);

  const arreter = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setEnCours(false);
  }, []);

  // Ne pas laisser un worker tourner apres la fermeture de l'ecran.
  useEffect(() => arreter, [arreter]);

  const lancer = useCallback(
    (demande: DemandeAnalyse) => {
      workerRef.current?.terminate();
      const w = new Worker();
      workerRef.current = w;
      setEnCours(true);
      w.onmessage = (e: MessageEvent<Analyse>) => {
        // Un worker deja remplace ne doit pas ecraser un resultat plus recent.
        if (workerRef.current !== w) return;
        setResultat(e.data);
        setEnCours(false);
        w.terminate();
        workerRef.current = null;
      };
      w.onerror = (e) => {
        if (workerRef.current !== w) return;
        setResultat({ atteint: false, restants: demande.objectifs, erreur: e.message });
        setEnCours(false);
        workerRef.current = null;
      };
      w.postMessage(demande);
    },
    [],
  );

  return { resultat, enCours, lancer, arreter, oublier: () => setResultat(null) };
}
