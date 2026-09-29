import type { FormEvent, HTMLAttributes } from "react";
import { InputGroup } from "@/components/input-group";
import { cn } from "@/lib/utils";

export type PromptInputMessage = { text: string };

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void;
};

/** The message form. Submits the textarea's text and clears it. */
export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("message") ?? "");
    form.reset();
    onSubmit({ text }, event);
  };

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit} {...props}>
      <InputGroup className="overflow-hidden">{children}</InputGroup>
    </form>
  );
}
