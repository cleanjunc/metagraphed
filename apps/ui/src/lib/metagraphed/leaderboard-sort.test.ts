import { describe, it, expect } from "vitest";
import { withRank, sortRanked } from "./leaderboard-sort";

const board = [
  { netuid: 1, weight_sets: 100, per_setter: 2.5 },
  { netuid: 2, weight_sets: 50, per_setter: null },
  { netuid: 3, weight_sets: 75, per_setter: 1.5 },
];

describe("withRank", () => {
  it("stamps the API's delivery order as the rank", () => {
    expect(withRank(board).map((r) => [r.netuid, r.rank])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("does not mutate the source rows", () => {
    const rows = [{ netuid: 9 }];
    withRank(rows);
    expect(rows[0]).not.toHaveProperty("rank");
  });
});

describe("sortRanked", () => {
  const ranked = withRank(board);

  it("sorts descending by a numeric column", () => {
    expect(sortRanked(ranked, (r) => r.weight_sets, "desc").map((r) => r.netuid)).toEqual([
      1, 3, 2,
    ]);
  });

  it("sorts ascending by a numeric column", () => {
    expect(sortRanked(ranked, (r) => r.weight_sets, "asc").map((r) => r.netuid)).toEqual([2, 3, 1]);
  });

  it("keeps the API rank on the row when re-sorted (Rank column stays truthful)", () => {
    const byWeight = sortRanked(ranked, (r) => r.weight_sets, "asc");
    expect(byWeight.map((r) => r.rank)).toEqual([2, 3, 1]);
  });

  it("sorts rows with no value last in BOTH directions", () => {
    expect(sortRanked(ranked, (r) => r.per_setter, "desc").map((r) => r.netuid)).toEqual([1, 3, 2]);
    // netuid 2 has a null metric — ascending must not float it to the top as if
    // it were the smallest value.
    expect(sortRanked(ranked, (r) => r.per_setter, "asc").map((r) => r.netuid)).toEqual([3, 1, 2]);
  });

  it("treats a non-finite number as missing, not as a value", () => {
    const rows = withRank([{ v: 1 }, { v: Number.NaN }, { v: 3 }]);
    expect(sortRanked(rows, (r) => r.v, "desc").map((r) => r.rank)).toEqual([3, 1, 2]);
  });

  it("breaks ties by the API rank, so the order is stable and total", () => {
    const rows = withRank([{ v: 5 }, { v: 5 }, { v: 5 }]);
    expect(sortRanked(rows, (r) => r.v, "desc").map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(sortRanked(rows, (r) => r.v, "asc").map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("sorts strings alphabetically", () => {
    const rows = withRank([{ name: "Zeus" }, { name: "Apex" }, { name: "Mars" }]);
    expect(sortRanked(rows, (r) => r.name, "asc").map((r) => r.name)).toEqual([
      "Apex",
      "Mars",
      "Zeus",
    ]);
  });

  it("does not mutate the input array", () => {
    const before = ranked.map((r) => r.netuid);
    sortRanked(ranked, (r) => r.weight_sets, "asc");
    expect(ranked.map((r) => r.netuid)).toEqual(before);
  });
});
