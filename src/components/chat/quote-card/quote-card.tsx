import { BookOpenIcon, LinkIcon } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/card";
import { MessageResponse } from "@/components/chat/message";
import type { QuoteCheck } from "@/modules/chat/quotes";
import { QuoteStatusBadge } from "./status-badge";

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
        <QuoteStatusBadge status={status} />
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
