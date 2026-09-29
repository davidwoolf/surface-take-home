import { type ComponentProps, type KeyboardEvent, useState } from "react";
import { InputGroupTextarea } from "@/components/input-group";
import { cn } from "@/lib/utils";

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

/** The message box. Enter submits (unless the submit button is disabled); Shift+Enter adds a line. */
export function PromptInputTextarea({ className, onKeyDown, placeholder = "What would you like to know?", ...props }: PromptInputTextareaProps) {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter" || event.shiftKey) return;
    if (isComposing || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const { form } = event.currentTarget;
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submit?.disabled) form?.requestSubmit();
  };

  return (
    <InputGroupTextarea
      className={cn("field-sizing-content max-h-48 min-h-16", className)}
      name="message"
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      {...props}
    />
  );
}
