import { type ChildProcess, spawn } from "node:child_process";
import { PROVIDERS } from "../src/modules/chat/providers";
import { chooseProvider, loadEnv, requireKnowledgebase } from "./lib/setup";

// 1. The app can't answer without the handbook, so check it before anything else.
loadEnv();
const knowledgebase = requireKnowledgebase();
console.log(`Handbook loaded: ${knowledgebase.documents.length} pages, ${knowledgebase.sections.length} sections.`);

// 2. Pick the provider for this session.
const { provider, modelId } = await chooseProvider();
console.log(`Using ${PROVIDERS[provider].label}, model ${modelId}.\n`);

// 3. Start the API server and the Vite client together.
const env = { ...process.env, SURFACE_PROVIDER: provider };
const children: ChildProcess[] = [];

function start(name: string, command: string, args: string[]) {
  const child = spawn(command, args, { stdio: "inherit", env });
  child.on("exit", (code) => {
    console.error(`[dev] ${name} exited (code ${code ?? "null"}), shutting down`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

let shuttingDown = false;
function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", "pnpm", ["exec", "tsx", "watch", "src/api/server.ts"]);
start("client", "pnpm", ["exec", "vite"]);
