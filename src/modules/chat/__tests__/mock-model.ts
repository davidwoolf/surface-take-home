import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

// Test helpers: a mock model that plays one scripted stream per step.

type Part = LanguageModelV4StreamPart;

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

export const finish = (reason: "stop" | "tool-calls"): Part => ({
  type: "finish",
  finishReason: { unified: reason, raw: undefined },
  usage,
});

export const text = (value: string, id = "t1"): Part[] => [
  { type: "text-start", id },
  { type: "text-delta", id, delta: value },
  { type: "text-end", id },
];

export const reasoning = (value: string, id = "r1"): Part[] => [
  { type: "reasoning-start", id },
  { type: "reasoning-delta", id, delta: value },
  { type: "reasoning-end", id },
];

export const toolCall = (toolName: string, input: object, toolCallId = `call-${toolName}`): Part[] => [
  { type: "tool-call", toolCallId, toolName, input: JSON.stringify(input) },
  finish("tool-calls"),
];

export type ScriptedModel = MockLanguageModelV4 & { prompts: unknown[] };

/**
 * A model that returns steps[n] on its nth call (the last step repeats).
 * A step can be an error to throw instead of streaming. `chunkDelayMs` slows the stream down.
 */
export function scriptedModel(steps: (Part[] | Error)[], { chunkDelayMs }: { chunkDelayMs?: number } = {}): ScriptedModel {
  let call = 0;
  const prompts: unknown[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      prompts.push(options.prompt);
      const step = steps[Math.min(call++, steps.length - 1)]!;
      if (step instanceof Error) throw step;
      return {
        stream: simulateReadableStream({ chunks: step, chunkDelayInMs: chunkDelayMs ?? null, initialDelayInMs: null }),
      };
    },
  });
  return Object.assign(model, { prompts });
}
