import { describe, expect, it } from "vitest";
import { buildKnowledgebase } from "@/modules/knowledgebase/loader";
import { parseQuotes, resolveSource, verifyQuote, verifyQuotes } from "../quotes";

const kb = buildKnowledgebase([
  {
    id: "people/offboarding",
    markdown: [
      "---",
      "title: Offboarding",
      "source: contents/handbook/people/offboarding.md",
      "---",
      "",
      "# Offboarding",
      "",
      "## Voluntary departure",
      "",
      "We ask for 30 days of notice by default (unless locally a different maximum or minimum limit applies), and for team members to work during that notice period.",
      "",
      "If you resign, please email [people@posthog.com](mailto:people@posthog.com) with your intention to resign.",
      "",
      "## Final pay",
      "",
      "- If the offboarding is voluntary, they will be paid up until the end of their notice period.",
      "",
      "| Time at PostHog | Notice |",
      "| --- | --- |",
      "| under 6 months | 2 weeks |",
    ].join("\n"),
  },
  {
    id: "people/time-off",
    markdown:
      "---\ntitle: Time off\nsource: contents/handbook/people/time-off.md\n---\n\n# Time off\n\n## Parental leave\n\nWe don’t count the days — it’s “permissionless”.\n",
  },
]);

const source = "People › Offboarding › Voluntary departure";

describe("parseQuotes", () => {
  it("finds blockquotes that end with a source line", () => {
    const answer = [
      "You need to give 30 days.",
      "",
      "> We ask for 30 days of notice by default",
      `> — Source: ${source}`,
      "",
      "- Also:",
      "  > If you resign, please email people@posthog.com",
      "  > — Source: People › Offboarding › Voluntary departure",
    ].join("\n");
    expect(parseQuotes(answer)).toEqual([
      { text: "We ask for 30 days of notice by default", source },
      { text: "If you resign, please email people@posthog.com", source },
    ]);
  });

  it("keeps multi-line quotes and ignores blockquotes without a source", () => {
    const answer = "> Just a note\n\n> line one\n>\n> line two\n> — Source: Time off › Parental leave";
    expect(parseQuotes(answer)).toEqual([{ text: "line one\n\nline two", source: "Time off › Parental leave" }]);
  });
});

describe("resolveSource", () => {
  it("matches the full breadcrumb, other separators, and a breadcrumb missing its leading steps", () => {
    for (const cited of [source, "People > Offboarding > Voluntary departure", "offboarding › voluntary departure"]) {
      expect(resolveSource(kb, cited).map((s) => s.id)).toEqual(["people/offboarding#voluntary-departure"]);
    }
  });

  it("returns nothing for an unknown source", () => {
    expect(resolveSource(kb, "People › Nowhere")).toEqual([]);
  });
});

describe("verifyQuote", () => {
  it("verifies an exact quote in the cited section", () => {
    const check = verifyQuote(kb, { text: "We ask for 30 days of notice by default", source });
    expect(check).toMatchObject({
      status: "verified",
      foundIn: { sectionId: "people/offboarding#voluntary-departure", source },
    });
  });

  it("verifies a quote that differs only in quotes, dashes, case and whitespace", () => {
    const check = verifyQuote(kb, {
      text: `We don't count the days - it's "permissionless".`,
      source: "People › Time off › Parental leave",
    });
    expect(check.status).toBe("verified");
  });

  it("verifies quotes with links, list markers, bold or table rows as they appear in the markdown", () => {
    const cases = [
      { text: "please email [people@posthog.com](mailto:people@posthog.com) with your intention", source },
      { text: "- If the offboarding is **voluntary**, they will be paid", source: "People › Offboarding › Final pay" },
      { text: "| under 6 months | 2 weeks |", source: "People › Offboarding › Final pay" },
    ];
    for (const quote of cases) expect(verifyQuote(kb, quote).status, quote.text).toBe("verified");
  });

  it("returns the links a verified quote contains", () => {
    const check = verifyQuote(kb, { text: "please email [people@posthog.com](mailto:people@posthog.com)", source });
    expect(check.foundIn?.links).toEqual([{ text: "people@posthog.com", url: "mailto:people@posthog.com" }]);
  });

  it("checks each part of a quote joined with an ellipsis", () => {
    expect(verifyQuote(kb, { text: "We ask for 30 days of notice … work during that notice period", source }).status).toBe("verified");
    expect(verifyQuote(kb, { text: "We ask for 30 days of notice … work during the holidays", source }).status).toBe("unverified");
  });

  it("rejects a near-miss with a changed word", () => {
    expect(verifyQuote(kb, { text: "We ask for 60 days of notice by default", source }).status).toBe("unverified");
  });

  it("rejects a fabricated quote", () => {
    expect(verifyQuote(kb, { text: "Everyone gets a free boat on their first day", source })).toEqual({
      text: "Everyone gets a free boat on their first day",
      source,
      status: "unverified",
    });
  });

  it("finds a real quote under the wrong source and reports where it actually is", () => {
    const check = verifyQuote(kb, { text: "We ask for 30 days of notice by default", source: "People › Time off › Parental leave" });
    expect(check).toMatchObject({ status: "verified", foundIn: { source } });
  });
});

describe("verifyQuotes", () => {
  it("checks every quote in an answer, in order", () => {
    const answer = `> We ask for 30 days of notice by default\n> — Source: ${source}\n\nAnd:\n\n> Invented words here\n> — Source: ${source}`;
    expect(verifyQuotes(kb, answer).map((q) => q.status)).toEqual(["verified", "unverified"]);
  });
});
