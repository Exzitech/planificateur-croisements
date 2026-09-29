import { useCallback, useState } from "react";
import { stockageLocal } from "../storage/storage";

/** useState, mais relu et reecrit dans le stockage a chaque changement. */
export function usePersistant<T>(cle: string, defaut: T) {
  const [valeur, setValeur] = useState<T>(() => stockageLocal.lire(cle, defaut));

  const changer = useCallback(
    (suivant: T | ((precedent: T) => T)) => {
      setValeur((precedent) => {
        const v = typeof suivant === "function" ? (suivant as (p: T) => T)(precedent) : suivant;
        stockageLocal.ecrire(cle, v);
        return v;
      });
    },
    [cle],
  );

  return [valeur, changer] as const;
}
