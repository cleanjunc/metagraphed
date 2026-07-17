import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CopyButton } from "@jsonbored/ui-kit";
import { shortHash } from "@/lib/metagraphed/blocks";
import { formatNumber } from "@/lib/metagraphed/format";
import { taoCompact, scoreStr, SponsoredBadge } from "@/components/metagraphed/neuron-format";
import { ValidatorIdentityChip } from "@/components/metagraphed/validator-identity-chip";
import { formatApyPct, formatTakePct } from "@/lib/metagraphed/validator-apy";
import type { GlobalValidator, GlobalValidatorSort } from "@/lib/metagraphed/types";

// Cell padding is NOT baked in here: the route owns it so one density choice can
// drive every cell (classNames() plain-joins, so a route-side "py-1.5" would not
// reliably beat a "py-2" baked in here -- CSS source order, not class order, wins).
const TH_BASE = "font-mono text-[10px] uppercase tracking-widest text-ink-muted";
const TD_BASE = "font-mono text-[11px]";
const TD_NUM = `${TD_BASE} text-right tabular-nums`;

/**
 * One column of the global-validators table. Both the `<thead>` and every
 * `<tbody>` row map over the SAME array, so the header count and per-row cell
 * count are equal by construction — the header/cell misalignment that #5307
 * fixed (12 headers over 9 cells, columns showing another column's data) is
 * structurally impossible here. `header` values are unique (asserted in tests).
 */
export interface ValidatorColumn {
  header: string;
  thClassName: string;
  tdClassName: string;
  cell: (v: GlobalValidator) => ReactNode;
  /**
   * The `/api/v1/validators` sort key this column ranks by, when it has one.
   * Columns carrying it render a clickable SortHeader; the rest stay static
   * text. Keeping the mapping on the column (rather than a parallel lookup in
   * the route) is what makes "every sort key is reachable from a header" a
   * property the tests can assert against the same array the table renders.
   */
  sort?: GlobalValidatorSort;
}

const numeric = (
  header: string,
): Pick<ValidatorColumn, "header" | "thClassName" | "tdClassName"> => ({
  header,
  thClassName: `${TH_BASE} text-right`,
  tdClassName: `${TD_NUM} text-ink`,
});

export const VALIDATOR_COLUMNS: ValidatorColumn[] = [
  {
    header: "Operator",
    thClassName: TH_BASE,
    tdClassName: TD_BASE,
    cell: (v) => (
      <div className="flex items-center gap-1.5">
        {v.featured ? <SponsoredBadge /> : null}
        <ValidatorIdentityChip hotkey={v.hotkey} identity={v.coldkey_identity} size={20} />
      </div>
    ),
  },
  {
    header: "Hotkey",
    thClassName: TH_BASE,
    tdClassName: `${TD_BASE} text-ink-muted`,
    cell: (v) => (
      <div className="flex items-center gap-1.5">
        <Link
          to="/validators/$hotkey"
          params={{ hotkey: v.hotkey }}
          className="text-ink-strong hover:text-accent hover:underline"
          title={v.hotkey}
        >
          {shortHash(v.hotkey) ?? v.hotkey}
        </Link>
        <CopyButton value={v.hotkey} label="hotkey" compact />
      </div>
    ),
  },
  {
    header: "Coldkey",
    thClassName: TH_BASE,
    tdClassName: `${TD_BASE} text-ink-muted`,
    cell: (v) =>
      v.coldkey ? (
        <div className="flex items-center gap-1.5">
          <Link
            to="/accounts/$ss58"
            params={{ ss58: v.coldkey }}
            className="hover:text-accent hover:underline"
            title={v.coldkey}
          >
            {shortHash(v.coldkey) ?? v.coldkey}
          </Link>
          <CopyButton value={v.coldkey} label="coldkey" compact />
        </div>
      ) : (
        "—"
      ),
  },
  {
    ...numeric("Take"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    cell: (v) => formatTakePct(v.take),
  },
  {
    ...numeric("Est. APY"),
    // apy_estimate (#2551) is a 0..1 fraction; formatApyPct takes a percentage.
    cell: (v) => formatApyPct(v.apy_estimate != null ? v.apy_estimate * 100 : null),
  },
  { ...numeric("Active subnets"), sort: "subnet_count", cell: (v) => formatNumber(v.subnet_count) },
  {
    ...numeric("UIDs"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    sort: "uid_count",
    cell: (v) => formatNumber(v.uid_count),
  },
  {
    ...numeric("Nominators"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    cell: (v) => (v.nominator_count != null ? formatNumber(v.nominator_count) : "—"),
  },
  {
    ...numeric("Dominance"),
    sort: "stake_dominance",
    cell: (v) => (v.stake_dominance != null ? `${(v.stake_dominance * 100).toFixed(2)}%` : "—"),
  },
  { ...numeric("Total stake"), sort: "total_stake", cell: (v) => taoCompact(v.total_stake_tao) },
  {
    ...numeric("Total emission"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    sort: "total_emission",
    cell: (v) => taoCompact(v.total_emission_tao),
  },
  // Trust closes the gap the `<select>` used to cover on its own: avg/max trust
  // were sortable but had no column, so a header-driven table would have made
  // both keys unreachable. Same 3-dp convention the per-subnet neuron table
  // renders "Val Trust" with.
  {
    ...numeric("Avg trust"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    sort: "avg_validator_trust",
    cell: (v) => scoreStr(v.avg_validator_trust),
  },
  {
    ...numeric("Max trust"),
    tdClassName: `${TD_NUM} text-ink-muted`,
    sort: "max_validator_trust",
    cell: (v) => scoreStr(v.max_validator_trust),
  },
];
