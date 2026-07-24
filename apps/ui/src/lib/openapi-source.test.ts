import { describe, expect, it } from "vitest";
import { humanizeOperationId } from "./openapi-source";

// #7908: regression coverage for humanizeOperationId()'s title-casing and its
// two override tables. Every expectation below is the function's actual
// observed output, so this pins current behaviour (including the quirks noted
// at the bottom) rather than an idealized contract.

describe("humanizeOperationId", () => {
  it("title-cases a plain camelCase operationId with no overrides", () => {
    expect(humanizeOperationId("listSubnets")).toBe("List Subnets");
    expect(humanizeOperationId("listEndpoints")).toBe("List Endpoints");
  });

  it("applies the ID_OVERRIDES whole-id special case", () => {
    // "openapi" has no camelCase boundary to split on, so it can only be
    // caught as a whole-id override.
    expect(humanizeOperationId("openapi")).toBe("OpenAPI");
  });

  it("applies WORD_OVERRIDES per split word", () => {
    expect(humanizeOperationId("getApiStatus")).toBe("Get API Status");
    expect(humanizeOperationId("listRpcEndpoints")).toBe("List RPC Endpoints");
    expect(humanizeOperationId("getById")).toBe("Get By ID");
    expect(humanizeOperationId("getTaoPrice")).toBe("Get TAO Price");
    expect(humanizeOperationId("getSubnetOhlc")).toBe("Get Subnet OHLC");
    expect(humanizeOperationId("getJsonBlob")).toBe("Get JSON Blob");
    expect(humanizeOperationId("getHhi")).toBe("Get HHI");
    expect(humanizeOperationId("getAiThing")).toBe("Get AI Thing");
    expect(humanizeOperationId("getUrl")).toBe("Get URL");
    expect(humanizeOperationId("getDx")).toBe("Get DX");
  });

  it("splits a letter→digit boundary into its own word", () => {
    // The letter→digit split runs BEFORE the per-word override lookup, so a
    // digit-bearing override key ("ss58", "d1") is already broken in two by
    // the time the table is consulted and therefore never matches. Pinned
    // here so a future change to either regex or table is a visible diff.
    expect(humanizeOperationId("getSs58")).toBe("Get Ss 58");
    expect(humanizeOperationId("getD1Stats")).toBe("Get D 1 Stats");
  });

  it("leaves an underscore-separated id as a single word", () => {
    // Only whitespace (introduced by the two regexes) is split on — an
    // underscore is not a word boundary here.
    expect(humanizeOperationId("get_subnet")).toBe("Get_subnet");
  });

  it("returns an empty string for empty input", () => {
    expect(humanizeOperationId("")).toBe("");
  });
});
