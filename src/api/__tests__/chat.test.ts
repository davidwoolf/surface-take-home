import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";
import { MAX_STEPS } from "@/modules/chat/agent";
import { type ScriptedModel, finish, reasoning, scriptedModel, text, toolCall } from "@/modules/chat/__tests__/mock-model";
import { buildKnowledgebase, type KnowledgebaseStatus } from "@/modules/knowledgebase/loader";
import { createApp } from "../app";

const knowledgebase: KnowledgebaseStatus = {
  status: "ready",
  knowledgebase: buildKnowledgebase([
    {
      id: "people/time-off",
      markdown:
        "---\ntitle: Time off\nsource: contents/handbook/people/time-off.md\n---\n\n# Time off\n\n## Parental leave\n\nParental leave is up to 24 weeks.\n",
    },
  ]),
};

function appWith(model: ScriptedModel, logError = vi.fn()) {
  return { app: createApp({ knowledgebase, chat: { provider: "anthropic", modelId: "mock-model", model }, logError }), logError };
}

const userMessage = (text: string, id = "u1") => ({ id, role: "user", parts: [{ type: "text", text }] });

function post(app: ReturnType<typeof createApp>, messages: unknown[], signal?: AbortSignal) {
  return app.request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
}

/** Parses the server-sent UI message stream into its chunks. */
async function chunks(response: Response): Promise<{ type: string; [key: string]: unknown }[]> {
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)));
}

describe("GET /api/health", () => {
  it("reports the knowledgebase and provider", async () => {
    const { app } = appWith(scriptedModel([text("hi")]));
    expect(await (await app.request("/api/health")).json()).toEqual({
      status: "ok",
      knowledgebase: { status: "ready", documents: 1, sections: 1 },
      provider: { id: "anthropic", model: "mock-model" },
    });
  });

  it("reports an unavailable knowledgebase and a missing provider", async () => {
    const app = createApp({ knowledgebase: { status: "invalid", message: "restore it" }, chat: null });
    expect(await (await app.request("/api/health")).json()).toEqual({
      status: "ok",
      knowledgebase: { status: "invalid", message: "restore it" },
      provider: null,
    });
  });
});

