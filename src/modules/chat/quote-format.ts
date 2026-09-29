import { QUOTE_SOURCE_PREFIX } from "./prompt";

// Quotes in answers look like this (see prompt.ts). Shared by the server's
// verifier and the client's quote cards, so both split answers the same way.
//
//   > exact words copied from the section
//   > — Source: People › Offboarding › Voluntary departure

export type ParsedQuote = {
  /** The quoted text, without the leading "> " markers or the source line. */
  text: string;
  /** The source exactly as written in the answer. */
  source: string;
};

export type AnswerSegment = { kind: "markdown"; text: string } | ({ kind: "quote" } & ParsedQuote);

const BLOCKQUOTE_LINE = /^\s*>\s?(.*)$/;
const SOURCE_LINE = new RegExp(`^${QUOTE_SOURCE_PREFIX}\\s*(.+?)\\s*$`);

/**
 * Splits an answer into markdown and quotes. A quote is a blockquote whose last
 * line is a `— Source:` line; any other blockquote stays in the markdown.
 */
export function splitAnswer(markdown: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let prose: string[] = [];
  let block: { raw: string[]; content: string[] } = { raw: [], content: [] };

  const pushProse = (lines: string[]) => {
    const last = segments.at(-1);
    if (last?.kind === "markdown") last.text += `\n${lines.join("\n")}`;
    else if (lines.length) segments.push({ kind: "markdown", text: lines.join("\n") });
  };
  const flushBlock = () => {
    if (block.raw.length === 0) return;
    const source = SOURCE_LINE.exec(block.content.at(-1)!.trim());
    const text = block.content.slice(0, -1).join("\n").trim();
    if (source && text) {
      pushProse(prose);
      prose = [];
      segments.push({ kind: "quote", text, source: source[1]! });
    } else {
      prose.push(...block.raw);
    }
    block = { raw: [], content: [] };
  };

  for (const line of markdown.split("\n")) {
    const match = BLOCKQUOTE_LINE.exec(line);
    if (match) {
      block.raw.push(line);
      block.content.push(match[1]!);
    } else {
      flushBlock();
      prose.push(line);
    }
  }
  flushBlock();
  pushProse(prose);

  return segments
    .map((segment) => (segment.kind === "markdown" ? { ...segment, text: segment.text.trim() } : segment))
    .filter((segment) => segment.kind === "quote" || segment.text.length > 0);
}

/** Every quote in an answer, in order. */
export function parseQuotes(markdown: string): ParsedQuote[] {
  return splitAnswer(markdown).flatMap((segment) =>
    segment.kind === "quote" ? [{ text: segment.text, source: segment.source }] : [],
  );
}
