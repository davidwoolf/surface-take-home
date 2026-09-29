import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { PROVIDERS, type ProviderId } from "./providers";

export type ErrorCategory = "auth" | "rate-limit" | "unavailable" | "network" | "context-too-long" | "unknown";

export type ChatError = { category: ErrorCategory; message: string };

const CONTEXT_TOO_LONG = /prompt is too long|context[_ ]length|maximum context|too many tokens|exceeds the maximum number of tokens|input is too long/i;
const NETWORK_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);

/**
 * Maps a provider or SDK error to a category and a message that's safe to show
 * the user. Never includes keys, request bodies or raw provider responses.
 */
export function toChatError(error: unknown, provider: ProviderId): ChatError {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const { label, keyEnv } = PROVIDERS[provider];

  if (LoadAPIKeyError.isInstance(cause)) {
    return { category: "auth", message: `No API key for ${label}. Set ${keyEnv} in .env and restart.` };
  }
  if (APICallError.isInstance(cause)) {
    const status = cause.statusCode;
    if (status === 401 || status === 403) {
      return { category: "auth", message: `The API key for ${label} was rejected. Check ${keyEnv} in .env and restart.` };
    }
    if (status === 429) {
      return { category: "rate-limit", message: `${label} is rate limiting requests. Wait a moment and try again.` };
    }
    if (CONTEXT_TOO_LONG.test(`${cause.message} ${cause.responseBody ?? ""}`)) {
      return { category: "context-too-long", message: "This conversation is too long for the model. Start a new chat." };
    }
    if (status !== undefined && status >= 500) {
      return { category: "unavailable", message: `${label} is temporarily unavailable. Try again in a moment.` };
    }
  }
  if (isNetworkError(cause)) {
    return { category: "network", message: `Couldn't reach ${label}. Check your internet connection and try again.` };
  }
  return { category: "unknown", message: "Something went wrong while answering. Try again." };
}

function isNetworkError(error: unknown): boolean {
  for (let current = error, depth = 0; current instanceof Error && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && NETWORK_CODES.has(code)) return true;
    if (current instanceof TypeError && /fetch failed|network/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}
