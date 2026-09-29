import { tool } from "ai";
import { z } from "zod";
import type { Knowledgebase } from "@/modules/knowledgebase/loader";
import { DEFAULT_SEARCH_LIMIT, getSection, searchHandbook } from "@/modules/knowledgebase/search";

export const searchHandbookInput = z.object({
  query: z.string().trim().min(1).describe("Keywords to search for, e.g. 'parental leave eligibility'"),
});

export const readSectionInput = z.object({
  id: z.string().trim().min(1).describe("A section id from search_handbook, e.g. 'people/time-off#parental-leave'"),
});

/** The agent's handbook tools, bound to a loaded knowledgebase. */
export function createHandbookTools(kb: Knowledgebase) {
  return {
    search_handbook: tool({
      description:
        "Keyword search over the handbook. Returns up to one hit per section: its source (where it is in the handbook), its id, a short snippet and a score. " +
        "Use specific keywords, and search again with different wording or synonyms if the results miss. " +
        "Snippets are previews; read a section before quoting it.",
      inputSchema: searchHandbookInput,
      execute: async ({ query }) => ({ query, hits: searchHandbook(kb, query, DEFAULT_SEARCH_LIMIT) }),
    }),

    read_section: tool({
      description:
        "Reads one whole handbook section by id (from search_handbook results). Returns its source (cite this), markdown text and the links it contains. " +
        "Quote only text that appears here, word for word.",
      inputSchema: readSectionInput,
      execute: async ({ id }) => {
        // Section ids from search hits; tolerate a chunk id ("section:2") by dropping the chunk number.
        const section = getSection(kb, id) ?? getSection(kb, id.replace(/:\d+$/, ""));
        if (!section) throw new Error(`No section with id "${id}". Use an id from search_handbook results.`);
        return section;
      },
    }),
  };
}

export type HandbookTools = ReturnType<typeof createHandbookTools>;