describe("POST /api/chat", () => {
  it("streams reasoning, tool calls and text, with start and finish metadata, in order", async () => {
    const model = scriptedModel([
      toolCall("search_handbook", { query: "parental leave" }),
      [...reasoning("The section answers it."), ...toolCall("read_section", { id: "people/time-off#parental-leave" })],
      [...text("Up to 24 weeks."), finish("stop")],
    ]);
    const { app } = appWith(model);

    const response = await post(app, [userMessage("How long is parental leave?")]);
    expect(response.status).toBe(200);
    const parts = await chunks(response);
    const types = parts.map((p) => p.type);

    const order = [
      "start",
      "tool-input-available",
      "tool-output-available",
      "reasoning-delta",
      "tool-input-available",
      "tool-output-available",
      "text-delta",
      "finish",
    ];
    // Each expected chunk type appears after the previous one.
    let from = 0;
    for (const type of order) {
      const at = types.indexOf(type, from);
      expect(at, `${type} after position ${from} in ${types.join(", ")}`).toBeGreaterThanOrEqual(0);
      from = at + 1;
    }

    expect(parts.find((p) => p.type === "start")).toMatchObject({ messageMetadata: { startedAt: expect.any(Number), model: "mock-model" } });
    expect(parts.find((p) => p.type === "finish")).toMatchObject({ messageMetadata: { finishedAt: expect.any(Number) } });
    const readOutput = parts.filter((p) => p.type === "tool-output-available")[1];
    expect(readOutput).toMatchObject({ output: { id: "people/time-off#parental-leave", text: "Parental leave is up to 24 weeks." } });
  });

  it("sends earlier turns to the model", async () => {
    const model = scriptedModel([[...text("Sure."), finish("stop")]]);
    const { app } = appWith(model);
    await (
      await post(app, [
        userMessage("How long is parental leave?", "u1"),
        { id: "a1", role: "assistant", parts: [{ type: "text", text: "Up to 24 weeks." }] },
        userMessage("And for adoption?", "u2"),
      ])
    ).text();
    expect(JSON.stringify(model.prompts[0])).toContain("How long is parental leave?");
    expect(JSON.stringify(model.prompts[0])).toContain("Up to 24 weeks.");
  });

  it("returns 503 when the knowledgebase isn't available", async () => {
    const app = createApp({
      knowledgebase: { status: "invalid", message: "Restore it with git checkout." },
      chat: { provider: "anthropic", modelId: "m", model: scriptedModel([]) },
    });
    const response = await post(app, [userMessage("hi")]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "KNOWLEDGEBASE_UNAVAILABLE", message: "Restore it with git checkout." });
  });

  it("returns 503 when no provider is configured", async () => {
    const response = await post(createApp({ knowledgebase, chat: null }), [userMessage("hi")]);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it.each([
    ["no body", undefined],
    ["an empty messages array", JSON.stringify({ messages: [] })],
    ["messages that aren't chat messages", JSON.stringify({ messages: [{ hello: "world" }] })],
  ])("returns 400 for %s", async (_name, body) => {
    const { app } = appWith(scriptedModel([]));
    const response = await app.request("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("turns a provider failure into a safe error part and keeps serving", async () => {
    const rateLimited = new APICallError({
      message: "rate limited",
      url: "https://api.example.com",
      requestBodyValues: {},
      statusCode: 429,
      responseBody: "raw provider body",
      isRetryable: false,
    });
    const model = scriptedModel([rateLimited, [...text("Recovered."), finish("stop")]]);
    const { app, logError } = appWith(model);

    const failed = await chunks(await post(app, [userMessage("hi")]));
    expect(failed.find((p) => p.type === "error")).toEqual({
      type: "error",
      errorText: "Claude (Anthropic) is rate limiting requests. Wait a moment and try again.",
    });
    expect(JSON.stringify(failed)).not.toContain("raw provider body");
    expect(logError).toHaveBeenCalledWith(rateLimited);

    const next = await chunks(await post(app, [userMessage("hi again")]));
    expect(next.some((p) => p.type === "text-delta" && p.delta === "Recovered.")).toBe(true);
  });

  it("keeps text streamed before a mid-stream failure", async () => {
    const model = scriptedModel([[...text("Partial answer"), { type: "error", error: new Error("stream broke") }]]);
    const { app } = appWith(model);
    const parts = await chunks(await post(app, [userMessage("hi")]));
    const textIndex = parts.findIndex((p) => p.type === "text-delta" && p.delta === "Partial answer");
    const errorIndex = parts.findIndex((p) => p.type === "error");
    expect(textIndex).toBeGreaterThanOrEqual(0);
    expect(errorIndex).toBeGreaterThan(textIndex);
    expect(parts[errorIndex]).toMatchObject({ errorText: "Something went wrong while answering. Try again." });
  });

  it("stops the model and runs no further steps when the request is aborted", async () => {
    const model = scriptedModel(
      [
        [...text("Searching for that now, one moment please"), ...toolCall("search_handbook", { query: "leave" })],
        [...text("second step"), finish("stop")],
      ],
      { chunkDelayMs: 30 },
    );
    const { app } = appWith(model);
    const controller = new AbortController();
    const response = await post(app, [userMessage("hi")], controller.signal);

    const reader = response.body!.getReader();
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(model.doStreamCalls).toHaveLength(1);
  });

  it(`stops after ${MAX_STEPS} steps when the model keeps calling tools`, async () => {
    const model = scriptedModel([toolCall("search_handbook", { query: "leave" })]);
    const { app } = appWith(model);
    await (await post(app, [userMessage("hi")])).text();
    expect(model.doStreamCalls).toHaveLength(MAX_STEPS);
  });
});
