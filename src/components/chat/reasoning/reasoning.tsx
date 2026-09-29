import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { type ComponentProps, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Collapsible } from "@/components/collapsible";
import { cn } from "@/lib/utils";

type ReasoningState = {
  isStreaming: boolean;
  isOpen: boolean;
  /** Seconds spent reasoning, once it has finished. */
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningState | null>(null);

/** Reasoning state for the trigger and content inside a Reasoning panel. */
export function useReasoning(): ReasoningState {
  const context = useContext(ReasoningContext);
  if (!context) throw new Error("Reasoning components must be used within Reasoning");
  return context;
}

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

const AUTO_CLOSE_DELAY_MS = 1000;

/**
 * A collapsible reasoning panel. It opens while the reasoning streams, closes
 * shortly after it ends (once), and records how long the reasoning took.
 */
export function Reasoning({ className, isStreaming = false, open, defaultOpen, onOpenChange, children, ...props }: ReasoningProps) {
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    defaultProp: defaultOpen ?? isStreaming,
    onChange: onOpenChange,
    prop: open,
  });
  const [duration, setDuration] = useState<number>();
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const hasStreamed = useRef(isStreaming);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming) {
      hasStreamed.current = true;
      startedAt.current ??= Date.now();
      if (!isOpen && defaultOpen !== false) setIsOpen(true);
    } else if (startedAt.current !== null) {
      setDuration(Math.ceil((Date.now() - startedAt.current) / 1000));
      startedAt.current = null;
    }
  }, [isStreaming, isOpen, setIsOpen, defaultOpen]);

  useEffect(() => {
    if (!hasStreamed.current || isStreaming || !isOpen || hasAutoClosed) return;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setHasAutoClosed(true);
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

  const state = useMemo(() => ({ isStreaming, isOpen, duration }), [isStreaming, isOpen, duration]);

  return (
    <ReasoningContext.Provider value={state}>
      <Collapsible className={cn("not-prose mb-4", className)} open={isOpen} onOpenChange={setIsOpen} {...props}>
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
}
