import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { CollapsibleContent } from "@/components/collapsible";
import { streamdownPlugins } from "@/lib/streamdown";
import { cn } from "@/lib/utils";

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string;
};

/** The reasoning text, rendered as markdown. */
export function ReasoningContent({ className, children, ...props }: ReasoningContentProps) {
  return (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className,
      )}
      {...props}
    >
      <Streamdown plugins={streamdownPlugins}>{children}</Streamdown>
    </CollapsibleContent>
  );
}
