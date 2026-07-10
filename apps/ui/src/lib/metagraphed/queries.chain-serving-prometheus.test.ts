import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiResult } from "./client";
import { apiFetch } from "./client";
import {
  chainPrometheusQuery,
  chainServingQuery,
  normalizeChainPrometheus,
  normalizeChainServing,
} from "./queries";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiFetch: vi.fn() };
});

const mockedApiFetch = vi.mocked(apiFetch);

function resolveWith(data: unknown, url: string): void {
  mockedApiFetch.mockResolvedValue({
    data,
    meta: {} as ApiResult<unknown>["meta"],
    url,
  });
}

async function runQuery(
  query: typeof chainServingQuery | typeof chainPrometheusQuery,
  window?: "7d" | "30d",
) {
  const opts = query(window);
  if (!opts.queryFn) throw new Error("expected a queryFn");
  return opts.queryFn({
    signal: new AbortController().signal,
    queryKey: opts.queryKey,
    meta: undefined,
  } as unknown as Parameters<NonNullable<typeof opts.queryFn>>[0]);
}

describe("normalizeChainServing", () => {
  it("passes a well-formed leaderboard through", () => {
    expect(
      normalizeChainServing({
        schema_version: 1,
        window: "7d",
        observed_at: "2026-07-01T00:00:00Z",
        subnet_count: 2,
        network: { distinct_servers: 5, announcements: 70, announcements_per_server: 14 },
        intensity_distribution: {
          count: 2,
          mean: 12.5,
          min: 10,
          p25: 10,
          median: 10,
          p75: 15,
          p90: 15,
          max: 15,
        },
        subnets: [
          { netuid: 1, distinct_servers: 4, announcements: 40, announcements_per_server: 10 },
          { netuid: 2, distinct_servers: 2, announcements: 30, announcements_per_server: 15 },
        ],
      }),
    ).toEqual({
      schema_version: 1,
      window: "7d",
      observed_at: "2026-07-01T00:00:00Z",
      subnet_count: 2,
      network: { distinct_servers: 5, announcements: 70, announcements_per_server: 14 },
      intensity_distribution: {
        count: 2,
        mean: 12.5,
        min: 10,
        p25: 10,
        median: 10,
        p75: 15,
        p90: 15,
        max: 15,
      },
      subnets: [
        { netuid: 1, distinct_servers: 4, announcements: 40, announcements_per_server: 10 },
        { netuid: 2, distinct_servers: 2, announcements: 30, announcements_per_server: 15 },
      ],
    });
  });

  it("degrades a cold / junk store to a schema-stable zeroed leaderboard", () => {
    for (const raw of [{}, null, "x", { subnet_count: "nope" }]) {
      const card = normalizeChainServing(raw);
      expect(card.subnet_count).toBe(0);
      expect(card.subnets).toEqual([]);
      expect(card.network).toEqual({
        distinct_servers: 0,
        announcements: 0,
        announcements_per_server: null,
      });
      expect(card.intensity_distribution).toBeNull();
    }
  });

  it("drops malformed subnet rows and coerces a junk announcements_per_server to null", () => {
    const card = normalizeChainServing({
      network: { announcements_per_server: { pct: 1 } },
      subnets: [{ distinct_servers: 4 }, { netuid: 2, announcements: 30 }],
    });
    expect(card.subnets).toHaveLength(1);
    expect(card.subnets[0]?.netuid).toBe(2);
    expect(card.subnets[0]?.announcements_per_server).toBeNull();
    expect(card.network.announcements_per_server).toBeNull();
  });
});

