import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { CollapsibleTrigger } from "@/components/collapsible";
import { Shimmer } from "@/components/shimmer";
import { cn } from "@/lib/utils";
import { useReasoning } from "./reasoning";

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

/** "Thinking…" while reasoning streams, then "Thought for N seconds"; toggles the panel. */
export function ReasoningTrigger({ className, children, ...props }: ReasoningTriggerProps) {
  const { isStreaming, isOpen, duration } = useReasoning();
  const label =
    isStreaming || duration === 0 ? (
      <Shimmer duration={1}>Thinking...</Shimmer>
    ) : (
      <p>{duration === undefined ? "Thought for a few seconds" : `Thought for ${duration} seconds`}</p>
    );

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <BrainIcon className="size-4" />
          {label}
          <ChevronDownIcon className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
        </>
      )}
    </CollapsibleTrigger>
  );
}
