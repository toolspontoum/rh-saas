"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

type SkillTag = {
  normalized: string;
  label: string;
};

type SkillTagsInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
};

function normalizeSkill(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function SkillTagsInput({
  value,
  onChange,
  placeholder = "Digite uma habilidade e pressione Enter",
  allowCreate = true
}: SkillTagsInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<SkillTag[]>([]);

  useEffect(() => {
    const query = input.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      apiFetch<SkillTag[]>(`/v1/skills/tags?query=${encodeURIComponent(query)}&limit=8`)
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions([]));
    }, 180);

    return () => clearTimeout(timeout);
  }, [input]);

  const firstSuggestion = useMemo(() => {
    const normalizedInput = normalizeSkill(input);
    if (!normalizedInput) return null;
    return suggestions.find((item) => item.normalized.startsWith(normalizedInput)) ?? suggestions[0] ?? null;
  }, [input, suggestions]);

  function commitTag(rawTag: string) {
    const normalized = normalizeSkill(rawTag);
    if (!normalized) return;

    const exists = value.includes(normalized);
    if (exists) return;

    if (!allowCreate) {
      const suggested = suggestions.find((item) => item.normalized === normalized);
      if (!suggested) return;
    }

    onChange([...value, normalized]);
    setInput("");
    setSuggestions([]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab" && firstSuggestion && input.trim().length > 0) {
      event.preventDefault();
      commitTag(firstSuggestion.label);
      return;
    }

    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (firstSuggestion && normalizeSkill(firstSuggestion.label) === normalizeSkill(input)) {
        commitTag(firstSuggestion.label);
        return;
      }
      commitTag(input);
      return;
    }

    if (event.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="skill-input-wrap stack" style={{ gap: 8 }}>
      <div className="tag-list">
        {value.map((tag) => (
          <span key={tag} className="badge">
            {tag.replace(/-/g, " ")}
            <button
              className="tag-remove"
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remover ${tag}`}
            >
              x
            </button>
          </span>
        ))}
      </div>

      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />

      {suggestions.length > 0 ? (
        <div className="suggestion-list">
          {suggestions.map((item) => (
            <button
              key={item.normalized}
              type="button"
              className="suggestion-item"
              onClick={() => commitTag(item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
