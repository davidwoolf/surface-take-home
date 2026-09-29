import type { ChatStatus } from "ai";
import { CornerDownLeftIcon, SquareIcon, XIcon } from "lucide-react";
import type { ComponentProps, MouseEvent } from "react";
import { InputGroupButton } from "@/components/input-group";
import { Spinner } from "@/components/spinner";

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

/** Send, or Stop while a response is in progress. */
export function PromptInputSubmit({ variant = "default", size = "icon-sm", status, onStop, onClick, children, ...props }: PromptInputSubmitProps) {
  const isGenerating = status === "submitted" || status === "streaming";
  const icon =
    status === "submitted" ? (
      <Spinner />
    ) : status === "streaming" ? (
      <SquareIcon className="size-4" />
    ) : status === "error" ? (
      <XIcon className="size-4" />
    ) : (
      <CornerDownLeftIcon className="size-4" />
    );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isGenerating && onStop) {
      event.preventDefault();
      onStop();
      return;
    }
    onClick?.(event);
  };

  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? icon}
    </InputGroupButton>
  );
}
