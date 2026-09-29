# AGENTS.md

Guidance for coding agents (and humans) working in this repo.

## What this is
**Surface** is a local chat app that answers questions about the PostHog handbook, which is committed as markdown in `knowledgebase/`. Answers stream in, quote the handbook **word for word**, and cite each quote with a readable source such as *People › Offboarding › Voluntary departure*. Each quote is checked against the handbook after the answer. Conversations live in memory only; every session starts fresh.

## Source of truth
The plans in `docs/plans/` record what we build and why, including decisions that changed during the build. Read the relevant plan before starting work, and don't drift from it.

| Plan | Covers |
|---|---|
| [`01-purpose.md`](docs/plans/01-purpose.md) | What the app does, the answering rules, non-goals |
| [`02-architecture.md`](docs/plans/02-architecture.md) | Stack, components, error handling, stopping |
| [`03-implementation.md`](docs/plans/03-implementation.md) | Milestones (M0–M6) with notes from the build, testing strategy, risks |

If a task conflicts with a plan, **stop and ask**. Don't silently deviate. If a plan changes, update the plan document in the same commit.

## Stack
- pnpm 10, TypeScript (strict), Node 22.12+ (24 LTS recommended; see `.nvmrc`)
- Vite + React (client), Hono on Node (server, `src/api`)
- Vercel AI SDK v7: `ToolLoopAgent`, `useChat`, and the direct provider packages `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`
- shadcn/ui (Tailwind CSS v4, `radix-nova` style, Lucide icons) plus AI Elements from the shadcn registry, which renders markdown with Streamdown. No other UI kits.
- MiniSearch (BM25, in memory) with `stemmer`. **No embeddings.**
- Zod, Vitest

## Commands
| Command | What it does |
|---|---|
| `pnpm dev` | Checks the knowledgebase loads, picks the provider (asks when several keys are set), then starts Hono (port 8787) and Vite (port 5173, proxying `/api`) |
| `pnpm ask "<question>"` | Runs the agent headless: prints tool calls, reasoning, the answer and a quote-verification summary (real API call) |
| `pnpm eval` | Runs the real agent over the check set in `retrieval.json` and reports answer quality (real API calls; not part of `pnpm test`) |
| `pnpm test` / `pnpm test:watch` | Unit and API tests. No network or keys needed |
| `pnpm typecheck` | TypeScript check |

## Repo layout
```
AGENTS.md, README.md          this file; setup and usage for humans
.agents/skills/               shadcn and ai-sdk skills (see skills-lock.json)
.env.example                  provider keys and optional settings; copy to .env (gitignored)
components.json               shadcn config (radix-nova, registries incl. @ai-elements)
index.html, vite.config.ts    Vite client entry and dev server (proxies /api)
tsconfig.json, vitest.config.ts
docs/plans/                   purpose, architecture and implementation plans
knowledgebase/                the handbook as markdown, one file per handbook page (committed source content)
scripts/
  dev.ts                      knowledgebase preflight → provider prompt → start Hono + Vite
  ask.ts                      one question, headless
  eval.ts                     answer-quality run over the check set
  lib/setup.ts                shared: load .env, require the knowledgebase, choose the provider
src/
  main.tsx, app.tsx, index.css   client entry and root component
  api/
    app.ts                    createApp(deps): /api/health and /api/chat (validation, 503s); no domain logic
    server.ts                 loads .env, the knowledgebase and the provider, then serves the app
    __tests__/                API tests (Hono app.request with a mock model)
  components/                 CLI-managed; edit only when necessary
    ui/                       shadcn primitives, including message-scroller.tsx
    ai-elements/              AI Elements: message (Streamdown), reasoning, tool, prompt-input, shimmer, code-block
  lib/utils.ts                shadcn cn() helper (CLI-managed)
  modules/
    chat/                     the chat domain
      agent.ts, prompt.ts     ToolLoopAgent and its instructions (answering rules, quote format)
      tools/                  search_handbook and read_section
      providers.ts            provider selection, default models, per-provider options
      respond.ts              streams the agent's answer and appends quote verification
      quotes.ts               checks quotes against the handbook (server)
      quote-format.ts         splits answers into markdown and quotes (shared by server and client)
      history.ts, errors.ts, message.ts   history prep, user-safe errors, UI message types and schemas
      ui/                     the chat UI: chat.tsx, assistant-message, quote-card, tool-step, turn-timer, hooks
      __tests__/              unit tests; mock-model.ts is a shared test helper
    knowledgebase/            markdown parsing, breadcrumbs, chunking, normalization, loader, BM25 search
      __tests__/              unit tests, the retrieval check (retrieval.json) and its test
```

