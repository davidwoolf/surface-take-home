import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { TRIMMED_SECTION_CHARS, prepareHistory } from "../history";

const longText = "x".repeat(TRIMMED_SECTION_CHARS + 100);

const readPart = (id: string) =>
  ({
    type: "tool-read_section",
    toolCallId: `read-${id}`,
    state: "output-available",
    input: { id },
    output: { id, text: longText, links: [] },
  }) as UIMessage["parts"][number];

const user = (id: string, text: string): UIMessage => ({ id, role: "user", parts: [{ type: "text", text }] });
const assistant = (id: string, parts: UIMessage["parts"]): UIMessage => ({ id, role: "assistant", parts });

describe("prepareHistory", () => {
  it("trims read_section text in earlier turns and keeps the latest turn whole", () => {
    const messages = [
      user("u1", "first"),
      assistant("a1", [readPart("s1"), { type: "text", text: "answer one" }]),
      user("u2", "second"),
      assistant("a2", [readPart("s2")]),
      user("u3", "third"),
    ];
    const [, first, , latest] = prepareHistory(messages);
    const firstOutput = (first!.parts[0] as { output: { text: string } }).output.text;
    expect(firstOutput.startsWith("x".repeat(TRIMMED_SECTION_CHARS))).toBe(true);
    expect(firstOutput).toContain("call read_section again");
    expect(first!.parts[1]).toEqual({ type: "text", text: "answer one" });
    expect((latest!.parts[0] as { output: { text: string } }).output.text).toBe(longText);
  });

  it("drops tool calls that never finished, such as a response stopped mid-tool", () => {
    const stopped = assistant("a1", [
      { type: "text", text: "Let me look" },
      { type: "tool-search_handbook", toolCallId: "c1", state: "input-available", input: { query: "leave" } } as UIMessage["parts"][number],
    ]);
    const [, cleaned] = prepareHistory([user("u1", "q"), stopped, user("u2", "follow up")]);
    expect(cleaned!.parts).toEqual([{ type: "text", text: "Let me look" }]);
  });

  it("leaves user messages and short outputs untouched", () => {
    const messages = [user("u1", "q")];
    expect(prepareHistory(messages)).toEqual(messages);
  });
});
