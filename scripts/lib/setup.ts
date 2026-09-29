import fs from "node:fs";
import readline from "node:readline/promises";
import { PROVIDERS, type ProviderId, modelIdFor, selectProvider } from "../../src/modules/chat/providers";
import { type Knowledgebase, loadKnowledgebase } from "../../src/modules/knowledgebase/loader";

/** Loads .env into process.env if it exists. */
export function loadEnv(): void {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
}

/** Exits with the loader's message if the knowledgebase can't be loaded. */
export function requireKnowledgebase(): Knowledgebase {
  const result = loadKnowledgebase();
  if (result.status !== "ready") fail(result.message);
  return result.knowledgebase;
}

/** Picks the provider from .env, asking in the terminal when more than one key is set. */
export async function chooseProvider(): Promise<{ provider: ProviderId; modelId: string }> {
  const selection = selectProvider(process.env);
  let provider: ProviderId;

  switch (selection.status) {
    case "none":
    case "invalid":
      return fail(selection.message);
    case "selected":
      provider = selection.provider;
      break;
    case "choose":
      provider = await ask(selection.options);
      break;
  }
  return { provider, modelId: modelIdFor(provider, process.env) };
}

async function ask(options: ProviderId[]): Promise<ProviderId> {
  if (!process.stdin.isTTY) {
    fail(`Several API keys are set. Set SURFACE_PROVIDER to one of: ${options.join(", ")}.`);
  }
  console.log("Several API keys are set. Which provider should this session use?");
  options.forEach((id, i) => console.log(`  ${i + 1}. ${PROVIDERS[id].label} (${modelIdFor(id, process.env)})`));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question(`Choose 1-${options.length}: `)).trim();
      const choice = options[Number(answer) - 1];
      if (choice) return choice;
    }
  } finally {
    rl.close();
  }
}

export function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}
