import { describe, expect, it } from "vitest";
import { loadKnowledgebase } from "../loader";
import { searchHandbook } from "../search";
import checkSet from "./retrieval.json";

// Keyword search alone, no LLM: the agent can still search again with other words,
// so this measures the first-try hit rate.
const TOP_K = 5;
const MIN_HIT_RATE = 0.9;

describe("retrieval check set (committed handbook)", () => {
  const result = loadKnowledgebase();
  if (result.status !== "ready") throw new Error(result.message);
  const kb = result.knowledgebase;

  it("lists only section ids that exist", () => {
    const ids = new Set(kb.sections.map((s) => s.id));
    const unknown = checkSet.covered.flatMap((q) => q.expected).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it(`finds an expected section in the top ${TOP_K} for at least ${MIN_HIT_RATE * 100}% of questions`, () => {
    const misses = checkSet.covered
      .filter((q) => !searchHandbook(kb, q.question, TOP_K).some((hit) => q.expected.includes(hit.sectionId)))
      .map((q) => q.question);
    const hitRate = 1 - misses.length / checkSet.covered.length;
    expect(hitRate, `misses:\n${misses.join("\n")}`).toBeGreaterThanOrEqual(MIN_HIT_RATE);
  });
});
