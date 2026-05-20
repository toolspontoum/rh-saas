"use client";

import type { SortDirection } from "../lib/table-sort";

type SortableThProps<K extends string> = {
  label: string;
  column: K;
  sortColumn: K;
  sortDirection: SortDirection;
  onSort: (column: K) => void;
  sortable?: boolean;
};

export function SortableTh<K extends string>({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  sortable = true
}: SortableThProps<K>) {
  if (!sortable) {
    return <th>{label}</th>;
  }

  const active = sortColumn === column;
  const indicator = active ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  return (
    <th>
      <button
        type="button"
        className="table-sort-btn"
        aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => onSort(column)}
      >
        {label}
        <span className="table-sort-indicator" aria-hidden>
          {indicator || " ⇅"}
        </span>
      </button>
    </th>
  );
}
