import { type ChildProcess, spawn } from "node:child_process";

// M0: start the API server and the Vite client together.
// Knowledgebase preflight and provider selection are added in M3.

const children: ChildProcess[] = [];

function start(name: string, command: string, args: string[]) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
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
