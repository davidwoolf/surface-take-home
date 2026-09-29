import { describe, expect, it } from "vitest";
import { CHUNK_MAX_CHARS, CHUNK_TARGET_CHARS, buildChunks } from "../chunk";
import type { ParsedSection } from "../markdown";

function section(blocks: string[]): ParsedSection {
  return {
    id: "doc#s",
    documentId: "doc",
    title: "S",
    headingPath: ["Doc", "S"],
    breadcrumb: ["Doc", "S"],
    level: 2,
    text: blocks.join("\n\n"),
    blocks,
  };
}

describe("buildChunks", () => {
  it("keeps a short section in one chunk", () => {
    const chunks = buildChunks([section(["One.", "Two."])]);
    expect(chunks).toEqual([
      { id: "doc#s:1", sectionId: "doc#s", documentId: "doc", headingPath: ["Doc", "S"], breadcrumb: ["Doc", "S"], text: "One.\n\nTwo." },
    ]);
  });

  it("splits on block boundaries near the target size, overlapping a short last block", () => {
    const big = "a".repeat(CHUNK_TARGET_CHARS - 100);
    const chunks = buildChunks([section([big, "short bridge", "b".repeat(500)])]);
    expect(chunks.map((c) => c.id)).toEqual(["doc#s:1", "doc#s:2"]);
    expect(chunks[0]!.text).toBe(`${big}\n\nshort bridge`);
    expect(chunks[1]!.text).toBe(`short bridge\n\n${"b".repeat(500)}`);
  });

  it("splits a block longer than the maximum", () => {
    const sentences = Array.from({ length: 100 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = buildChunks([section([sentences])]);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    expect(chunks.map((c) => c.text).join(" ")).toBe(sentences);
  });
});
