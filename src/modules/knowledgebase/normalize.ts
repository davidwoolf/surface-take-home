// The one text normalization shared by ingest, search and quote verification.

const INVISIBLE = /[­​-‍⁠﻿]/g;
const SPACES = /[   -   　]/g;
const SINGLE_QUOTES = /[‘’‚‛′]/g;
const DOUBLE_QUOTES = /[“”„‟″]/g;
const DASHES = /[‐-―−]/g;

/**
 * Cleans extracted text for storage: expands ligatures and compatibility
 * characters (NFKC), removes invisible characters and turns unusual spaces
 * into plain spaces. Keeps case, punctuation and line breaks.
 */
export function cleanText(text: string): string {
  return text.normalize("NFKC").replace(INVISIBLE, "").replace(SPACES, " ");
}

/**
 * Reduces text to a comparison key, so a quote matches its source despite
 * differences in quotes, dashes, case and whitespace.
 */
export function toMatchKey(text: string): string {
  return cleanText(text)
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
