/**
 * Client-side ranked-list sorting for the /leaderboards boards (#5344).
 *
 * The boards arrive already ranked by their primary metric and are delivered
 * whole (no cursor), so re-sorting them is a pure view concern — unlike
 * /validators, whose ranking is a server-side query over a top-N slice and so
 * cannot be reordered client-side without changing what the rows mean.
 */

export type SortOrder = "asc" | "desc";

/** A board row carrying the API's own ranking, pinned before any re-sort. */
export interface RankedRow {
  rank: number;
}

/**
 * Stamp each row with the rank implied by the order the API delivered it in.
 *
 * The Rank column has to keep reporting the board's ranking, not the row's
 * current display position — otherwise sorting by a secondary metric would
 * relabel the #1 subnet as #7 and quietly destroy the only piece of information
 * the board exists to convey.
 */
export function withRank<T>(rows: readonly T[]): Array<T & RankedRow> {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Sort ranked rows by one column's value.
 *
 * Two deliberate properties:
 * - **Null-last in both directions.** A subnet with no `sets_per_setter` is
 *   "unknown", not "lowest" — floating it to the top of an ascending sort would
 *   read as a real ranking. Absent values stay at the bottom either way.
 * - **Ties break by the API's rank**, so the sort is total and stable: equal
 *   values keep the board's own ordering instead of the engine's arbitrary one.
 */
export function sortRanked<T extends RankedRow>(
  rows: readonly T[],
  value: (row: T) => number | string | null | undefined,
  order: SortOrder,
): T[] {
  const dir = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const aMissing = av == null || (typeof av === "number" && !Number.isFinite(av));
    const bMissing = bv == null || (typeof bv === "number" && !Number.isFinite(bv));
    if (aMissing && bMissing) return a.rank - b.rank;
    if (aMissing) return 1;
    if (bMissing) return -1;
    const cmp =
      typeof av === "string" || typeof bv === "string"
        ? String(av).localeCompare(String(bv))
        : (av as number) - (bv as number);
    return cmp !== 0 ? Math.sign(cmp) * dir : a.rank - b.rank;
  });
}
