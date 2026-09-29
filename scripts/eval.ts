import checkSet from "../src/modules/knowledgebase/__tests__/retrieval.json";
import { createHandbookAgent } from "../src/modules/chat/agent";
import { toChatError } from "../src/modules/chat/errors";
import { PROVIDERS } from "../src/modules/chat/providers";
import { verifyQuotes } from "../src/modules/chat/quotes";
import { chooseProvider, loadEnv, requireKnowledgebase } from "./lib/setup";

// Runs the real agent over the retrieval check set and reports answer quality.
// Uses the configured provider and costs API calls: `pnpm eval`.

type Kind = "covered" | "not-covered" | "off-topic";

type Result = {
  question: string;
  kind: Kind;
  /**
   * Covered: an expected section was read, or a verified quote came from one.
   * Not covered: the answer says it couldn't find it, and any quotes are verified
   * (related handbook text is fine; invented text isn't). Off-topic: no quotes.
   */
  pass: boolean;
  quotes: { verified: number; total: number };
  seconds: number;
  note?: string;
};

const CONCURRENCY = 3;
const COULD_NOT_FIND = /couldn't find|could not find|can't find|cannot find|isn't in the handbook|not in the handbook|doesn't cover|does not cover|no information/i;

loadEnv();
const knowledgebase = requireKnowledgebase();
const { provider, modelId } = await chooseProvider();
const { create, providerOptions, label } = PROVIDERS[provider];
const agent = createHandbookAgent({ model: create(modelId), knowledgebase, providerOptions, logError: () => {} });

const questions: { question: string; kind: Kind; expected: string[] }[] = [
  ...checkSet.covered.map((q) => ({ question: q.question, kind: "covered" as const, expected: q.expected })),
  ...checkSet.notCovered.map((question) => ({ question, kind: "not-covered" as const, expected: [] })),
  ...checkSet.offTopic.map((question) => ({ question, kind: "off-topic" as const, expected: [] })),
];
console.log(`Evaluating ${questions.length} questions with ${label}, model ${modelId}…\n`);

async function run({ question, kind, expected }: (typeof questions)[number]): Promise<Result> {
  const started = Date.now();
  try {
    const result = await agent.generate({ prompt: question });
    const read = result.steps.flatMap((step) =>
      step.toolCalls.filter((call) => call.toolName === "read_section").map((call) => (call.input as { id: string }).id),
    );
    const checks = verifyQuotes(knowledgebase, result.text);
    const verified = checks.filter((check) => check.status === "verified").length;
    const quotedFrom = checks.flatMap((check) => (check.foundIn ? [check.foundIn.sectionId] : []));
    const pass =
      kind === "covered"
        ? [...read.map((id) => id.replace(/:\d+$/, "")), ...quotedFrom].some((id) => expected.includes(id))
        : kind === "not-covered"
          ? COULD_NOT_FIND.test(result.text) && verified === checks.length
          : checks.length === 0;
    return {
      question,
      kind,
      pass,
      quotes: { verified, total: checks.length },
      seconds: (Date.now() - started) / 1000,
      note: pass ? undefined : kind === "covered" ? `read: ${read.join(", ") || "nothing"}` : result.text.slice(0, 120).replace(/\s+/g, " "),
    };
  } catch (error) {
    return {
      question,
      kind,
      pass: false,
      quotes: { verified: 0, total: 0 },
      seconds: (Date.now() - started) / 1000,
      note: `error: ${toChatError(error, provider).message}`,
    };
  }
}

const results: Result[] = [];
for (let i = 0; i < questions.length; i += CONCURRENCY) {
  const batch = await Promise.all(questions.slice(i, i + CONCURRENCY).map(run));
  for (const r of batch) {
    const quotes = r.quotes.total ? ` quotes ${r.quotes.verified}/${r.quotes.total}` : "";
    console.log(`${r.pass ? "✓" : "✗"} ${r.question} (${r.seconds.toFixed(1)}s${quotes})${r.note ? `\n    ${r.note}` : ""}`);
  }
  results.push(...batch);
}

const covered = results.filter((r) => r.kind === "covered");
const notCovered = results.filter((r) => r.kind === "not-covered");
const offTopic = results.filter((r) => r.kind === "off-topic");
const quotes = results.reduce((acc, r) => ({ v: acc.v + r.quotes.verified, t: acc.t + r.quotes.total }), { v: 0, t: 0 });
console.log(`
Covered questions that read an expected section: ${covered.filter((r) => r.pass).length}/${covered.length}
Not-covered questions answered with "couldn't find" (and only verified quotes): ${notCovered.filter((r) => r.pass).length}/${notCovered.length}
Off-topic questions answered without handbook quotes: ${offTopic.filter((r) => r.pass).length}/${offTopic.length}
Quotes verified: ${quotes.v}/${quotes.t}`);
