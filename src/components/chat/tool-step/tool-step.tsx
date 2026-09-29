import { Tool, ToolContent, ToolHeader } from "@/components/chat/tool";
import type { HandbookUIMessage } from "@/modules/chat/message";
import { ToolStepDetails } from "./details";

type Part = HandbookUIMessage["parts"][number];
export type HandbookToolPart = Extract<Part, { type: "tool-search_handbook" | "tool-read_section" }>;

export function isHandbookToolPart(part: Part): part is HandbookToolPart {
  return part.type === "tool-search_handbook" || part.type === "tool-read_section";
}

/** One tool call as a collapsible step: "Searched: …" or "Read: …", with its result inside. */
export function ToolStep({ part }: { part: HandbookToolPart }) {
  return (
    <Tool>
      <ToolHeader className="text-left" state={part.state} title={titleFor(part)} />
      <ToolContent className="px-3 pb-3 text-sm">
        <ToolStepDetails part={part} />
      </ToolContent>
    </Tool>
  );
}

function titleFor(part: HandbookToolPart): string {
  if (part.type === "tool-search_handbook") {
    return part.input?.query ? `Searched: "${part.input.query}"` : "Searching the handbook";
  }
  if (part.state === "output-available") return `Read: ${part.output.source}`;
  return part.input?.id ? "Reading a section" : "Reading";
}
