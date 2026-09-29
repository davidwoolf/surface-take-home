import type { ComponentProps } from "react";
import { Collapsible } from "@/components/collapsible";
import { cn } from "@/lib/utils";

export type ToolProps = ComponentProps<typeof Collapsible>;

/** A collapsible card for one tool call. */
export function Tool({ className, ...props }: ToolProps) {
  return <Collapsible className={cn("group not-prose mb-4 w-full rounded-md border", className)} {...props} />;
}
