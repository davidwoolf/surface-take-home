import { BREADCRUMB_SEPARATOR } from "@/modules/knowledgebase/breadcrumb";
import type { Knowledgebase } from "@/modules/knowledgebase/loader";
import { toPlainText } from "@/modules/knowledgebase/markdown";
import { toMatchKey } from "@/modules/knowledgebase/normalize";
import type { Section } from "@/modules/knowledgebase/types";
import { QUOTE_SOURCE_PREFIX } from "./prompt";

// Quotes in answers look like this (see prompt.ts):
//
//   > exact words copied from the section
//   > — Source: People › Offboarding › Voluntary departure

export type ParsedQuote = {
  /** The quoted text, without the leading "> " markers or the source line. */
  text: string;
  /** The source exactly as written in the answer. */
  source: string;
};

export type QuoteCheck = {
  text: string;
  /** The source as written in the answer. */
  source: string;
  status: "verified" | "unverified";
  /**
   * Where the quote was actually found, when verified: the cited section, or another
   * section when the cited source was wrong or didn't resolve.
   */
  foundIn?: { sectionId: string; source: string; links: { text: string; url: string }[] };
};

const BLOCKQUOTE_LINE = /^\s*>\s?(.*)$/;
const SOURCE_LINE = new RegExp(`^${QUOTE_SOURCE_PREFIX}\\s*(.+?)\\s*$`);
/** Separators people or models might use between breadcrumb steps. */
const CRUMB_SEPARATOR = /\s*(?:›|>|»|\/)\s*/;
/** "…" or "..." joins separate passages; each fragment must be found on its own. */
const ELLIPSIS = /\s*(?:…|\.\.\.)\s*/;
/** Fragments shorter than this after normalization aren't worth checking alone. */
const MIN_FRAGMENT_CHARS = 8;

/** Finds every blockquote whose last line is a `— Source:` line. Other blockquotes aren't handbook quotes. */
export function parseQuotes(markdown: string): ParsedQuote[] {
  const quotes: ParsedQuote[] = [];
  let block: string[] = [];

  const flush = () => {
    const last = block.at(-1);
    const source = last === undefined ? null : SOURCE_LINE.exec(last.trim());
    if (source) {
      const text = block.slice(0, -1).join("\n").trim();
      if (text) quotes.push({ text, source: source[1]! });
    }
    block = [];
  };

  for (const line of markdown.split("\n")) {
    const match = BLOCKQUOTE_LINE.exec(line);
    if (match) block.push(match[1]!);
    else flush();
  }
  flush();
  return quotes;
}

/** Checks each quote in an answer against the handbook. */
export function verifyQuotes(kb: Knowledgebase, answer: string): QuoteCheck[] {
  return parseQuotes(answer).map((quote) => verifyQuote(kb, quote));
}

export function verifyQuote(kb: Knowledgebase, quote: ParsedQuote): QuoteCheck {
  const fragments = quoteFragments(quote.text);
  const contains = (section: Section) => {
    const haystack = sectionKey(section);
    return fragments.length > 0 && fragments.every((fragment) => haystack.includes(fragment));
  };

  const cited = resolveSource(kb, quote.source).find(contains);
  const found = cited ?? kb.sections.find(contains);
  if (!found) return { ...quote, status: "unverified" };

  return {
    ...quote,
    status: "verified",
    foundIn: {
      sectionId: found.id,
      source: found.breadcrumb.join(BREADCRUMB_SEPARATOR),
      links: linksIn(found.text).filter((link) => toMatchKey(quote.text).includes(toMatchKey(link.text))),
    },
  };
}

/**
 * Sections whose breadcrumb matches the cited source. Accepts any common
 * separator, and a source that leaves off leading steps ("Offboarding ›
 * Voluntary departure" still matches "People › Offboarding › Voluntary departure").
 */
export function resolveSource(kb: Knowledgebase, source: string): Section[] {
  const cited = source.split(CRUMB_SEPARATOR).map((crumb) => toMatchKey(crumb)).filter(Boolean);
  if (cited.length === 0) return [];
  return kb.sections.filter((section) => {
    const crumbs = section.breadcrumb.map((crumb) => toMatchKey(crumb));
    if (crumbs.length < cited.length) return false;
    const tail = crumbs.slice(crumbs.length - cited.length);
    return tail.every((crumb, i) => crumb === cited[i]);
  });
}

function quoteFragments(text: string): string[] {
  return text
    .split(ELLIPSIS)
    .map((fragment) => comparable(fragment))
    .filter((fragment) => fragment.length >= MIN_FRAGMENT_CHARS);
}

const sectionKeys = new WeakMap<Section, string>();
function sectionKey(section: Section): string {
  let key = sectionKeys.get(section);
  if (key === undefined) {
    key = comparable(section.text);
    sectionKeys.set(section, key);
  }
  return key;
}

/**
 * Text reduced for comparison: links to their text, markdown emphasis, list
 * markers and table pipes removed, then the shared normalization.
 */
function comparable(markdown: string): string {
  return toMatchKey(
    toPlainText(markdown)
      .replace(/(\*\*|__|`)/g, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
      .replace(/\|/g, " ")
      .replace(/^\s*-{3,}\s*$/gm, ""),
  )
    .replace(/(?:\s-{3,})+/g, " ")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}

function linksIn(markdown: string): { text: string; url: string }[] {
  return [...markdown.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ text: m[1]!, url: m[2]! }));
}
