"use client";
import { useRef, useState, useCallback } from "react";

/**
 * Protège contre le double-clic : ignore tout appel pendant qu'une soumission est en cours.
 * Retourne [submit, loading] où submit est la version protégée de fn.
 */
export function useSubmit<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): [(...args: T) => Promise<void>, boolean] {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const submit = useCallback(
    async (...args: T) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        await fn(...args);
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [fn]
  );

  return [submit, loading];
}
