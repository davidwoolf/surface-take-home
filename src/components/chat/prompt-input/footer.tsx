import type { ComponentProps } from "react";
import { InputGroupAddon } from "@/components/input-group";
import { cn } from "@/lib/utils";

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, "align">;

/** The row under the message box: tools on the left, submit on the right. */
export function PromptInputFooter({ className, ...props }: PromptInputFooterProps) {
  return <InputGroupAddon align="block-end" className={cn("justify-between gap-1", className)} {...props} />;
}
