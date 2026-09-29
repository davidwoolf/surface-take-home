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
}: {
  model: LanguageModel;
  knowledgebase: Knowledgebase;
  /** Provider-specific settings, such as turning on streamed reasoning (see PROVIDERS). */
  providerOptions?: ProviderOptions;
}) {
  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    tools: createHandbookTools(knowledgebase),
    stopWhen: isStepCount(MAX_STEPS),
    providerOptions,
  });
}

export type HandbookAgent = ReturnType<typeof createHandbookAgent>;
