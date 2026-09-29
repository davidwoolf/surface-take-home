import { BookOpenIcon, CircleAlertIcon, CircleCheckIcon, LinkIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { QuoteCheck } from "../quotes";

/** Where a quote's check stands: in progress, done, or not done because the answer stopped or failed. */
export type QuoteStatus = "checking" | "not-checked" | QuoteCheck;

/** A verbatim handbook quote with its source and whether it was found in the handbook. */
export function QuoteCard({ text, source, status }: { text: string; source: string; status: QuoteStatus }) {
  const check = typeof status === "string" ? undefined : status;
  const foundElsewhere = check?.foundIn && check.foundIn.source !== source;

  return (
    <Card className="gap-3 py-3">
      <CardContent className="px-4 text-sm">
        <MessageResponse>{text}</MessageResponse>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-2 px-4 text-muted-foreground text-xs">
        <BookOpenIcon aria-hidden />
        <span>{check?.foundIn?.source ?? source}</span>
        <QuoteBadge status={status} />
        {foundElsewhere && <span>(cited as {source})</span>}
        {check?.foundIn?.links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2"
          >
            <LinkIcon aria-hidden />
            {link.text}
          </a>
        ))}
      </CardFooter>
    </Card>
  );
}

function QuoteBadge({ status }: { status: QuoteStatus }) {
  if (status === "checking") return <Shimmer className="text-xs">Checking quote…</Shimmer>;
  if (status === "not-checked") return <Badge variant="outline">Not checked</Badge>;
  if (status.status === "verified") {
    return (
      <Badge variant="secondary">
        <CircleCheckIcon data-icon="inline-start" />
        Verified
      </Badge>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="destructive">
          <CircleAlertIcon data-icon="inline-start" />
          Not found in handbook
        </Badge>
      </TooltipTrigger>
      <TooltipContent>This text doesn't appear in the handbook, so treat it with caution.</TooltipContent>
    </Tooltip>
  );
}
