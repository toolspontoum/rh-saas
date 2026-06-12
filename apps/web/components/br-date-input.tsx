"use client";

import { useEffect, useState } from "react";

import { formatDateBr, isoToDateBr, parseDateBrToIso } from "../lib/date-br";

type BrDateInputProps = {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
};

export function BrDateInput({
  value,
  onChange,
  min,
  max,
  placeholder = "dd/mm/aaaa"
}: BrDateInputProps) {
  const [text, setText] = useState(() => isoToDateBr(value));

  useEffect(() => {
    setText(isoToDateBr(value));
  }, [value]);

  function commit(raw: string) {
    const iso = parseDateBrToIso(raw);
    if (!iso || (min && iso < min) || (max && iso > max)) {
      setText(isoToDateBr(value));
      return;
    }
    onChange(iso);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(formatDateBr(e.target.value))}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}
