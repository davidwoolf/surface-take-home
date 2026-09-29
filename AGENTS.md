# AGENTS.md

Guidance for coding agents (and humans) working in this repo.

## What this is
**Surface** is a local chat app that answers questions about a handbook (the PostHog handbook, converted from PDF to markdown in `knowledgebase/`). Answers are streamed, grounded in the handbook, and cite **verbatim quotes** plus any links the handbook provides. Conversations live in memory only; every session starts fresh.

## Source of truth
The approved plans in `docs/plans/` define what we build. Read the relevant plan before starting work, and don't drift from it.

| Plan | Covers |
|---|---|
| [`01-purpose.md`](docs/plans/01-purpose.md) | What the app does, the answering rules, non-goals |
| [`02-architecture.md`](docs/plans/02-architecture.md) | Stack, components, error handling, stopping, repo layout |
| [`03-implementation.md`](docs/plans/03-implementation.md) | Milestones (M0–M6), testing strategy, risks |

If a task conflicts with a plan, **stop and ask**. Don't silently deviate. If a plan changes, update the plan document in the same commit.

## Stack
- pnpm, TypeScript (strict)
- Vite + React (client), Hono (server, `src/api`)
- Vercel AI SDK, with the direct provider packages: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`
- shadcn/ui and the AI SDK chat components (AI Elements, installed through the shadcn registry). **No other UI kits.**
- Vitest
- BM25 search, in memory (MiniSearch + `stemmer`). **No embeddings.** Changes to search must keep `retrieval.test.ts` passing.

## Commands
`pnpm ask` arrives in M3. Until then, it prints a "not implemented" message.

| Command | What it does |
|---|---|
| `pnpm dev` | Checks the knowledgebase loads, asks which provider to use (when more than one key is set), then starts Vite and Hono |
| `pnpm ask "<question>"` | Runs the agent headless (for manual checks) |
| `pnpm test` | Unit and API tests. No network or keys needed |
| `pnpm typecheck` | TypeScript check |

## Repo layout
```
src/
  main.tsx, app.tsx      app entry at the root of src/
  api/                   Hono app and routes. No domain logic here.
  components/            shadcn + AI Elements components (CLI-managed; shadcn primitives in components/ui/)
  lib/utils.ts           shadcn's cn() helper (CLI-managed)
  modules/
    chat/                everything AI SDK: agent, tools, prompt, providers,
                         history trimming, quote verification, error mapping
    knowledgebase/       markdown parsing, chunking, normalization, loader, BM25 search
scripts/                 thin entry points: dev.ts, ask.ts
knowledgebase/           the handbook as markdown, one file per handbook page (committed)
docs/plans/              approved plans
```

## Conventions
- **File names are always kebab-case**, including React components (`chat-message.tsx`, `app.tsx`) and tests. Component identifiers stay PascalCase in code.
- **Tests go in `__tests__/` folders** next to the domain they cover, named `*.test.ts(x)`. Tests may read the committed `knowledgebase/`.
- **Write pure functions where possible.** This covers markdown parsing, chunking, normalization, preflight and status, search, trimming, quote parsing, error mapping and provider selection. Scripts and routes stay thin.
- **Use one text normalization** (`modules/knowledgebase/normalize.ts`) for search and quote verification. Don't fork it.
- **Check AI SDK and AI Elements APIs against the installed docs** (`node_modules/ai/docs/`, `node_modules/@ai-sdk/*/docs/`) before using them. The API has changed a lot, so don't write it from memory. Look up model IDs at implementation time; don't hard-code them from memory.
- **UI is shadcn only.** Add components through the shadcn CLI (`pnpm dlx shadcn@latest add <component>`), and use the shadcn skill in `.agents/skills/`. The project uses the `radix-nova` style with Lucide icons (see `components.json`).
- **Skills** in `.agents/skills/`: `shadcn` and `ai-sdk`. Load `ai-sdk` before touching AI SDK code. Skills are managed with the `skills` CLI and recorded in `skills-lock.json`. Install them into `.agents/skills/` (for example `npx skills add <source> --agent codex`, which targets `.agents/skills`).
- Run `pnpm typecheck` and `pnpm test` before every commit.

## Behavior that must not regress
- **Answering rules:**
  - Handbook answers include verbatim quotes.
  - If the handbook doesn't cover a question, say so; **never** fill the gap with general knowledge.
  - Off-topic questions may get a general-knowledge answer.
- **A knowledgebase that fails to load blocks startup.** `pnpm dev` exits with the problem, and `/api/chat` returns 503 `KNOWLEDGEBASE_UNAVAILABLE`.
- **Message failures appear inline in the failed turn**, with Retry. Only safe, mapped messages reach the client. Keys and raw provider errors never do.
- **Stop:** the Stop button and **Escape** abort the response all the way to the provider. The partial answer is kept and marked "Stopped".
- Nothing about a conversation is stored on the server or on disk.

## Guardrails
- **Secrets** are only in `.env` (see `.env.example`). Never put keys in code, tests, logs or commits.
- **`knowledgebase/` is source content.** Each file has `title` and `source` frontmatter, a `# Title` line, and `##`–`######` headings that become sections. Edit it like any other content; don't reintroduce a PDF ingest step. Never commit the PDF itself.
- **Agent instructions** live only in `AGENTS.md` and `.agents/`. Don't add `CLAUDE.md`, `.claude/` or other tool-specific files.
- **Tests** never call real providers or the network. Use the AI SDK's mock model from `ai/test`.

## Git
- Commit directly on `main`, at least once per milestone, with passing typecheck and tests.
- Use conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
