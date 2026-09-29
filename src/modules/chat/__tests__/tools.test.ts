import { describe, expect, it } from "vitest";
import { buildKnowledgebase } from "@/modules/knowledgebase/loader";
import { createHandbookTools, readSectionInput, searchHandbookInput } from "../tools";

const kb = buildKnowledgebase([
  {
    id: "people/time-off",
    markdown:
      "---\ntitle: Time off\nsource: contents/handbook/people/time-off.md\n---\n\n# Time off\n\n## Parental leave\n\nParental leave is 24 weeks. See the [policy](https://example.com/p).\n",
  },
]);
const tools = createHandbookTools(kb);
const options = { toolCallId: "call-1", messages: [], context: {} };

describe("search_handbook", () => {
  it("returns hits for a query", async () => {
    const output = await tools.search_handbook.execute!({ query: "parental leave" }, options);
    expect(output).toMatchObject({ query: "parental leave", hits: [{ sectionId: "people/time-off#parental-leave" }] });
  });

  it("returns an empty list when nothing matches", async () => {
    expect(await tools.search_handbook.execute!({ query: "kubernetes" }, options)).toEqual({
      query: "kubernetes",
      hits: [],
    });
  });

  it("rejects an empty query", () => {
    expect(searchHandbookInput.safeParse({ query: "  " }).success).toBe(false);
    expect(searchHandbookInput.safeParse({}).success).toBe(false);
  });
});

describe("read_section", () => {
  it("returns the whole section with its links", async () => {
    const output = await tools.read_section.execute!({ id: "people/time-off#parental-leave" }, options);
    expect(output).toMatchObject({
      headingPath: ["Time off", "Parental leave"],
      links: [{ text: "policy", url: "https://example.com/p" }],
    });
  });

  it("accepts a chunk id by falling back to its section", async () => {
    const output = await tools.read_section.execute!({ id: "people/time-off#parental-leave:1" }, options);
    expect(output).toMatchObject({ id: "people/time-off#parental-leave" });
  });

  it("throws a helpful error for an unknown id, which the SDK returns to the model as a tool error", async () => {
    await expect(tools.read_section.execute!({ id: "people/nope" }, options)).rejects.toThrow(
      'No section with id "people/nope". Use an id from search_handbook results.',
    );
  });

  it("rejects an empty id", () => {
    expect(readSectionInput.safeParse({ id: "" }).success).toBe(false);
  });
});
