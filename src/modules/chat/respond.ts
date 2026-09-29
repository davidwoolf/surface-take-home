import {
  type InferUIMessageChunk,
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { HandbookAgent } from "./agent";
import { toChatError } from "./errors";
import { prepareHistory } from "./history";
import type { HandbookUIMessage } from "./message";
import type { ProviderId } from "./providers";

export type RespondOptions = {
  agent: HandbookAgent;
  messages: HandbookUIMessage[];
  provider: ProviderId;
  modelId: string;
  /** Aborts the model request and any further tool steps (Stop button, Escape, or a closed connection). */
  abortSignal?: AbortSignal;
  /** Receives the raw error; only the mapped, user-safe message is sent to the client. */
  logError?: (error: unknown) => void;
};

/** Runs the agent on the conversation and streams the answer as a UI message stream response. */
export function streamHandbookResponse({
  agent,
  messages,
  provider,
  modelId,
  abortSignal,
  logError = (error) => console.error("[chat]", error),
}: RespondOptions): Response {
  const onError = (error: unknown) => {
    logError(error);
    return toChatError(error, provider).message;
  };

  const stream = createUIMessageStream<HandbookUIMessage>({
    execute: async ({ writer }) => {
      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: prepareHistory(messages),
        abortSignal,
        onError,
        messageMetadata: ({ part }) => {
          if (part.type === "start") return { startedAt: Date.now(), model: modelId };
          if (part.type === "finish") return { finishedAt: Date.now() };
          return undefined;
        },
      });
      // The agent stream types metadata as unknown; messageMetadata above only returns MessageMetadata.
      writer.merge(agentStream as ReadableStream<InferUIMessageChunk<HandbookUIMessage>>);
    },
    onError,
  });

  return createUIMessageStreamResponse({ stream });
}
