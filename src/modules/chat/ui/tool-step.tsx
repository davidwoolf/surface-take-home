import { MessageResponse } from "@/components/chat/message";
import { Tool, ToolContent, ToolHeader } from "@/components/chat/tool";
import type { HandbookUIMessage } from "../message";

type Part = HandbookUIMessage["parts"][number];
export type HandbookToolPart = Extract<Part, { type: "tool-search_handbook" | "tool-read_section" }>;

export function isHandbookToolPart(part: Part): part is HandbookToolPart {
  return part.type === "tool-search_handbook" || part.type === "tool-read_section";
}

/** One tool call as a collapsible step: "Searched: …" or "Read: …", with its result inside. */
export function ToolStep({ part }: { part: HandbookToolPart }) {
  return (
    <Tool>
      <ToolHeader className="text-left" type={part.type} state={part.state} title={titleFor(part)} />
      <ToolContent className="px-3 pb-3 text-sm">
        <ToolDetails part={part} />
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

function ToolDetails({ part }: { part: HandbookToolPart }) {
  if (part.state === "output-error") return <p className="text-destructive">{part.errorText}</p>;
  if (part.state !== "output-available") return null;

  if (part.type === "tool-search_handbook") {
    if (part.output.hits.length === 0) return <p className="text-muted-foreground">No matches.</p>;
    return (
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {part.output.hits.map((hit) => (
          <li key={hit.sectionId}>
            <span className="font-medium">{hit.source}</span>
            <span className="text-muted-foreground"> — {hit.snippet}</span>
          </li>
        ))}
      </ol>
    );
  }
  return <MessageResponse className="text-muted-foreground">{part.output.text}</MessageResponse>;
}
