import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type TableSortState<K extends string> = {
  column: K;
  direction: SortDirection;
};

export type SortableValue = string | number | null | undefined;

export function nextTableSort<K extends string>(current: TableSortState<K>, column: K): TableSortState<K> {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

export function compareSortableValues(a: SortableValue, b: SortableValue): number {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base", numeric: true });
}

export function sortByColumn<T, K extends string>(
  rows: readonly T[],
  state: TableSortState<K>,
  getters: Record<K, (row: T) => SortableValue>
): T[] {
  const getter = getters[state.column];
  if (!getter) return [...rows];
  const dir = state.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => compareSortableValues(getter(left), getter(right)) * dir);
}

export function useTableSort<T, K extends string>(
  rows: readonly T[],
  getters: Record<K, (row: T) => SortableValue>,
  defaultColumn: K
) {
  const [sort, setSort] = useState<TableSortState<K>>({ column: defaultColumn, direction: "asc" });

  const toggleSort = useCallback((column: K) => {
    setSort((current) => nextTableSort(current, column));
  }, []);

  const sortedRows = useMemo(() => sortByColumn(rows, sort, getters), [rows, sort, getters]);

  return { sort, toggleSort, sortedRows };
}
