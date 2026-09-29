import { type LanguageModel, ToolLoopAgent, isStepCount } from "ai";
import type { ProviderOptions } from "./providers";
import type { Knowledgebase } from "@/modules/knowledgebase/loader";
import { INSTRUCTIONS } from "./prompt";
import { createHandbookTools } from "./tools";

/** Upper bound on model steps (each tool call or answer is a step) per response. */
export const MAX_STEPS = 12;

export function createHandbookAgent({
  model,
  knowledgebase,
  providerOptions,
  logError,
}: {
  model: LanguageModel;
  knowledgebase: Knowledgebase;
  /** Provider-specific settings, such as turning on streamed reasoning (see PROVIDERS). */
  providerOptions?: ProviderOptions;
  /**
   * Receives model and stream errors. Without it the AI SDK prints them with
   * console.error, which duplicates the app's own logging.
   */
  logError?: (error: unknown) => void;
}) {
  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    tools: createHandbookTools(knowledgebase),
    stopWhen: isStepCount(MAX_STEPS),
    providerOptions,
    // ToolLoopAgent has no onError setting, but prepareCall's result is passed to streamText, which does.
    prepareCall: (args) => (logError ? { ...args, onError: ({ error }: { error: unknown }) => logError(error) } : args),
  });
}

export type HandbookAgent = ReturnType<typeof createHandbookAgent>;
