import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

/** The left side of the footer, for hints or controls. */
export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return <div className={cn("flex min-w-0 items-center gap-1", className)} {...props} />;
}
