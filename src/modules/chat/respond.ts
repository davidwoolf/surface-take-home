import {
  type InferUIMessageChunk,
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { Knowledgebase } from "@/modules/knowledgebase/loader";
import type { HandbookAgent } from "./agent";
import { toChatError } from "./errors";
import { prepareHistory } from "./history";
import type { HandbookUIMessage } from "./message";
import type { ProviderId } from "./providers";
import { verifyQuotes } from "./quotes";

type Chunk = InferUIMessageChunk<HandbookUIMessage>;

export type RespondOptions = {
  agent: HandbookAgent;
  knowledgebase: Knowledgebase;
  messages: HandbookUIMessage[];
  provider: ProviderId;
  modelId: string;
  /** Aborts the model request and any further tool steps (Stop button, Escape, or a closed connection). */
  abortSignal?: AbortSignal;
  /** Receives the raw error; only the mapped, user-safe message is sent to the client. */
  logError?: (error: unknown) => void;
};

/**
 * Runs the agent on the conversation and streams the answer as a UI message
 * stream response. When the answer completes, its quotes are checked against
 * the handbook and the results are sent as a `data-quote-verification` part,
 * just before the stream's final `finish` chunk. Stopped or failed answers
 * aren't checked.
 */
export function streamHandbookResponse({
  agent,
  knowledgebase,
  messages,
  provider,
  modelId,
  abortSignal,
  logError = (error) => console.error("[chat]", error),
}: RespondOptions): Response {
  // The agent logs model errors itself (see createHandbookAgent); here they only become user-safe messages.
  const toMessage = (error: unknown) => toChatError(error, provider).message;
  const logAndMap = (error: unknown) => {
    logError(error);
    return toMessage(error);
  };

  const stream = createUIMessageStream<HandbookUIMessage>({
    execute: async ({ writer }) => {
      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: prepareHistory(messages),
        abortSignal,
        onError: toMessage,
        messageMetadata: ({ part }) => {
          if (part.type === "start") return { startedAt: Date.now(), model: modelId };
          if (part.type === "finish") return { finishedAt: Date.now() };
          return undefined;
        },
      });

      const textById = new Map<string, string>();
      let finish: Chunk | undefined;
      let interrupted = false;

      // The agent stream types metadata as unknown; messageMetadata above only returns MessageMetadata.
      for await (const chunk of agentStream as AsyncIterable<Chunk>) {
        if (chunk.type === "text-delta") textById.set(chunk.id, (textById.get(chunk.id) ?? "") + chunk.delta);
        if (chunk.type === "error" || chunk.type === "abort") interrupted = true;
        if (chunk.type === "finish") {
          finish = chunk;
          continue;
        }
        writer.write(chunk);
      }

      if (!interrupted && !abortSignal?.aborted) {
        const quotes = verifyQuotes(knowledgebase, [...textById.values()].join("\n\n"));
        if (quotes.length > 0) writer.write({ type: "data-quote-verification", data: { quotes } });
      }
      if (finish) writer.write(finish);
    },
    // Failures outside the model call (for example, preparing the history) are logged here.
    onError: logAndMap,
  });

  return createUIMessageStreamResponse({ stream });
}
