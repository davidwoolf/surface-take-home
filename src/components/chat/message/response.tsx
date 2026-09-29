import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { streamdownPlugins } from "@/lib/streamdown";
import { cn } from "@/lib/utils";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

/** Markdown that renders correctly while it streams in. Re-renders only when its text or animation changes. */
export const MessageResponse = memo(
  function MessageResponse({ className, ...props }: MessageResponseProps) {
    return (
      <Streamdown
        className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
        plugins={streamdownPlugins}
        {...props}
      />
    );
  },
  (prev, next) => prev.children === next.children && prev.isAnimating === next.isAnimating,
);
