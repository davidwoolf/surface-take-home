import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { Spinner } from "@/components/spinner";

export type TurnState = "running" | "done" | "stopped" | "failed";

const LABELS: Record<Exclude<TurnState, "running" | "done">, string> = { stopped: "Stopped", failed: "Failed" };

/** Elapsed time for one response: ticks while running, then freezes. */
export function TurnTimer({ start, end, state }: { start: number | undefined; end: number | undefined; state: TurnState }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [state]);

  if (start === undefined) return null;
  const seconds = (((end ?? (state === "running" ? now : start)) - start) / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs tabular-nums">
      {state === "running" && <Spinner />}
      <span>{seconds}s</span>
      {(state === "stopped" || state === "failed") && (
        <Badge variant={state === "failed" ? "destructive" : "outline"}>{LABELS[state]}</Badge>
      )}
    </div>
  );
}
