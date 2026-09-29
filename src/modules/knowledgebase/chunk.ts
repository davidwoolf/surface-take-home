import type { ParsedSection } from "./markdown";
import type { Chunk } from "./types";

export const CHUNK_TARGET_CHARS = 1500;
export const CHUNK_MAX_CHARS = 2200;
/** A chunk's last block is repeated at the start of the next when it's at most this long. */
const OVERLAP_MAX_CHARS = 300;

/**
 * Splits each section into search chunks on block boundaries. Blocks longer
 * than the maximum are split on line, then sentence, boundaries.
 */
export function buildChunks(sections: readonly ParsedSection[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of sections) {
    groupBlocks(section.blocks.flatMap(splitOversized)).forEach((group, i) => {
      chunks.push({
        id: `${section.id}:${i + 1}`,
        sectionId: section.id,
        documentId: section.documentId,
        headingPath: section.headingPath,
        breadcrumb: section.breadcrumb,
        text: group.join("\n\n"),
      });
    });
  }
  return chunks;
}

function groupBlocks(blocks: readonly string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let size = 0;

  for (const block of blocks) {
    if (current.length && size + 2 + block.length > CHUNK_TARGET_CHARS) {
      groups.push(current);
      const last = current.at(-1)!;
      current = last.length <= OVERLAP_MAX_CHARS && last.length + 2 + block.length <= CHUNK_MAX_CHARS ? [last] : [];
      size = current.reduce((n, b) => n + b.length, 0);
    }
    size += (current.length ? 2 : 0) + block.length;
    current.push(block);
  }
  if (current.length) groups.push(current);
  return groups;
}

function splitOversized(block: string): string[] {
  if (block.length <= CHUNK_MAX_CHARS) return [block];
  const separator = block.includes("\n") ? "\n" : " ";
  const pieces = separator === "\n" ? block.split("\n") : block.split(/(?<=[.!?])\s+/);

  const out: string[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = "";
  };
  for (const piece of pieces) {
    if (buffer && buffer.length + separator.length + piece.length > CHUNK_TARGET_CHARS) flush();
    if (piece.length > CHUNK_MAX_CHARS) {
      flush();
      for (let i = 0; i < piece.length; i += CHUNK_TARGET_CHARS) out.push(piece.slice(i, i + CHUNK_TARGET_CHARS));
      continue;
    }
    buffer = buffer ? `${buffer}${separator}${piece}` : piece;
  }
  flush();
  return out;
}
