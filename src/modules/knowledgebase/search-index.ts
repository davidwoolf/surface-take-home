import MiniSearch from "minisearch";
import { stemmer } from "stemmer";
import { toPlainText } from "./markdown";
import { toMatchKey } from "./normalize";
import { STOPWORDS } from "./stopwords";
import type { Chunk } from "./types";

type IndexedChunk = { id: string; text: string; heading: string };

export type SearchIndex = MiniSearch<IndexedChunk>;

/**
 * Lowercases, folds and stems a term ("eligible" and "eligibility" both become
 * "elig"), dropping stopwords and single characters. Used for both indexing and queries.
 */
export function processTerm(term: string): string | null {
  const key = toMatchKey(term);
  // Single characters are noise, e.g. the "s" split off "PostHog's".
  return key.length > 1 && !STOPWORDS.has(key) ? stemmer(key) : null;
}

/** Builds the in-memory BM25 index over chunk text (links reduced to their text) and heading paths. */
export function buildSearchIndex(chunks: readonly Chunk[]): SearchIndex {
  const index = new MiniSearch<IndexedChunk>({ fields: ["heading", "text"], storeFields: [], processTerm });
  index.addAll(
    chunks.map((chunk) => ({ id: chunk.id, text: toPlainText(chunk.text), heading: chunk.breadcrumb.join(" › ") })),
  );
  return index;
}