## Conventions
- **File names are always kebab-case**, including React components (`quote-card.tsx`, `app.tsx`) and tests. Component identifiers stay PascalCase in code.
- **Tests go in `__tests__/` folders** next to the domain they cover, named `*.test.ts(x)`. Tests may read the committed `knowledgebase/`.
- **Write pure functions where possible:** markdown parsing, chunking, normalization, knowledgebase status, search, history prep, quote parsing and checking, error mapping, provider selection. Scripts and routes stay thin, and `createApp` takes its dependencies as arguments so tests can pass a mock model.
- **Use one text normalization** (`modules/knowledgebase/normalize.ts`) for search and quote verification. Don't fork it.
- **Check AI SDK and AI Elements APIs against the installed docs** (`node_modules/ai/docs/`, `node_modules/@ai-sdk/*/docs/`) before using them. The API has changed a lot, so don't write it from memory. Load the `ai-sdk` skill first. Look up model IDs from the providers' current lists, not from memory.
- **UI comes from shadcn and AI Elements.** Add components with the CLI (`pnpm dlx shadcn@latest add <component>`, or `@ai-elements/<name>`) and follow the shadcn skill's rules in `.agents/skills/shadcn/`. The chat UI itself lives in `modules/chat/ui/`, not `components/`.
- **Skills** are managed with the `skills` CLI and recorded in `skills-lock.json`. Install them into `.agents/skills/` with `npx skills add <source> --agent codex` (that agent targets `.agents/skills`).
- Run `pnpm typecheck` and `pnpm test` before every commit. Changes to search must keep `retrieval.test.ts` passing (top-5 hit rate ≥ 90%).

## Behavior that must not regress
- **Answering rules:**
  - Handbook answers back claims with verbatim quotes.
  - If the handbook doesn't cover a question, say so; **never** fill the gap with general knowledge.
  - Off-topic questions may get a brief general-knowledge answer, without quotes.
- **Quote format and sources:** each quote is a blockquote ending in `> — Source: <breadcrumb>`, for example `People › Offboarding › Voluntary departure`. Section ids are internal (used by `read_section`) and never appear in answers.
- **Quote verification:** after a completed answer, the server sends one `data-quote-verification` part, just before `finish`. There's none when the answer was stopped or failed.
- **A knowledgebase that fails to load blocks startup.** `pnpm dev` exits with the problem, and `/api/chat` returns 503 `KNOWLEDGEBASE_UNAVAILABLE`.
- **Message failures appear inline in the failed turn**, with Retry. Only safe, mapped messages reach the client. Keys and raw provider errors never do.
- **Stop:** the Stop button and **Escape** abort the response all the way to the provider. The partial answer is kept and marked "Stopped", and a follow-up still works (unfinished tool calls are removed from the history).
- Nothing about a conversation is stored on the server or on disk.

## Gotchas
- **Scrolling:** the conversation uses shadcn's `MessageScroller` (`autoScroll`, with user messages as `scrollAnchor`). Every row must be wrapped in a `MessageScrollerItem`. The AI Elements `Conversation` component didn't follow streamed answers reliably, so don't bring it back.
- **Reasoning text** needs per-provider options in `providers.ts`, for example Claude's `thinking.display: "summarized"`. Setting them replaces the SDK's portable `reasoning` option. Claude skips reasoning on easy questions.
- **Error logging:** `ToolLoopAgent` has no `onError` setting, so `createHandbookAgent` passes one through `prepareCall`. Without it, the SDK prints every model error with `console.error`.
- **Data parts:** a new data part type must be added to `dataPartSchemas` in `message.ts`. The API validates incoming messages against it, and previous answers carry their parts.
- **Messages without metadata** are valid: `/api/chat` validates metadata with `messageMetadataSchema.optional()`.

## Guardrails
- **Secrets** are only in `.env` (see `.env.example`). Never put keys in code, tests, logs or commits.
- **`knowledgebase/` is source content.** Each file has `title` and `source` frontmatter, a `# Title` line, and `##`–`######` headings that become sections. Fix conversion problems by editing the markdown; don't reintroduce a PDF ingest step. Never commit the PDF itself.
- **Agent instructions** live only in `AGENTS.md` and `.agents/`. Don't add `CLAUDE.md`, `.claude/` or other tool-specific files.
- **Tests** never call real providers or the network. Use the mock model in `modules/chat/__tests__/mock-model.ts` (built on `ai/test`). Only `pnpm ask` and `pnpm eval` make real API calls.

## Git
- Commit directly on `main`, at least once per milestone, with passing typecheck and tests.
- **Never `git push` automatically.** The remote is `origin` (github.com/davidwoolf/surface-take-home). Push only when a human explicitly asks.
- Use conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
