import MiniSearch from "minisearch";
import { toPlainText } from "./markdown";
import { toMatchKey } from "./normalize";
import type { Chunk } from "./types";

type IndexedChunk = { id: string; text: string; heading: string };

export type SearchIndex = MiniSearch<IndexedChunk>;

/** Builds the in-memory BM25 index over chunk text (links reduced to their text) and heading paths. */
export function buildSearchIndex(chunks: readonly Chunk[]): SearchIndex {
  const index = new MiniSearch<IndexedChunk>({
    fields: ["heading", "text"],
    storeFields: [],
    processTerm: (term) => toMatchKey(term) || null,
  });
  index.addAll(
    chunks.map((chunk) => ({ id: chunk.id, text: toPlainText(chunk.text), heading: chunk.headingPath.join(" › ") })),
  );
  return index;
}
