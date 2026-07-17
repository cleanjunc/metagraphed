import { describe, it, expect } from "vitest";
import { VALIDATOR_COLUMNS } from "./validator-columns";
import type { GlobalValidator, GlobalValidatorSort } from "@/lib/metagraphed/types";

// A fully-populated row so every column's cell renderer resolves a real value
// rather than its null fallback.
const SAMPLE: GlobalValidator = {
  hotkey: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  featured: true,
  coldkey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  coldkey_identity: {
    has_identity: true,
    name: "Foundry",
    url: null,
    github: null,
    image: null,
    discord: null,
    description: null,
    additional: null,
    captured_at: null,
  },
  coldkey_count: 1,
  subnet_count: 12,
  uid_count: 34,
  take: 0.18,
  total_stake_tao: 56_260_000,
  root_stake_tao: 40_000_000,
  alpha_stake_tao: 16_260_000,
  total_emission_tao: 1234.5,
  nominator_count: 512,
  apy_estimate: 0.1423,
  apy_estimate_eligible_subnet_count: 10,
  avg_validator_trust: 0.9,
  max_validator_trust: 1,
  stake_dominance: 0.0812,
  latest_captured_at: null,
  latest_block_number: null,
  subnets: [],
};

describe("VALIDATOR_COLUMNS", () => {
  // #5307: the table shipped with 12 headers over 9 cells (columns showing
  // another column's data, a duplicated "Est. APY" header). Both <thead> and
  // every <tbody> row now map over this single array, so these invariants keep
  // header count === per-row cell count and forbid the duplicate-header class of
  // regression at the source.
  it("has at least one column", () => {
    expect(VALIDATOR_COLUMNS.length).toBeGreaterThan(0);
  });

  it("has no duplicate headers (guards the duplicate 'Est. APY')", () => {
    const headers = VALIDATOR_COLUMNS.map((c) => c.header);
    expect(new Set(headers).size).toBe(headers.length);
  });

  it("gives every header exactly one cell renderer (header count === cell count)", () => {
    for (const col of VALIDATOR_COLUMNS) {
      expect(col.header.trim()).not.toBe("");
      expect(typeof col.cell).toBe("function");
      // Each header maps 1:1 to a defined cell for a populated row.
      expect(col.cell(SAMPLE)).toBeDefined();
    }
  });

  it("exposes the completed column set the incomplete merge was missing", () => {
    const headers = VALIDATOR_COLUMNS.map((c) => c.header);
    for (const h of [
      "Operator",
      "Hotkey",
      "Coldkey",
      "Take",
      "Est. APY",
      "Total stake",
      "Total emission",
    ]) {
      expect(headers).toContain(h);
    }
  });

  // #5344: the table's `<select>` was replaced by clickable column headers, so a
  // sort key with no column backing it would be unreachable from the UI — the
  // exact regression that made avg/max trust select-only in the first place.
  it("gives every /api/v1/validators sort key a column to sort from", () => {
    const sortable = new Set(VALIDATOR_COLUMNS.map((c) => c.sort).filter(Boolean));
    const apiSortKeys: GlobalValidatorSort[] = [
      "avg_validator_trust",
      "max_validator_trust",
      "stake_dominance",
      "subnet_count",
      "total_emission",
      "total_stake",
      "uid_count",
    ];
    for (const key of apiSortKeys) {
      expect(sortable).toContain(key);
    }
  });

  it("maps each sort key to exactly one column (no ambiguous header)", () => {
    const keys = VALIDATOR_COLUMNS.map((c) => c.sort).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // Padding is the route's job (density-driven) -- a column baking in its own
  // py-* would silently win or lose against it depending on CSS source order.
  it("leaves cell padding to the route so the density toggle can own it", () => {
    for (const col of VALIDATOR_COLUMNS) {
      expect(col.thClassName).not.toMatch(/\bp[xy]?-/);
      expect(col.tdClassName).not.toMatch(/\bp[xy]?-/);
    }
  });
});
