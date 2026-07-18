import { useEffect, useState } from "react";

/**
 * useState persisted to localStorage under `key`.
 * Pass `allowed` to guard against stale/invalid stored values.
 */
export function usePersistedState<T extends string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[]
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key) as T | null;
      if (stored === null) return defaultValue;
      if (allowed && !allowed.includes(stored)) return defaultValue;
      return stored;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — non-critical */
    }
  }, [key, value]);

  return [value, setValue];
}
