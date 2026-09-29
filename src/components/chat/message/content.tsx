import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

/** The body of a message: a bubble for the user, plain for the assistant. */
export function MessageContent({ className, ...props }: MessageContentProps) {
  return (
    <div
      className={cn(
        "is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
        "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
        "group-[.is-assistant]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