describe("normalizeChainPrometheus", () => {
  it("passes a well-formed leaderboard through", () => {
    expect(
      normalizeChainPrometheus({
        schema_version: 1,
        window: "30d",
        observed_at: "2026-07-01T00:00:00Z",
        subnet_count: 1,
        network: { distinct_exporters: 3, announcements: 12, announcements_per_exporter: 4 },
        intensity_distribution: {
          count: 1,
          mean: 4,
          min: 4,
          p25: 4,
          median: 4,
          p75: 4,
          p90: 4,
          max: 4,
        },
        subnets: [
          { netuid: 7, distinct_exporters: 3, announcements: 12, announcements_per_exporter: 4 },
        ],
      }),
    ).toEqual({
      schema_version: 1,
      window: "30d",
      observed_at: "2026-07-01T00:00:00Z",
      subnet_count: 1,
      network: { distinct_exporters: 3, announcements: 12, announcements_per_exporter: 4 },
      intensity_distribution: {
        count: 1,
        mean: 4,
        min: 4,
        p25: 4,
        median: 4,
        p75: 4,
        p90: 4,
        max: 4,
      },
      subnets: [
        { netuid: 7, distinct_exporters: 3, announcements: 12, announcements_per_exporter: 4 },
      ],
    });
  });

  it("degrades a cold / junk store to a schema-stable zeroed leaderboard", () => {
    for (const raw of [{}, null, "x", { subnet_count: "nope" }]) {
      const card = normalizeChainPrometheus(raw);
      expect(card.subnet_count).toBe(0);
      expect(card.subnets).toEqual([]);
      expect(card.network).toEqual({
        distinct_exporters: 0,
        announcements: 0,
        announcements_per_exporter: null,
      });
      expect(card.intensity_distribution).toBeNull();
    }
  });

  it("drops malformed subnet rows and coerces a junk announcements_per_exporter to null", () => {
    const card = normalizeChainPrometheus({
      network: { announcements_per_exporter: { pct: 1 } },
      subnets: [{ distinct_exporters: 2 }, { netuid: 5, announcements: 8 }],
    });
    expect(card.subnets).toHaveLength(1);
    expect(card.subnets[0]?.netuid).toBe(5);
    expect(card.subnets[0]?.announcements_per_exporter).toBeNull();
    expect(card.network.announcements_per_exporter).toBeNull();
  });
});

describe("chainServingQuery / chainPrometheusQuery", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("passes the window and a fixed limit and normalizes the serving leaderboard", async () => {
    resolveWith(
      {
        window: "30d",
        subnet_count: 1,
        network: { distinct_servers: 4, announcements: 40, announcements_per_server: 10 },
        subnets: [
          { netuid: 1, distinct_servers: 4, announcements: 40, announcements_per_server: 10 },
        ],
      },
      "/api/v1/chain/serving",
    );
    const res = await runQuery(chainServingQuery, "30d");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/chain/serving",
      expect.objectContaining({ params: { window: "30d", limit: 20 } }),
    );
    expect(res.data.subnet_count).toBe(1);
    expect(res.data.subnets).toHaveLength(1);
  });

  it("passes the window and a fixed limit and normalizes the prometheus leaderboard", async () => {
    resolveWith(
      {
        window: "30d",
        subnet_count: 1,
        network: { distinct_exporters: 2, announcements: 8, announcements_per_exporter: 4 },
        subnets: [
          { netuid: 5, distinct_exporters: 2, announcements: 8, announcements_per_exporter: 4 },
        ],
      },
      "/api/v1/chain/prometheus",
    );
    const res = await runQuery(chainPrometheusQuery, "30d");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/chain/prometheus",
      expect.objectContaining({ params: { window: "30d", limit: 20 } }),
    );
    expect(res.data.subnet_count).toBe(1);
    expect(res.data.subnets).toHaveLength(1);
  });

  it("defaults both boards to the 7d window", async () => {
    resolveWith({}, "/api/v1/chain/serving");
    await runQuery(chainServingQuery);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/chain/serving",
      expect.objectContaining({ params: { window: "7d", limit: 20 } }),
    );

    resolveWith({}, "/api/v1/chain/prometheus");
    await runQuery(chainPrometheusQuery);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/chain/prometheus",
      expect.objectContaining({ params: { window: "7d", limit: 20 } }),
    );
  });
});
