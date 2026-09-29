import { createHandbookAgent } from "../src/modules/chat/agent";
import { toChatError } from "../src/modules/chat/errors";
import { PROVIDERS } from "../src/modules/chat/providers";
import { verifyQuotes } from "../src/modules/chat/quotes";
import { chooseProvider, fail, loadEnv, requireKnowledgebase } from "./lib/setup";

// Runs the agent headless for one question: `pnpm ask "How long is parental leave?"`.

const question = process.argv.slice(2).join(" ").trim();
if (!question) fail('Usage: pnpm ask "<question>"');

loadEnv();
const knowledgebase = requireKnowledgebase();
const { provider, modelId } = await chooseProvider();
const { create, providerOptions } = PROVIDERS[provider];
const agent = createHandbookAgent({ model: create(modelId), knowledgebase, providerOptions });

const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;
const controller = new AbortController();
process.on("SIGINT", () => {
  controller.abort();
  console.log(dim("\n[stopped]"));
  process.exit(130);
});

const started = Date.now();
console.log(dim(`${PROVIDERS[provider].label}, model ${modelId}\n`));

try {
  const result = await agent.stream({ prompt: question, abortSignal: controller.signal });
  let section: "reasoning" | "text" | null = null;
  let answer = "";
  for await (const part of result.stream) {
    switch (part.type) {
      case "reasoning-delta":
        if (section !== "reasoning") process.stdout.write(dim("\n[thinking] "));
        section = "reasoning";
        process.stdout.write(dim(part.text));
        break;
      case "text-delta":
        if (section !== "text") process.stdout.write("\n\n");
        section = "text";
        answer += part.text;
        process.stdout.write(part.text);
        break;
      case "tool-call":
        section = null;
        process.stdout.write(dim(`\n→ ${part.toolName} ${JSON.stringify(part.input)}`));
        break;
      case "tool-result": {
        const output = part.output as { hits?: unknown[]; id?: string };
        process.stdout.write(dim(output.hits ? ` (${output.hits.length} hits)` : ` (read ${output.id})`));
        break;
      }
      case "tool-error":
        process.stdout.write(dim(` (error: ${part.error instanceof Error ? part.error.message : String(part.error)})`));
        break;
      case "error":
        throw part.error;
    }
  }
  const quotes = verifyQuotes(knowledgebase, answer);
  const verified = quotes.filter((q) => q.status === "verified").length;
  console.log(dim(`\n\n[${((Date.now() - started) / 1000).toFixed(1)}s · quotes verified: ${verified}/${quotes.length}]`));
  for (const quote of quotes) {
    if (quote.status === "unverified") console.log(dim(`  ✗ unverified: "${quote.text.slice(0, 100)}" (${quote.source})`));
    else if (quote.foundIn && quote.foundIn.source !== quote.source) {
      console.log(dim(`  ↪ cited ${quote.source}, found in ${quote.foundIn.source}`));
    }
  }
} catch (error) {
  if (controller.signal.aborted) process.exit(130);
  console.error(dim(String(error instanceof Error ? error.stack : error)));
  fail(toChatError(error, provider).message);
}
