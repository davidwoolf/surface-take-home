import { type LanguageModel, safeValidateUIMessages } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { type HandbookAgent, createHandbookAgent } from "@/modules/chat/agent";
import { type HandbookUIMessage, messageMetadataSchema } from "@/modules/chat/message";
import type { ProviderId, ProviderOptions } from "@/modules/chat/providers";
import { streamHandbookResponse } from "@/modules/chat/respond";
import type { KnowledgebaseStatus } from "@/modules/knowledgebase/loader";

export type ChatConfig = { provider: ProviderId; modelId: string; model: LanguageModel; providerOptions?: ProviderOptions };

export type AppDeps = {
  knowledgebase: KnowledgebaseStatus;
  /** Null when no provider is configured (for example, the server was started without `pnpm dev`). */
  chat: ChatConfig | null;
  logError?: (error: unknown) => void;
};

const chatBody = z.object({ messages: z.array(z.unknown()).min(1) });

export function createApp({ knowledgebase, chat, logError }: AppDeps) {
  const agent: HandbookAgent | null =
    knowledgebase.status === "ready" && chat
      ? createHandbookAgent({
          model: chat.model,
          knowledgebase: knowledgebase.knowledgebase,
          providerOptions: chat.providerOptions,
        })
      : null;

  const app = new Hono().basePath("/api");

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      knowledgebase:
        knowledgebase.status === "ready"
          ? {
              status: "ready" as const,
              documents: knowledgebase.knowledgebase.documents.length,
              sections: knowledgebase.knowledgebase.sections.length,
            }
          : { status: knowledgebase.status, message: knowledgebase.message },
      provider: chat ? { id: chat.provider, model: chat.modelId } : null,
    }),
  );

  app.post("/chat", async (c) => {
    if (knowledgebase.status !== "ready") {
      return c.json({ code: "KNOWLEDGEBASE_UNAVAILABLE", message: knowledgebase.message }, 503);
    }
    if (!chat || !agent) {
      return c.json({ code: "PROVIDER_UNAVAILABLE", message: "No model provider is configured. Start the app with `pnpm dev`." }, 503);
    }

    const body = chatBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ code: "INVALID_REQUEST", message: "Expected a JSON body with a messages array." }, 400);

    const validated = await safeValidateUIMessages<HandbookUIMessage>({
      messages: body.data.messages,
      metadataSchema: messageMetadataSchema.optional(),
    });
    if (!validated.success) return c.json({ code: "INVALID_REQUEST", message: "The messages aren't valid chat messages." }, 400);

    return streamHandbookResponse({
      agent,
      messages: validated.data,
      provider: chat.provider,
      modelId: chat.modelId,
      abortSignal: c.req.raw.signal,
      logError,
    });
  });

  return app;
}
