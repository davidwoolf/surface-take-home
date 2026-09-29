import type { UIMessage } from "ai";

/** read_section text from earlier turns is cut to this many characters. */
export const TRIMMED_SECTION_CHARS = 400;

const FINISHED_TOOL_STATES = new Set(["output-available", "output-error"]);

type Part = UIMessage["parts"][number];
type ToolPart = Extract<Part, { type: `tool-${string}` }>;

/**
 * Prepares the conversation for the model:
 * - removes tool calls that never finished (a response stopped mid-tool), which providers reject
 * - cuts read_section text in all but the latest assistant message, keeping the context bounded
 *   (the agent can read the section again if a follow-up needs it)
 */
export function prepareHistory<M extends UIMessage>(messages: readonly M[]): M[] {
  const lastAssistant = messages.findLastIndex((m) => m.role === "assistant");
  return messages.map((message, index) => {
    if (message.role !== "assistant") return message;
    const parts = message.parts
      .filter((part) => !isToolPart(part) || FINISHED_TOOL_STATES.has(part.state))
      .map((part) => (index < lastAssistant ? trimPart(part) : part));
    return { ...message, parts };
  });
}

function trimPart(part: Part): Part {
  if (part.type !== "tool-read_section" || !isToolPart(part) || part.state !== "output-available") return part;
  const output = part.output as { text?: unknown } | undefined;
  if (typeof output?.text !== "string" || output.text.length <= TRIMMED_SECTION_CHARS) return part;
  return {
    ...part,
    output: {
      ...output,
      text: `${output.text.slice(0, TRIMMED_SECTION_CHARS)}… [trimmed from an earlier turn; call read_section again for the full text]`,
    },
  } as Part;
}

function isToolPart(part: Part): part is ToolPart {
  return part.type.startsWith("tool-") && "state" in part;
}
