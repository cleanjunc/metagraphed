import { describe, expect, it } from "vitest";
import { PARTNER_NETUIDS, PARTNER_VALIDATORS, isPartnerHotkey, partnerForNetuid } from "./partners";

// #7909: regression coverage for the partner-lookup helpers' found and
// not-found paths. Every expectation derives from PARTNER_VALIDATORS rather
// than hard-coding a netuid/hotkey literal, so the suite keeps testing the
// lookup logic (not a frozen copy of the config) as rows are added and the
// placeholder hotkeys are swapped for production ones.

const [firstPartner] = PARTNER_VALIDATORS;
// A netuid no row claims — derived so it stays "unknown" even if rows are added.
const UNKNOWN_NETUID = Math.max(...PARTNER_VALIDATORS.map((p) => p.netuid)) + 1;

describe("partnerForNetuid", () => {
  it("returns the matching row for every configured partner netuid", () => {
    for (const partner of PARTNER_VALIDATORS) {
      expect(partnerForNetuid(partner.netuid)).toBe(partner);
    }
  });

  it("returns null for a netuid no partner validates on", () => {
    expect(partnerForNetuid(UNKNOWN_NETUID)).toBeNull();
  });

  it("returns null for null/undefined rather than throwing", () => {
    expect(partnerForNetuid(null)).toBeNull();
    expect(partnerForNetuid(undefined)).toBeNull();
  });
});

describe("isPartnerHotkey", () => {
  it("recognizes every configured partner hotkey", () => {
    for (const partner of PARTNER_VALIDATORS) {
      expect(isPartnerHotkey(partner.hotkey)).toBe(true);
    }
  });

  it("rejects a hotkey no partner uses", () => {
    expect(isPartnerHotkey(`${firstPartner.hotkey}-not-a-partner`)).toBe(false);
  });

  it("rejects empty/null/undefined input rather than throwing", () => {
    expect(isPartnerHotkey("")).toBe(false);
    expect(isPartnerHotkey(null)).toBe(false);
    expect(isPartnerHotkey(undefined)).toBe(false);
  });
});

describe("PARTNER_NETUIDS", () => {
  it("indexes exactly the netuids in PARTNER_VALIDATORS", () => {
    expect([...PARTNER_NETUIDS].sort((a, b) => a - b)).toEqual(
      PARTNER_VALIDATORS.map((p) => p.netuid).sort((a, b) => a - b),
    );
  });

  it("agrees with partnerForNetuid on membership", () => {
    for (const netuid of PARTNER_NETUIDS) {
      expect(partnerForNetuid(netuid)).not.toBeNull();
    }
    expect(PARTNER_NETUIDS.has(UNKNOWN_NETUID)).toBe(false);
  });
});
