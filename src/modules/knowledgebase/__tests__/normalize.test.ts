import { describe, expect, it } from "vitest";
import { cleanText, toMatchKey } from "../normalize";

describe("cleanText", () => {
  it("expands ligatures and removes invisible characters", () => {
    expect(cleanText("ﬁle of­fice​")).toBe("file office");
  });

  it("turns unusual spaces into plain spaces but keeps case and line breaks", () => {
    expect(cleanText("A B\nC")).toBe("A B\nC");
  });
});

describe("toMatchKey", () => {
  it("folds quotes, dashes, case and whitespace", () => {
    expect(toMatchKey("  “Don’t”  — Wait\n\tNOW ")).toBe(`"don't" - wait now`);
  });

  it("is idempotent", () => {
    const once = toMatchKey("Ligature ﬁ – ‘quoted’");
    expect(toMatchKey(once)).toBe(once);
  });
});
