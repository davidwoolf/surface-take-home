import type { HandbookDocument, Section } from "./types";

/** A section's body split into blocks (paragraphs, whole lists, tables, code blocks), kept for chunking. */
export type ParsedSection = Omit<Section, "chunkIds"> & { blocks: string[] };
export type ParsedDocument = { document: HandbookDocument; sections: ParsedSection[] };

export class MarkdownError extends Error {}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE = /^```/;

/**
 * Parses one knowledgebase file. The file starts with frontmatter (`title`,
 * `source`) and a `# Title` line; every `##`–`######` heading starts a section.
 * Text before the first `##` is the document's introduction.
 */
export function parseDocument(id: string, markdown: string): ParsedDocument {
  const frontmatter = FRONTMATTER.exec(markdown);
  if (!frontmatter) throw new MarkdownError(`${id}.md has no frontmatter`);
  const fields = parseFrontmatter(frontmatter[1]!);
  const title = fields.title;
  const sourcePath = fields.source;
  if (!title || !sourcePath) throw new MarkdownError(`${id}.md is missing a title or source in its frontmatter`);

  const sections: ParsedSection[] = [];
  const headingStack: { level: number; text: string }[] = [];
  let current: { title: string; level: number; headingPath: string[]; lines: string[] } = {
    title,
    level: 1,
    headingPath: [title],
    lines: [],
  };
  const finish = () => {
    const blocks = splitBlocks(current.lines);
    if (blocks.length === 0) return;
    sections.push({
      id: "",
      documentId: id,
      title: current.title,
      headingPath: current.headingPath,
      level: current.level,
      text: blocks.join("\n\n"),
      blocks,
    });
  };

  let inFence = false;
  for (const line of markdown.slice(frontmatter[0].length).split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    const heading = inFence ? null : HEADING.exec(line);
    if (!heading) {
      current.lines.push(line);
      continue;
    }
    const level = heading[1]!.length;
    if (level === 1) continue; // the document title, already taken from frontmatter
    finish();
    while (headingStack.length && headingStack.at(-1)!.level >= level) headingStack.pop();
    headingStack.push({ level, text: heading[2]! });
    current = { title: heading[2]!, level, headingPath: [title, ...headingStack.map((h) => h.text)], lines: [] };
  }
  finish();

  const usedIds = new Set<string>();
  for (const section of sections) {
    section.id = uniqueId(section.level === 1 ? id : `${id}#${slugify(section.title)}`, usedIds);
  }

  return {
    document: { id, title, sourcePath, sectionIds: sections.map((s) => s.id) },
    sections,
  };
}

/** Splits lines into blocks on blank lines, keeping fenced code blocks whole. */
function splitBlocks(lines: readonly string[]): string[] {
  const blocks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push(text);
    buffer = [];
  };
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === "") flush();
    else buffer.push(line);
  }
  flush();
  return blocks;
}

function parseFrontmatter(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const match = /^(\w+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const raw = match[2]!.trim();
    fields[match[1]!] = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
  }
  return fields;
}

/** Markdown to plain text for searching and quote matching: link syntax and emphasis markers removed. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)\s]*\)/g, "$1")
    .replace(/^```.*$/gm, "")
    .replace(/\\([\\|#])/g, "$1");
}

export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}
