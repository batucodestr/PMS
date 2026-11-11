import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/**
 * Client-side sort + pagination. Swap for server-driven params when the
 * Django REST API (ordering / page) is wired up.
 */
export function useSortedPage<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number>,
  pageSize = 10,
  initial?: { key: string; dir: SortDir },
) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    initial ?? null,
  );
  const [pageRaw, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const get = accessors[sort.key];
    if (!get) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
    // accessors is a stable module-level object by convention
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(pageRaw, pageCount);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  return {
    pageRows,
    page,
    pageCount,
    total: sorted.length,
    pageSize,
    setPage,
    sort,
    toggleSort,
  };
}
