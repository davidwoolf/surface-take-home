import { APICallError } from "ai";

export type ChatErrorView =
  /** The server can't answer at all; the chat is replaced by instructions. */
  | { kind: "unavailable"; message: string }
  /** This turn failed; shown inline with Retry. */
  | { kind: "turn"; message: string };

/** Turns a useChat error into what the UI shows. Messages from the server are already user-safe. */
export function describeChatError(error: Error): ChatErrorView {
  if (APICallError.isInstance(error)) {
    const body = parseJson(error.responseBody);
    if (error.statusCode === 503 && body?.message) return { kind: "unavailable", message: body.message };
    if (body?.message) return { kind: "turn", message: body.message };
  }
  if (error instanceof TypeError) {
    return { kind: "turn", message: "Couldn't reach the Surface server. Check that `pnpm dev` is still running, then retry." };
  }
  return { kind: "turn", message: error.message || "Something went wrong while answering. Try again." };
}

function parseJson(text: string | undefined): { code?: string; message?: string } | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as { code?: string; message?: string }) : null;
  } catch {
    return null;
  }
}
