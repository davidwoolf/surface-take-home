import type { Knowledgebase } from "./loader";
import { toPlainText } from "./markdown";
import { processTerm } from "./search-index";

export type SearchHit = {
  sectionId: string;
  /** The best-matching chunk within the section. */
  chunkId: string;
  headingPath: string[];
  snippet: string;
  score: number;
};

export type SectionContent = {
  id: string;
  title: string;
  headingPath: string[];
  /** The section's markdown, with the handbook's links inline. */
  text: string;
  links: { text: string; url: string }[];
};

export const DEFAULT_SEARCH_LIMIT = 8;
/** Matches in heading paths count this many times more than matches in body text. */
const HEADING_BOOST = 2;
const SNIPPET_CHARS = 280;

/**
 * Keyword (BM25) search over the handbook. Returns at most one hit per section,
 * the section's best chunk, so each hit is a distinct place to read.
 */
export function searchHandbook(kb: Knowledgebase, query: string, limit = DEFAULT_SEARCH_LIMIT): SearchHit[] {
  const results = kb.index.search(query, {
    boost: { heading: HEADING_BOOST },
    prefix: (term) => term.length >= 4,
    fuzzy: (term) => (term.length >= 5 ? 0.15 : false),
  });

  const chunksById = new Map(kb.chunks.map((chunk) => [chunk.id, chunk]));
  const terms = queryTerms(query);
  const seenSections = new Set<string>();
  const hits: SearchHit[] = [];

  for (const result of results) {
    const chunk = chunksById.get(String(result.id));
    if (!chunk || seenSections.has(chunk.sectionId)) continue;
    seenSections.add(chunk.sectionId);
    hits.push({
      sectionId: chunk.sectionId,
      chunkId: chunk.id,
      headingPath: chunk.headingPath,
      snippet: snippet(toPlainText(chunk.text), terms),
      score: Math.round(result.score * 100) / 100,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** A whole section by id, or undefined if there's no such section. */
export function getSection(kb: Knowledgebase, id: string): SectionContent | undefined {
  const section = kb.sections.find((s) => s.id === id);
  if (!section) return undefined;
  return {
    id: section.id,
    title: section.title,
    headingPath: section.headingPath,
    text: section.text,
    links: extractLinks(section.text),
  };
}

function queryTerms(query: string): string[] {
  return query
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => processTerm(term))
    .filter((term): term is string => term !== null);
}

/** The line of text with the most query terms, trimmed to a window around the first match. */
export function snippet(text: string, terms: readonly string[]): string {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  let best = lines[0] ?? "";
  let bestCount = -1;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const count = terms.filter((term) => lower.includes(term)).length;
    if (count > bestCount) [best, bestCount] = [line, count];
  }
  if (best.length <= SNIPPET_CHARS) return best;

  const lower = best.toLowerCase();
  const firstMatch = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0), best.length);
  const start = firstMatch === best.length ? 0 : Math.max(0, firstMatch - 60);
  const window = best.slice(start, start + SNIPPET_CHARS);
  return `${start > 0 ? "…" : ""}${window}${start + SNIPPET_CHARS < best.length ? "…" : ""}`;
}

function extractLinks(markdown: string): { text: string; url: string }[] {
  const links: { text: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const match of markdown.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const key = `${match[1]}\u0000${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ text: match[1]!, url: match[2]! });
  }
  return links;
}
