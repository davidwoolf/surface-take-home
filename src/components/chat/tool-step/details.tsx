import { MessageResponse } from "@/components/chat/message";
import type { HandbookToolPart } from "./tool-step";

/** A tool step's result: search hits with their sources, or the section that was read. */
export function ToolStepDetails({ part }: { part: HandbookToolPart }) {
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
