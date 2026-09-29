import fs from "node:fs";
import { serve } from "@hono/node-server";
import { PROVIDERS, modelIdFor, selectProvider } from "@/modules/chat/providers";
import { loadKnowledgebase } from "@/modules/knowledgebase/loader";
import { type ChatConfig, createApp } from "./app";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

const knowledgebase = loadKnowledgebase();
if (knowledgebase.status !== "ready") console.error(`[api] ${knowledgebase.message}`);

// `pnpm dev` resolves the provider (prompting if needed) and passes SURFACE_PROVIDER down.
const selection = selectProvider(process.env);
let chat: ChatConfig | null = null;
if (selection.status === "selected") {
  const modelId = modelIdFor(selection.provider, process.env);
  const { create, providerOptions } = PROVIDERS[selection.provider];
  chat = { provider: selection.provider, modelId, model: create(modelId), providerOptions };
  console.log(`[api] Using ${PROVIDERS[selection.provider].label}, model ${modelId}`);
} else {
  console.error(`[api] No provider selected: ${"message" in selection ? selection.message : "several keys are set; start with `pnpm dev` to choose"}`);
}

const port = Number(process.env.SURFACE_API_PORT ?? 8787);
const app = createApp({ knowledgebase, chat });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] Listening on http://localhost:${info.port}`);
});
