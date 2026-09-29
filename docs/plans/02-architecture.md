# Plan 2: Architectural Design

> Status: **approved** (2026-09-29). Depends on [01-purpose](01-purpose.md).

## Decisions
| Area | Decision |
|---|---|
| Runtime | **Local only.** Each person clones the repo and sets it up by following the README. There's no deployment, hosting or auth. |
| Stack | pnpm, TypeScript, **Vite + React** (client), **Hono** (server), [Vercel AI SDK](https://ai-sdk.dev/) |
| UI | **shadcn/ui only**, plus the AI SDK chat components (AI Elements), which install through the shadcn registry. The [shadcn skill](https://ui.shadcn.com/docs/skills) is installed. No other UI kits. |
| Providers | Claude, ChatGPT and Gemini through the direct AI SDK provider packages. Keys go in `.env`, never in code. With more than one key set, `pnpm dev` asks which provider to use. |
| Handbook | A 1,076-page, 50 MB PDF that is mostly text, with images, headings and links. The PDF **stays outside the repo**. Users run `pnpm ingest <path-to-pdf>`, and the gitignored output lands in `knowledgebase/`. Swapping the source material is just a re-run. |
| Ingest | **Front-loaded.** We prove extraction quality before building the chat. Images are out of scope; the focus is accurate text. |
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
                   ┌──────── pnpm ingest <path-to-pdf> (one-time) ─────────┐
 any/path/to.pdf ─▶│ extract → structure → chunk → index → report          │─▶ knowledgebase/
                   └───────────────────────────────────────────────────────┘        │
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

### 1. Ingestion pipeline (`pnpm ingest`) — built first
Code lives in `src/modules/knowledgebase/ingest/`, and `scripts/ingest.ts` is a thin entry point.

**Input:** a path to the PDF, passed as an argument (`pnpm ingest ~/Downloads/handbook.pdf`). The PDF is never copied into the repo.
- If there's no argument, or the path is missing, unreadable or not a PDF, ingest exits (code 1) with usage instructions.
- Ingest writes to a temporary folder and swaps it in only when everything has succeeded, so a failed run never leaves the knowledgebase half-written.

**Output:** `knowledgebase/`:
- `manifest.json`: schema version, the source file name and SHA-256 (for information), page count, the ingest time, and counts
- `sections.json`: the heading tree, and for each section its text, page range and links
- `chunks.json`: the searchable units, each with a heading path and page
- `index.json`: the serialized BM25 index
- `report.md`: the quality report

All of `knowledgebase/` is gitignored and created by `pnpm ingest`. How to run ingest is documented in the root `README.md`.

**Stages:**
1. **Extract** the text runs with their font size, weight and position; the PDF outline (bookmarks); and the **link annotations** with their target URLs and where they sit on the page. The likely library is `pdfjs-dist`, confirmed in the extraction spike.
2. **Structure:**
   - Rebuild the heading hierarchy, using the outline first and font size and weight as the fallback.
   - Join lines into paragraphs.
   - Strip running headers, footers and page numbers.
   - Attach each link to the text it sits on.
3. **Images:** ignored for answers. Ingest only counts them in the report.
4. **Chunk:** split by section. Long sections are split on paragraph boundaries, with a small overlap. Every chunk keeps its heading path, for example "Benefits › Leave › Parental".
5. **Report:**
   - pages with little extracted text
   - how deep the headings go, with a sample
   - links found and links that couldn't be tied to text
   - the leftover header and footer noise
   - the chunk size distribution

The same text normalization (`src/modules/knowledgebase/normalize.ts`) is used by ingest, search and quote verification.

### 2. Knowledgebase loading & search (`src/modules/knowledgebase`)
- `loadKnowledgebase()` reads and validates `knowledgebase/` and returns a typed status: `ready`, `missing` or `invalid` (see [Error handling](#error-handling)).
- BM25 search held in memory (for example MiniSearch), with the heading path indexed as a boosted field.

### 3. Chat module (`src/modules/chat`)
Everything that uses the AI SDK lives together here: the agent, tools, prompt, provider factory, history trimming, quote verification, error mapping and shared message types.
- An AI SDK `ToolLoopAgent` with a system prompt that enforces the [answering rules](01-purpose.md#answering-rules).
- **Tools** (each call streams to the UI as visible activity):
  - `search_handbook(query)` returns the top hits: chunk id, heading path, pages and snippet.
  - `read_section(id)` returns the full section text and its links.
- **Reasoning** uses the AI SDK's portable `reasoning` setting. A **step limit** stops the tool loop from running away.
- **Answer format:** markdown. Quotes use a structured, parseable form that includes the source chunk id.
- **Quote verification** runs after the answer: each quote is checked against its chunk after normalization, and the results are sent as a `data-quote-verification` part.
- **Provider factory:** maps `SURFACE_PROVIDER` and the optional `*_MODEL` override to an AI SDK model.

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
- **Quote cards** show the verbatim quote, heading path, page, any handbook links and the verification state.
- Streaming markdown, reasoning and tool displays come from AI Elements.

### 8. Agent-harness files
- `AGENTS.md` at the root holds the project overview, commands, repo layout and conventions (including kebab-case file names and the `__tests__` convention).
- `.agents/skills/` holds the shadcn skill and project skills. There's no `CLAUDE.md` or `.claude/`.

## Error handling

### A. Knowledgebase not found (`pnpm dev`)
The app can't answer anything without the handbook, so this is checked **before** the provider prompt and before any server starts. The checks run in this order:

| State | Detected by | Behavior |
|---|---|---|
| **Missing** | no `knowledgebase/manifest.json` | **Exit (code 1)**: "No handbook has been ingested. Run `pnpm ingest <path-to-pdf>`." |
| **Invalid** | missing files, JSON that won't parse, or a schema version mismatch (for example, after an upgrade that changed the format) | **Exit (code 1)**: say what's wrong and tell the user to re-run `pnpm ingest <path-to-pdf>`. |
| **Ready** | the manifest and all its files are present and valid | **Continue** to the provider prompt. |

Nothing checks whether the PDF has changed since it was ingested. Re-ingesting after a handbook update is up to the user.

**Runtime backstop:** the server also calls `loadKnowledgebase()` when it starts, which covers the Hono server being started on its own or the data being deleted while it runs. If the status isn't `ready`:
- `/api/health` reports it.
- `/api/chat` returns **503** with `{ code: "KNOWLEDGEBASE_UNAVAILABLE", message }`.
- The UI shows a blocking empty state with the same instructions in place of the prompt input.

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
  README.md                       setup: pnpm install → .env → pnpm ingest <pdf> → pnpm dev
  .env.example
  knowledgebase/                  pnpm ingest output (gitignored, created by ingest)
    manifest.json, sections.json, chunks.json, index.json, report.md
  scripts/
    dev.ts                        preflight → provider prompt → start Vite + Hono
    ingest.ts                     parse <path-to-pdf> → modules/knowledgebase/ingest
  src/
    main.tsx
    app.tsx
    index.css
    api/                          Hono app and routes
      __tests__/
    components/                   shadcn + AI Elements components (CLI-managed)
      __tests__/                  only if we add non-trivial component logic
    modules/
      chat/                       AI SDK: agent, tools, prompt, providers, trimming,
        __tests__/                  quote verification, error mapping, message types
      knowledgebase/              ingest pipeline, normalization, loader/status, BM25 search
        ingest/
        __tests__/
          fixtures/               small generated fixture PDF + expected output
  docs/plans/
```
