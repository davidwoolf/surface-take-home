import { describe, expect, it } from "vitest";
import { areaFor, buildBreadcrumb } from "../breadcrumb";

describe("areaFor", () => {
  it("turns folders into readable area names", () => {
    expect(areaFor("people/offboarding")).toEqual(["People"]);
    expect(areaFor("growth/sales/refunds")).toEqual(["Growth", "Sales"]);
    expect(areaFor("cs-and-onboarding/renewals")).toEqual(["CS and onboarding"]);
    expect(areaFor("engineering/posthog-com/api-docs")).toEqual(["Engineering", "posthog.com"]);
    expect(areaFor("engineering/sdks/index")).toEqual(["Engineering", "SDKs"]);
    expect(areaFor("getting-started/meetings")).toEqual(["Getting started"]);
  });

  it("is empty for top-level pages", () => {
    expect(areaFor("values")).toEqual([]);
  });
});

describe("buildBreadcrumb", () => {
  it("joins area and headings", () => {
    expect(buildBreadcrumb(["People"], ["Offboarding", "Voluntary departure"])).toEqual([
      "People",
      "Offboarding",
      "Voluntary departure",
    ]);
  });

  it("skips a step that repeats the previous one", () => {
    expect(buildBreadcrumb(["Engineering", "SDKs"], ["SDKs", "Support"])).toEqual(["Engineering", "SDKs", "Support"]);
  });
});
