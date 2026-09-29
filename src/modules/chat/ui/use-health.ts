import { useEffect, useState } from "react";

export type Health =
  | { status: "loading" }
  | { status: "ready"; provider: { id: string; model: string } }
  | { status: "unavailable"; message: string };

type HealthResponse = {
  knowledgebase: { status: string; message?: string };
  provider: { id: string; model: string } | null;
};

/** Checks once, on load, that the server has a knowledgebase and a provider. */
export function useHealth(): Health {
  const [health, setHealth] = useState<Health>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.json() as Promise<HealthResponse>)
      .then((body) => {
        if (cancelled) return;
        if (body.knowledgebase.status !== "ready") {
          setHealth({ status: "unavailable", message: body.knowledgebase.message ?? "The handbook couldn't be loaded." });
        } else if (!body.provider) {
          setHealth({ status: "unavailable", message: "No model provider is configured. Start the app with `pnpm dev`." });
        } else {
          setHealth({ status: "ready", provider: body.provider });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ status: "unavailable", message: "Couldn't reach the Surface server. Start the app with `pnpm dev`." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return health;
}
