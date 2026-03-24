"use client";

import { useEffect, useState } from "react";

export function useSavedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      setValue(JSON.parse(raw) as T);
    } catch {
      // ignore invalid storage
    }
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage failures
    }
  }, [key, value]);

  return [value, setValue] as const;
}

