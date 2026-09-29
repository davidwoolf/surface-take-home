import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadKnowledgebase } from "../loader";

const dirs: string[] = [];
function tempKnowledgebase(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "surface-kb-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const page = (title: string, body: string) => `---\ntitle: ${title}\nsource: contents/${title}.md\n---\n\n# ${title}\n\n${body}\n`;

describe("loadKnowledgebase", () => {
  it("loads nested files into documents, sections, chunks and a search index", () => {
    const dir = tempKnowledgebase({
      "people/time-off.md": page("Time off", "## Parental leave\n\nSixteen weeks of parental leave."),
      "brand/merch.md": page("Merch", "Request merch with the template."),
    });
    const result = loadKnowledgebase(dir);
    if (result.status !== "ready") throw new Error(result.message);

    const { documents, sections, chunks, index } = result.knowledgebase;
    expect(documents.map((d) => d.id)).toEqual(["brand/merch", "people/time-off"]);
    expect(sections.map((s) => [s.id, s.chunkIds])).toEqual([
      ["brand/merch", ["brand/merch:1"]],
      ["people/time-off#parental-leave", ["people/time-off#parental-leave:1"]],
    ]);
    expect(chunks).toHaveLength(2);
    expect(index.search("parental")[0]?.id).toBe("people/time-off#parental-leave:1");
  });

  it("reports a missing or empty knowledgebase as invalid", () => {
    for (const dir of [path.join(os.tmpdir(), "surface-kb-does-not-exist"), tempKnowledgebase({})]) {
      const result = loadKnowledgebase(dir);
      expect(result.status).toBe("invalid");
      if (result.status === "invalid") expect(result.message).toMatch(/no handbook files.*git checkout -- knowledgebase/);
    }
  });

  it("reports a file without frontmatter as invalid", () => {
    const result = loadKnowledgebase(tempKnowledgebase({ "bad.md": "# No frontmatter\n" }));
    expect(result).toMatchObject({ status: "invalid", message: expect.stringContaining("bad.md has no frontmatter") });
  });

  it("loads the committed handbook", () => {
    const result = loadKnowledgebase();
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.knowledgebase.documents.length).toBeGreaterThan(200);
  });
});
