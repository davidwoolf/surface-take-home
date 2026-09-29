# Plan 2: Architectural Design

> Status: **approved** (2026-09-29). Depends on [01-purpose](01-purpose.md).

## Decisions
| Area | Decision |
|---|---|
| Runtime | **Local only.** Each person clones the repo and sets it up by following the README. There's no deployment, hosting or auth. |
| Stack | pnpm, TypeScript, **Vite + React** (client), **Hono** (server), [Vercel AI SDK](https://ai-sdk.dev/) |
| UI | **shadcn/ui only**, plus the AI SDK chat components (AI Elements), which install through the shadcn registry. The [shadcn skill](https://ui.shadcn.com/docs/skills) is installed. No other UI kits. |
| Providers | Claude, ChatGPT and Gemini through the direct AI SDK provider packages. Keys go in `.env`, never in code. With more than one key set, `pnpm dev` asks which provider to use. |
| Handbook | The PostHog handbook (a 1,076-page PDF) was **converted once to markdown** and is **committed in `knowledgebase/`**, one file per handbook page. The app is built for this handbook: there's no PDF ingest step, and the PDF never enters the repo. Images are out of scope; the focus is accurate text. |
| Search | Agentic search over **BM25** (in memory). No embeddings. |
| Quote verification | Checked **after the answer is written**. We'll revisit if answers turn out wrong. |
| Errors | A missing knowledgebase blocks startup with clear instructions. A message failure is shown inline in the conversation turn, with Retry. See [Error handling](#error-handling). |
| Stopping | A **Stop button** and the **Escape key** cancel an in-progress response, all the way back to the provider. See [Stopping a response](#stopping-a-response). |
| Agent tooling | Tool-neutral: **`AGENTS.md` + `.agents/`** only (no `CLAUDE.md`/`.claude/`), so any coding-agent harness can work in the repo. |
| Naming | **kebab-case for every file name**, including React components (`chat-message.tsx`, not `ChatMessage.tsx`) and tests (`quote-verifier.test.ts`). Component *identifiers* stay PascalCase in code. shadcn and AI Elements already generate kebab-case files. |
| Versioning | git, committing directly on `main` |
| Testing | **Vitest**, unit and API tests in `__tests__/` folders next to each domain. See [03-implementation](03-implementation.md#testing-strategy). |

## System overview

```
                                                     knowledgebase/*.md (committed)
                                                                  │ parsed at startup
                                                                  ▼
┌─────────── browser (Vite) ────────────┐                     ┌──────── Hono (src/api) ────────┐
│ src/app.tsx + src/components          │  POST /api/chat     │ src/modules/chat               │
│ useChat — messages in memory only     │ ──────────────────▶ │  ToolLoopAgent + tools         │
│ streaming markdown, timer, reasoning, │ ◀── UI message ──── │  quote verifier (post-answer)  │
│ tool chips, quote cards, Stop / Esc   │     stream          │ src/modules/knowledgebase      │
│                                       │ ── abort ─────────▶ │  BM25 index loaded at start    │
└───────────────────────────────────────┘                     └────────────────────────────────┘
```

In dev, Vite serves the client and proxies `/api` to the Hono server. One `pnpm dev` command runs both.

## Components

### 1. The knowledgebase (`knowledgebase/`)
The handbook as markdown, one file per handbook page, in folders that mirror the handbook's own source paths (for example `knowledgebase/people/time-off.md`). It's 254 files, about 2.4 MB.

Each file has:
- frontmatter with `title` and `source` (the handbook's own source path, e.g. `contents/handbook/people/time-off.md`)
- a `# Title` line, then the body, with `##`–`######` headings, paragraphs, lists, tables and fenced code
- the handbook's links inline, as `[text](url)`

**How it was made:** a one-off conversion of the PDF with pdf.js, kept out of the app.
- Headings were rebuilt from font sizes (22 / 15 / 12.5 / 11pt → levels 1–4).
- Running headers and footers were stripped.
- Wrapped lines were joined into paragraphs, and table rows and columns were rebuilt.
- Links were placed on the text they cover.

**Known gaps in the source:** some inline content on the website (mostly people's and teams' names) didn't print to the PDF, so about 40 lines read like "handled by , , and on the team". Content inside images isn't included. Answers that depend on these gaps can't be completed from the handbook.

### 2. Knowledgebase loading & search (`src/modules/knowledgebase`)
- `loadKnowledgebase()` reads every markdown file when the server starts (about 0.3s) and splits each file into sections at its headings.
- It splits sections into chunks on block boundaries, with a small overlap, and builds the search index. Each chunk keeps its heading path, for example "Time off › Parental leave".
- It returns a typed status, `ready` or `invalid` (see [Error handling](#error-handling)).
- BM25 search is held in memory (MiniSearch):
  - The heading path is indexed as a separate field, boosted ×2.
  - Links are reduced to their text for indexing.
  - Terms are stemmed (`stemmer`), so "eligible" matches "eligibility".
  - Stopwords, single characters and "posthog" (on nearly every page) are dropped.
  - Prefix matching applies to terms of 4+ characters, and light fuzzy matching to terms of 5+.
- Search returns at most one hit per section (its best chunk), so each hit is a distinct place to read.
- The shared text normalization (`normalize.ts`) is used for search and quote verification.

### 3. Chat module (`src/modules/chat`)
Everything that uses the AI SDK lives together here: the agent, tools, prompt, provider factory, history trimming, quote verification, error mapping and shared message types.
- An AI SDK `ToolLoopAgent` with a system prompt that enforces the [answering rules](01-purpose.md#answering-rules).
- **Tools** (each call streams to the UI as visible activity):
  - `search_handbook(query)` returns the top hits: chunk id, heading path and snippet.
  - `read_section(id)` returns the full section text and its links.
- **Reasoning:** medium effort, set per provider, because each provider needs its own switch to return reasoning text: Claude `thinking.display: "summarized"`, OpenAI `reasoningSummary: "auto"`, Gemini `includeThoughts: true` (see `providers.ts`). Claude's adaptive thinking skips reasoning on easy questions, so the reasoning panel only appears when there's reasoning.
- A **step limit** (12) stops the tool loop from running away.
- **Answer format:** markdown. Each quote is a blockquote whose last line names its source, which M4 verifies and renders as a quote card:
  ```
  > exact words copied from the section
  > — Source: Heading › Path (section-id)
  ```
- **Quote verification** runs after the answer: each quote is checked against its chunk after normalization, and the results are sent as a `data-quote-verification` part.
- **Provider factory:** maps `SURFACE_PROVIDER` and the optional `*_MODEL` override to an AI SDK model. The defaults are `claude-sonnet-5-5`, `gpt-6-astra` and `gemini-3.8-flash`, taken from each provider's current model list.

### 4. API (`src/api`, Hono)
- `GET /api/health` reports the provider, model and knowledgebase status.
- `POST /api/chat` validates the body and streams the agent's UI message stream. It passes the request's abort signal through to the agent (see [Stopping a response](#stopping-a-response)).
- It depends on `modules/chat` and `modules/knowledgebase`, and holds no domain logic of its own.

### 5. `pnpm dev` startup (`scripts/dev.ts`)
1. **Knowledgebase preflight**: see [Error handling](#error-handling). This runs first, because without a knowledgebase the app can't work.
2. **Provider selection** reads `.env`:
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` are the AI SDK's default names.
   - With **0 keys** it exits with setup instructions. With **1 key** it uses that provider. With **more than 1** it asks the user to choose in the terminal.
3. It starts Vite and Hono with `SURFACE_PROVIDER` set.

The preflight and selection logic are pure functions inside the modules, so they can be tested. The script only does the terminal I/O and starts the processes.

### 6. Session & conversation state
- Messages live **only in client memory**, in `useChat`. Each request sends the history, and the server keeps no state. Refreshing the page or clicking "New chat" gives a fresh session.
- Large tool results from earlier turns are trimmed before they're sent to the model.

### 7. Frontend
- `src/main.tsx` and `src/app.tsx` sit at the root of `src/`. Components from shadcn and AI Elements go in `src/components/`.
- **Layout:** a single-page chat with a message list, a prompt input (Send and Stop) and a "New chat" button.
- **Activity display** for each response: an elapsed-time counter, a collapsible reasoning panel, and tool-call chips (for example "Searched: *parental leave*" and "Read: *Benefits › Leave*").
- **Quote cards** show the verbatim quote, heading path, any handbook links and the verification state.
- Streaming markdown, reasoning and tool displays come from AI Elements.

### 8. Agent-harness files
- `AGENTS.md` at the root holds the project overview, commands, repo layout and conventions (including kebab-case file names and the `__tests__` convention).
- `.agents/skills/` holds the shadcn skill and project skills. There's no `CLAUDE.md` or `.claude/`.

## Error handling

### A. Knowledgebase can't be loaded (`pnpm dev`)
The handbook is committed, so this only happens if `knowledgebase/` has been deleted or a file has been broken by an edit. The app can't answer anything without it, so this is checked **before** the provider prompt and before any server starts.

| State | Detected by | Behavior |
|---|---|---|
| **Invalid** | no markdown files in `knowledgebase/`, or a file without valid frontmatter (`title` and `source`) | **Exit (code 1)**: say what's wrong, and that `git checkout -- knowledgebase` restores it. |
| **Ready** | every file parses | **Continue** to the provider prompt. |

**Runtime backstop:** the server also calls `loadKnowledgebase()` when it starts, which covers the Hono server being started on its own. If the status isn't `ready`:
- `/api/health` reports it.
- `/api/chat` returns **503** with `{ code: "KNOWLEDGEBASE_UNAVAILABLE", message }`.
- The UI shows a blocking empty state with the same message in place of the prompt input.

Messages are written once in `modules/knowledgebase` and shared by the CLI, the API and the UI.

### B. Message failure (in the conversation turn)
A failure while a response is being produced belongs to that turn of the conversation, and is shown there.

**Server (`modules/chat/errors.ts`):**
- Map provider and SDK errors to a user-safe category and message:

  | Category | Example message |
  |---|---|
  | invalid API key | "The API key for Claude was rejected. Check `ANTHROPIC_API_KEY` in `.env`." |
  | rate limited | "Rate limited by the provider. Try again in a moment." |
  | provider overloaded or unavailable | "The provider is temporarily unavailable. Try again." |
  | network | "Couldn't reach the provider. Check your connection." |
  | context too long | "This conversation is too long. Start a new chat." |
  | unknown | "Something went wrong." |

- Messages go to the client through the UI message stream's error handler. The raw error, with its stack, is logged to the server console only. Keys and raw provider payloads never reach the client.

**Client:**
- An error from `useChat` is shown **inline in the failed turn**, under any partial assistant content, which stays visible. The error has a **Retry** button that calls `regenerate()`.
- The elapsed-time counter stops and shows "failed".
- The prompt input stays usable. If the user sends a new message instead of retrying, the failed turn's partial assistant output isn't included in the history sent to the model.

**Not message failures:**
- **Tool errors**, such as an unknown section id or a search with no hits, are returned to the model as tool results, so it can recover. They show as a failed tool chip.
- **Quote-verification problems** never fail the message. The affected quotes are marked *unverified*.

## Stopping a response
This matches how other chat products behave.

- **Controls:** while `status` is `submitted` or `streaming`, the Send button becomes a **Stop** button. Pressing **Escape** anywhere on the page, including in the prompt input, does the same. Escape does nothing when no response is in progress, and it doesn't take over from open overlays (for example a dialog closes first).
- **Client:** both call `useChat`'s `stop()`, which aborts the fetch.
- **Server:** the Hono handler passes the request's abort signal to the agent. The provider request is cancelled, and no further tool steps or quote verification run.
- **Result:**
  - The partial response stays visible, marked **"Stopped"**, with the timer frozen.
  - It isn't treated as an error, and it stays in the history, so follow-ups can refer to it.
  - The input is ready again immediately.

## Repo layout
```
surface/
  AGENTS.md
  .agents/skills/                 shadcn skill + project skills
  README.md                       setup: pnpm install → .env → pnpm dev
  .env.example
  knowledgebase/                  the handbook as markdown, one file per page (committed)
    people/time-off.md, brand/startups.md, …
  scripts/
    dev.ts                        preflight → provider prompt → start Vite + Hono
    ask.ts                        headless question → agent (M3)
  src/
    main.tsx
    app.tsx
    index.css
    api/                          Hono app and routes
      __tests__/
    components/                   shadcn + AI Elements components (CLI-managed; primitives in components/ui/)
      __tests__/                  only if we add non-trivial component logic
    lib/utils.ts                  shadcn cn() helper (CLI-managed)
    modules/
      chat/                       AI SDK: agent, tools, prompt, providers, trimming,
        __tests__/                  quote verification, error mapping, message types
      knowledgebase/              markdown parsing, chunking, normalization, loader, BM25 search
        __tests__/
  docs/plans/
```
