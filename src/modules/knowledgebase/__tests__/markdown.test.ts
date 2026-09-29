import { describe, expect, it } from "vitest";
import { MarkdownError, parseDocument, slugify, toPlainText } from "../markdown";

const doc = `---
title: "Time off & leave"
source: contents/handbook/people/time-off.md
---

# Time off & leave

Intro paragraph with a [link](https://example.com/policy).

## Parental leave

Paragraph one.

- item one
- item two

### Eligibility

\`\`\`
# not a heading inside code

still code
\`\`\`

## Sick leave

| Days | Paid |
| --- | --- |
| 5 | Yes |

## Empty heading
`;

describe("parseDocument", () => {
  const { document, sections } = parseDocument("people/time-off", doc);

  it("reads the title and source path from frontmatter", () => {
    expect(document).toMatchObject({
      id: "people/time-off",
      title: "Time off & leave",
      sourcePath: "contents/handbook/people/time-off.md",
    });
  });

  it("makes a section per heading with its heading path, skipping empty ones", () => {
    expect(sections.map((s) => [s.id, s.headingPath, s.level])).toEqual([
      ["people/time-off", ["Time off & leave"], 1],
      ["people/time-off#parental-leave", ["Time off & leave", "Parental leave"], 2],
      ["people/time-off#eligibility", ["Time off & leave", "Parental leave", "Eligibility"], 3],
      ["people/time-off#sick-leave", ["Time off & leave", "Sick leave"], 2],
    ]);
    expect(document.sectionIds).toEqual(sections.map((s) => s.id));
  });

  it("splits bodies into blocks, keeping lists, tables and code blocks whole", () => {
    expect(sections[1]!.blocks).toEqual(["Paragraph one.", "- item one\n- item two"]);
    expect(sections[2]!.blocks).toEqual(["```\n# not a heading inside code\n\nstill code\n```"]);
    expect(sections[3]!.blocks).toEqual(["| Days | Paid |\n| --- | --- |\n| 5 | Yes |"]);
  });

  it("gives repeated headings unique ids", () => {
    const repeated = parseDocument("a", `---\ntitle: A\nsource: a.md\n---\n\n## Notes\n\nOne\n\n## Notes\n\nTwo\n`);
    expect(repeated.sections.map((s) => s.id)).toEqual(["a#notes", "a#notes-2"]);
  });

  it("rejects files without frontmatter or a title", () => {
    expect(() => parseDocument("x", "# No frontmatter")).toThrow(MarkdownError);
    expect(() => parseDocument("x", "---\nsource: x.md\n---\n")).toThrow(MarkdownError);
  });
});

describe("toPlainText", () => {
  it("reduces links to their text and drops code fences and escapes", () => {
    expect(toPlainText("See [the policy](https://x.y/z) \\| now\n```\ncode\n```")).toBe("See the policy | now\n\ncode\n");
  });
});

describe("slugify", () => {
  it("makes url-safe ids", () => {
    expect(slugify("How do I request merch? (2024)")).toBe("how-do-i-request-merch-2024");
    expect(slugify("!!!")).toBe("section");
  });
});
