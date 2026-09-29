import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { Badge } from "@/components/badge";
import { Shimmer } from "@/components/shimmer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import type { QuoteStatus } from "./quote-card";

/** Verified, Not found in handbook, Checking quote…, or Not checked. */
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
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
