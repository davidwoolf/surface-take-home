import { describe, expect, it } from "vitest";
import { splitAnswer } from "../quote-format";

describe("splitAnswer", () => {
  it("splits markdown and quotes, in order", () => {
    const answer = [
      "**30 days.**",
      "",
      "> We ask for 30 days of notice",
      "> — Source: People › Offboarding › Voluntary departure",
      "",
      "Then email people@posthog.com.",
    ].join("\n");
    expect(splitAnswer(answer)).toEqual([
      { kind: "markdown", text: "**30 days.**" },
      { kind: "quote", text: "We ask for 30 days of notice", source: "People › Offboarding › Voluntary departure" },
      { kind: "markdown", text: "Then email people@posthog.com." },
    ]);
  });

  it("keeps blockquotes without a source, and a quote still streaming, as markdown", () => {
    const answer = "Intro\n\n> A plain note\n\nMore\n\n> We ask for 30 days";
    expect(splitAnswer(answer)).toEqual([{ kind: "markdown", text: answer }]);
  });

  it("handles quotes nested in list items", () => {
    const answer = "- Point one\n  > quoted words\n  > — Source: Values\n- Point two";
    expect(splitAnswer(answer)).toEqual([
      { kind: "markdown", text: "- Point one" },
      { kind: "quote", text: "quoted words", source: "Values" },
      { kind: "markdown", text: "- Point two" },
    ]);
  });
});
