// Shapes shared by the knowledgebase loader, chunking and search.

export type HandbookDocument = {
  /** Path of the markdown file inside knowledgebase/, without ".md" (e.g. "brand/art-requests"). */
  id: string;
  title: string;
  /** The handbook's own source path for the page (e.g. "contents/handbook/brand/art-requests.md"). */
  sourcePath: string;
  sectionIds: string[];
};

export type Section = {
  id: string;
  documentId: string;
  title: string;
  /** Document title first, then each enclosing heading. */
  headingPath: string[];
  /** Where the section sits in the handbook, for citing: area, document title, headings (e.g. People › Offboarding › Voluntary departure). */
  breadcrumb: string[];
  /** 1 for the document's introduction, otherwise the markdown heading level (2–6). */
  level: number;
  /** Markdown body, without the heading line. */
  text: string;
  chunkIds: string[];
};

export type Chunk = {
  id: string;
  sectionId: string;
  documentId: string;
  headingPath: string[];
  breadcrumb: string[];
  /** Markdown, including inline links. */
  text: string;
};
