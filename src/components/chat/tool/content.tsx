import type { ComponentProps } from "react";
import { CollapsibleContent } from "@/components/collapsible";
import { cn } from "@/lib/utils";

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

/** The expandable body of a tool card. */
export function ToolContent({ className, ...props }: ToolContentProps) {
  return (
    <CollapsibleContent
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className,
      )}
      {...props}
    />
  );
}
