import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { JSONValue, LanguageModel } from "ai";

/** Per-provider options passed to every model call. */
export type ProviderOptions = Record<string, Record<string, JSONValue>>;

export type ProviderId = "anthropic" | "openai" | "google";

type ProviderInfo = {
  label: string;
  /** The AI SDK provider's default environment variable for its API key. */
  keyEnv: string;
  modelEnv: string;
  /** Checked against the provider's current model list when chosen; override with the model env var. */
  defaultModel: string;
  create: (modelId: string) => LanguageModel;
  /**
   * Medium reasoning effort, with the reasoning text returned so the UI can show it.
   * Each provider needs its own switch for that; setting these replaces the SDK's
   * portable `reasoning` option for the provider.
   */
  providerOptions: ProviderOptions;
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    label: "Claude (Anthropic)",
    keyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    defaultModel: "claude-sonnet-5-5",
    create: (modelId) => anthropic(modelId),
    providerOptions: { anthropic: { thinking: { type: "adaptive", display: "summarized" }, effort: "medium" } },
  },
  openai: {
    label: "ChatGPT (OpenAI)",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-6-astra",
    create: (modelId) => openai(modelId),
    providerOptions: { openai: { reasoningEffort: "medium", reasoningSummary: "auto" } },
  },
  google: {
    label: "Gemini (Google)",
    keyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelEnv: "GOOGLE_MODEL",
    defaultModel: "gemini-3.8-flash",
    create: (modelId) => google(modelId),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "medium", includeThoughts: true } } },
  },
};

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

type Env = Record<string, string | undefined>;

export type ProviderSelection =
  | { status: "none"; message: string }
  | { status: "selected"; provider: ProviderId }
  | { status: "choose"; options: ProviderId[] }
  | { status: "invalid"; message: string };

/**
 * Decides which provider to use from the environment. An explicit
 * SURFACE_PROVIDER wins; otherwise one configured key selects its provider and
 * several mean the user has to choose.
 */
export function selectProvider(env: Env): ProviderSelection {
  const configured = PROVIDER_IDS.filter((id) => env[PROVIDERS[id].keyEnv]?.trim());
  const requested = env.SURFACE_PROVIDER?.trim();

  if (requested) {
    if (!isProviderId(requested)) {
      return { status: "invalid", message: `SURFACE_PROVIDER is "${requested}"; use one of: ${PROVIDER_IDS.join(", ")}.` };
    }
    if (!configured.includes(requested)) {
      return { status: "invalid", message: `SURFACE_PROVIDER is "${requested}", but ${PROVIDERS[requested].keyEnv} isn't set in .env.` };
    }
    return { status: "selected", provider: requested };
  }

  if (configured.length === 0) {
    const keys = PROVIDER_IDS.map((id) => PROVIDERS[id].keyEnv).join(", ");
    return {
      status: "none",
      message: `No API key found. Copy .env.example to .env and set at least one of: ${keys}.`,
    };
  }
  if (configured.length === 1) return { status: "selected", provider: configured[0]! };
  return { status: "choose", options: configured };
}

export function modelIdFor(provider: ProviderId, env: Env): string {
  return env[PROVIDERS[provider].modelEnv]?.trim() || PROVIDERS[provider].defaultModel;
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as string[]).includes(value);
}
