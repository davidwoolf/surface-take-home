import { describe, expect, it } from "vitest";
import { buildKnowledgebase } from "../loader";
import { getSection, searchHandbook, snippet } from "../search";

const page = (id: string, title: string, body: string) => ({
  id,
  markdown: `---\ntitle: ${title}\nsource: contents/handbook/${id}.md\n---\n\n# ${title}\n\n${body}\n`,
});

const kb = buildKnowledgebase([
  page(
    "people/time-off",
    "Time off",
    [
      "We offer unlimited time off.",
      "## Parental leave",
      "Parental leave is 24 weeks. See the [leave policy](https://example.com/leave).",
      "## Sick leave",
      "If you are sick, rest. Sick leave is paid.",
    ].join("\n\n"),
  ),
  page("growth/refunds", "Refunds", "## Eligibility criteria\n\nCustomers are eligible within 30 days of the billing date."),
  page("company/offsites", "Offsites", "Parental leave doesn't stop you joining an offsite if you want to."),
]);

describe("searchHandbook", () => {
  it("ranks a heading match above a passing mention", () => {
    const hits = searchHandbook(kb, "parental leave");
    expect(hits[0]?.sectionId).toBe("people/time-off#parental-leave");
    expect(hits.map((h) => h.sectionId)).toContain("company/offsites");
  });

  it("returns one hit per section with its heading path and a snippet", () => {
    const [hit] = searchHandbook(kb, "sick");
    expect(hit).toMatchObject({
      sectionId: "people/time-off#sick-leave",
      chunkId: "people/time-off#sick-leave:1",
      headingPath: ["Time off", "Sick leave"],
      snippet: "If you are sick, rest. Sick leave is paid.",
    });
  });

  it("matches other forms of a word through stemming", () => {
    expect(searchHandbook(kb, "eligibility")[0]?.sectionId).toBe("growth/refunds#eligibility-criteria");
  });

  it("ignores stopwords and possessives", () => {
    expect(searchHandbook(kb, "what is PostHog's refund eligibility?")[0]?.sectionId).toBe(
      "growth/refunds#eligibility-criteria",
    );
  });

  it("returns nothing for empty, stopword-only or unmatched queries", () => {
    expect(searchHandbook(kb, "")).toEqual([]);
    expect(searchHandbook(kb, "how do I")).toEqual([]);
    expect(searchHandbook(kb, "kubernetes")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchHandbook(kb, "leave", 1)).toHaveLength(1);
  });
});

describe("getSection", () => {
  it("returns the section's markdown and its links", () => {
    expect(getSection(kb, "people/time-off#parental-leave")).toEqual({
      id: "people/time-off#parental-leave",
      title: "Parental leave",
      headingPath: ["Time off", "Parental leave"],
      text: "Parental leave is 24 weeks. See the [leave policy](https://example.com/leave).",
      links: [{ text: "leave policy", url: "https://example.com/leave" }],
    });
  });

  it("returns undefined for an unknown id", () => {
    expect(getSection(kb, "people/nope")).toBeUndefined();
  });
});

describe("snippet", () => {
  it("picks the line with the most query terms and trims long lines around the match", () => {
    const long = `${"intro ".repeat(80)}the refund window is 30 days ${"outro ".repeat(80)}`;
    const result = snippet(`unrelated line\n${long}`, ["refund"]);
    expect(result.startsWith("…")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
    expect(result).toContain("the refund window is 30 days");
  });
});
