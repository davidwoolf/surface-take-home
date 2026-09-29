import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { toChatError } from "../errors";

const apiError = (statusCode: number, responseBody = "") =>
  new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://api.example.com/v1/messages",
    requestBodyValues: { secret: "sk-should-not-leak" },
    statusCode,
    responseBody,
    isRetryable: false,
  });

describe("toChatError", () => {
  it.each([
    [401, "auth", "The API key for Claude (Anthropic) was rejected. Check ANTHROPIC_API_KEY in .env and restart."],
    [403, "auth", "The API key for Claude (Anthropic) was rejected. Check ANTHROPIC_API_KEY in .env and restart."],
    [429, "rate-limit", "Claude (Anthropic) is rate limiting requests. Wait a moment and try again."],
    [529, "unavailable", "Claude (Anthropic) is temporarily unavailable. Try again in a moment."],
  ])("maps HTTP %i to %s", (status, category, message) => {
    expect(toChatError(apiError(status), "anthropic")).toEqual({ category, message });
  });

  it("recognizes a context-length error from the response body", () => {
    const error = apiError(400, '{"error":{"message":"prompt is too long: 250000 tokens"}}');
    expect(toChatError(error, "anthropic").category).toBe("context-too-long");
  });

  it("looks through a RetryError to its last error", () => {
    const error = new RetryError({ message: "retries exhausted", reason: "maxRetriesExceeded", errors: [apiError(429)] });
    expect(toChatError(error, "openai")).toMatchObject({ category: "rate-limit", message: expect.stringContaining("ChatGPT") });
  });

  it("reports a missing key", () => {
    const error = new LoadAPIKeyError({ message: "Google Generative AI API key is missing." });
    expect(toChatError(error, "google")).toEqual({
      category: "auth",
      message: "No API key for Gemini (Google). Set GOOGLE_GENERATIVE_AI_API_KEY in .env and restart.",
    });
  });

  it("recognizes network failures through the error's cause", () => {
    const error = new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo"), { code: "ENOTFOUND" }) });
    expect(toChatError(error, "anthropic").category).toBe("network");
  });

  it("falls back to a generic message that leaks nothing", () => {
    const result = toChatError(new Error("boom: sk-should-not-leak"), "anthropic");
    expect(result).toEqual({ category: "unknown", message: "Something went wrong while answering. Try again." });
    expect(JSON.stringify(toChatError(apiError(400, "sk-should-not-leak"), "anthropic"))).not.toContain("sk-should-not-leak");
  });
});
