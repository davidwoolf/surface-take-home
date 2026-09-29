import fs from "node:fs";
import path from "node:path";
import { buildChunks } from "./chunk";
import { MarkdownError, parseDocument } from "./markdown";
import { messages } from "./messages";
import { KNOWLEDGEBASE_DIR } from "./paths";
import { type SearchIndex, buildSearchIndex } from "./search-index";
import type { Chunk, HandbookDocument, Section } from "./types";

export type Knowledgebase = {
  documents: HandbookDocument[];
  sections: Section[];
  chunks: Chunk[];
  index: SearchIndex;
};

export type KnowledgebaseStatus =
  | { status: "ready"; knowledgebase: Knowledgebase }
  | { status: "invalid"; message: string };

/**
 * Reads every markdown file in the knowledgebase and builds it. Never throws;
 * problems come back as a status.
 */
export function loadKnowledgebase(dir: string = KNOWLEDGEBASE_DIR): KnowledgebaseStatus {
  const files = listMarkdownFiles(dir);
  if (files.length === 0) return { status: "invalid", message: messages.invalid("no handbook files were found") };

  try {
    const knowledgebase = buildKnowledgebase(
      files.map((file) => ({
        id: path.relative(dir, file).replace(/\.md$/, "").split(path.sep).join("/"),
        markdown: fs.readFileSync(file, "utf8"),
      })),
    );
    return { status: "ready", knowledgebase };
  } catch (error) {
    if (error instanceof MarkdownError) return { status: "invalid", message: messages.invalid(error.message) };
    throw error;
  }
}

/** Builds documents, sections, chunks and the search index from markdown files. Pure; throws MarkdownError. */
export function buildKnowledgebase(files: readonly { id: string; markdown: string }[]): Knowledgebase {
  const documents: HandbookDocument[] = [];
  const sections: Section[] = [];
  const chunks: Chunk[] = [];
  for (const { id, markdown } of files) {
    const parsed = parseDocument(id, markdown);
    const docChunks = buildChunks(parsed.sections);
    documents.push(parsed.document);
    for (const { blocks: _blocks, ...section } of parsed.sections) {
      sections.push({ ...section, chunkIds: docChunks.filter((c) => c.sectionId === section.id).map((c) => c.id) });
    }
    chunks.push(...docChunks);
  }
  return { documents, sections, chunks, index: buildSearchIndex(chunks) };
}

/** All .md files under dir, sorted so loading is deterministic. */
function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}
