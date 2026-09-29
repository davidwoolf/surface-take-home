# Plan 3: Implementation

> Status: **approved** (2026-09-29). Depends on [01-purpose](01-purpose.md) and [02-architecture](02-architecture.md).

## Approach
- **Knowledgebase first.** Answers can only be as accurate as the handbook text, so we converted the PDF to markdown and checked its quality before building the chat.
- **Headless before UI.** The agent is proven through API tests and a CLI before any UI work.
- **One milestone at a time, committed on `main`.** Each milestone ends with passing `pnpm typecheck` and `pnpm test`, and a commit.
- **Check AI SDK APIs against current docs.** Anything from the AI SDK or AI Elements gets checked against the docs of the installed version, not written from memory.

## Milestones

### M0 — Scaffold ✅ (`9688745`)
- `pnpm init`, TypeScript (strict), Vite + React (`src/main.tsx`, `src/app.tsx`), and a Hono app in `src/api/`.
- Folders created as in the [repo layout](02-architecture.md#repo-layout): `src/components/`, `src/modules/chat/`, `src/modules/knowledgebase/`, `knowledgebase/`.
- `shadcn init` for Vite, with components going to `src/components/`. Install the shadcn skill into `.agents/skills/`.
- Vitest set up for `__tests__/` folders (see [Testing strategy](#testing-strategy)).
- Scripts: `dev`, `ask`, `test`, `test:watch`, `typecheck`.
- `.gitignore`: `*.pdf`, `.env`, `node_modules/` and build output.
- `.env.example` listing all three keys and the optional `*_MODEL` overrides.
- `AGENTS.md` with the overview, commands, layout, and conventions: **kebab-case file names** (components included) and `__tests__/` folders.
- Rename Vite's generated `App.tsx` to `app.tsx`, and check that no generated file uses PascalCase.
- A root `README.md` stub. The full setup walkthrough comes in M6, and its details are still to come from you.

**Done when:** `pnpm dev` serves a blank shadcn page with `/api/health` behind the proxy, and `pnpm test` runs a sample test in `src/api/__tests__/` and one in `src/modules/**/__tests__/`.

### M1 — Knowledgebase ✅ (`97d7ec7`)
Changed during M1: instead of a generic `pnpm ingest` command, the handbook is converted **once** to markdown and committed. The product is a knowledgebase for this handbook, not a PDF importer.

1. **Spike** (done): pdf.js on the real PDF.
   - The PDF has no bookmarks, so headings came from font sizes.
   - Each handbook page starts with its title and its source path, which gave the file names.
   - The running header and footer sit at fixed positions.
   - Links come with their position on the page.
   - pdf.js was chosen over MuPDF: the output was equivalent, and MuPDF is AGPL-licensed.
2. **One-off conversion** (done, not kept in the app): PDF → `knowledgebase/**/*.md`, 254 files, with frontmatter, headings, lists, tables, code and inline links. See [02-architecture §1](02-architecture.md#1-the-knowledgebase-knowledgebase).
3. **Loader** in `modules/knowledgebase`:
   - parse markdown into documents and sections
   - chunk the sections
   - build the BM25 index at startup
   - return a typed status (`ready`, `invalid`) with shared messages
4. **Normalization** (`normalize.ts`): ligatures, invisible characters, quotes, dashes, case and whitespace.
5. **Review with you:** read a sample of the markdown files against the handbook.

**Done when:** you're happy with the markdown sample, and the loader tests pass.

### M2 — Search, tools & retrieval check set ✅ (`eaa5b31`)
- BM25 search in `modules/knowledgebase/search.ts`: stemming, stopwords, heading boost, and one hit per section with a snippet.
- `search_handbook` and `read_section` as AI SDK tools with zod schemas, in `modules/chat/tools/`. An unknown section id throws, and the SDK returns that to the model as a tool error.
- **Result:** the check set scores 26 of 28 in the top 5 (93%); the plain-BM25 baseline was 24 of 28. The two misses need a synonym ("vacation" → "time off") or compete with pull-request pages. The agent covers those by searching again with other words.
- **Retrieval check set:** I generate 20–30 questions from the handbook text, each with its expected section(s).
  - They cover a range of topics and phrasings, including synonyms that don't appear word for word in the handbook.
  - They include multi-section questions, and 4–5 questions the handbook doesn't cover.
  - You review the set once. It's committed next to its test in `modules/knowledgebase/__tests__/` and runs in the default suite, since the handbook is in the repo.

**Done when:** the expected section is in the top 5 results for at least 90% of the check set (enforced by `retrieval.test.ts`).

### M3 — Agent, startup & chat API ✅ (`df75973`)
Notes from the build:
- Reasoning needs per-provider options to be returned at all (see [02-architecture §3](02-architecture.md#3-chat-module-srcmoduleschat)).
- The server removes unfinished tool calls from the history, so a follow-up after a stopped response doesn't fail at the provider.
- Dropping a *failed* turn's partial output needs the client, which knows the turn failed, so it moves to M5.
- Checked for real with Claude: `pnpm ask`, a curl stream through the Vite proxy, a client disconnect, and a broken knowledgebase file at `pnpm dev`.
- Follow-up: quotes now cite a readable breadcrumb ("People › Offboarding › Voluntary departure") instead of a section id, and the plans no longer assume users can't open the handbook.
- Follow-up (open): expected errors in API tests still print to stderr. The AI SDK's default `streamText` error logger prints them, and `ToolLoopAgent` has no typed `onError` to replace it. Tidy this up later.

- **`scripts/dev.ts`:**
  1. The **knowledgebase preflight**, with every state from [Error handling A](02-architecture.md#a-knowledgebase-cant-be-loaded-pnpm-dev).
  2. The provider prompt.
  3. Start Vite and Hono.
- **Provider factory.** Default model IDs are fetched from each provider's current list at implementation time, not hard-coded from memory.
- **`ToolLoopAgent`:** the system prompt enforces the answering rules and the quote format. It has the `reasoning` setting and a step limit.
- **`POST /api/chat`:**
  - streams the UI message stream: text, reasoning, tool parts, and start/finish metadata
  - returns 503 `KNOWLEDGEBASE_UNAVAILABLE` when the knowledgebase isn't ready
  - passes the **request abort signal** to the agent
- **Error mapping** (`modules/chat/errors.ts`): provider and SDK errors become safe categories and messages sent on the stream. The full error is logged on the server only.
- **History trimming** for older turns' tool results, and failed partial assistant output is dropped from the history.
- **`pnpm ask "question"`:** the agent run headless for manual checks. Ctrl-C aborts it.

**Done when:** the API tests pass, and `pnpm ask` answers real questions correctly with each configured provider.

### M4 — Quote verification
- Define the quote format, for example a tagged block carrying the chunk id, and make it robust to partial streaming.
- The verifier extracts quotes, normalizes them, and matches each against its chunk, falling back to the whole handbook. It sends a `data-quote-verification` part.
- It's skipped when a response is stopped or fails.

**Done when:** the unit and API tests cover exact, near and fabricated quotes, and the skip-on-abort behavior.

### M5 — Chat UI
- Install the AI Elements components (conversation, message, response, reasoning, tool, prompt input) into `src/components/`.
- `useChat` wired to `/api/chat`, with messages in memory and a "New chat" reset.
- Per-response elapsed timer, reasoning panel, tool chips, and quote cards with their verification state.
- **Stop:**
  - The Send button swaps to Stop while a response is `submitted` or `streaming`.
  - **Escape** stops it from anywhere, including the input, without taking over from an open overlay.
  - The partial response is marked "Stopped", and the timer freezes.
- **Message failure:**
  - The error shows inline in the failed turn, with the partial content kept and a **Retry** button (`regenerate()`).
  - The timer shows "failed".
  - The input stays usable.
- **Knowledgebase unavailable:** a blocking empty state with instructions replaces the input, driven by `/api/health` and by 503 responses.

**Done when:** a full conversation with follow-ups works in the browser, including stopping by button and by Escape, a forced provider error with Retry, and the knowledgebase-missing state. You check this manually.

### M6 — Hardening & docs
- Review answer quality against the retrieval check set with the full agent (each provider), and tune the prompt and search boosts.
- README walkthrough from a clean clone:
  1. `pnpm install`
  2. `.env`
  3. `pnpm dev`

  It also includes a troubleshooting section that lists every startup and message error.
- `AGENTS.md` updated with final conventions and gotchas.

## Testing strategy
The focus is **unit and API tests with Vitest**. There are no browser or end-to-end tests; the UI is checked by hand in M5 and M6.

### Principles
- **The default suite needs no network and no API keys.** LLM calls use the AI SDK's mock language model from `ai/test`. We confirm the exact export against the installed version.
- **Small inline markdown for unit tests; the real handbook where it matters.** Parsing, chunking and loading use tiny markdown written in the test. Retrieval checks and a load smoke test use the committed `knowledgebase/`.
- **Pure functions first.** Markdown parsing, chunking, normalization, preflight and status, search, trimming, quote parsing, error mapping and provider selection are all pure and easy to test directly.

### Layout & config
Tests sit next to each domain in a `__tests__/` folder, named `*.test.ts(x)`, so Vitest's default include pattern finds them:
```
src/api/__tests__/                         API tests (Hono app.request)
src/modules/chat/__tests__/                agent, tools, errors, trimming, verification, providers
src/modules/knowledgebase/__tests__/       normalize, markdown, chunking, loader, search, retrieval check set
```
`pnpm test` runs everything.

### Unit tests
| Domain | What's tested |
|---|---|
| knowledgebase: normalize | ligatures, invisible characters, quotes, dashes, case, whitespace; it's idempotent |
| knowledgebase: markdown | frontmatter, heading paths, breadcrumbs, unique section ids, blocks (lists, tables and code kept whole; `#` inside code isn't a heading), plain-text conversion |
| knowledgebase: chunking | one chunk for short sections, splits near the target size with overlap, oversized blocks split under the maximum |
| knowledgebase: loader/status | nested files load into documents, sections, chunks and an index; empty or missing directory and bad frontmatter → `invalid` with the restore message; the committed handbook loads |
| knowledgebase: search | ranking, heading-path boost, empty and no-hit queries |
| knowledgebase: retrieval | the check set: expected section in the top-k results (hit rate threshold), without calling an LLM |
| chat: tools | input validation; `read_section` with an unknown id comes back as a tool error, not a thrown exception |
| chat: quote verification | exact match, match after normalization, near-miss, fabricated quote, wrong chunk id with a whole-handbook fallback, quotes split across the stream |
| chat: errors | each provider/SDK error maps to the right category and a safe message; no key or raw payload leaks |
| chat: history trimming | old tool results cut down; failed partial output removed; stopped partial output kept |
| chat: providers | 0, 1 and more than 1 keys; model override; unknown provider |

### API tests (`src/api/__tests__/`, Hono `app.request()`, no running server)
| Case | What's asserted |
|---|---|
| `GET /api/health` | the provider, model and knowledgebase status for both the ready and not-ready states |
| Chat, happy path | with the mock scripted to call search, then read_section, then answer: reasoning, tool-call/result parts, text and start/finish metadata, in order |
| Multi-turn | earlier messages reach the model; trimming is applied |
| Quote verification | a `data-quote-verification` part arrives after the text, with the right results |
| **Knowledgebase unavailable** | `/api/chat` → 503 `KNOWLEDGEBASE_UNAVAILABLE` with the instructions message |
| **Message failure** | a mock provider error (auth, rate limit, unknown) mid-stream → a safe error part with the mapped message; the partial text streamed before it is kept; the server keeps serving the next request |
| **Stop / abort** | aborting the request's signal mid-stream stops the model stream, runs no further tool steps and skips quote verification |
| Validation | a malformed body → 400 |
| Step limit | a mock that loops on tool calls stops at the limit |

Live-LLM answer quality is reviewed by hand in M6.

## Risks
| Risk | Mitigation |
|---|---|
| Conversion errors in the markdown (a split paragraph, a missed heading) | Spot-checked in M1; the files are plain markdown, so fixes are ordinary edits |
| Content missing from the source PDF (names shown as widgets on the website, text in images) | Documented in the architecture; the answering rules make the model say it can't find what isn't there |
| Models paraphrase instead of quoting word for word | The quote format, post-answer verification, unverified marks; tune in M6 |
| Providers differ in tool-calling, reasoning and error shapes | Run `pnpm ask` per provider in M3; the error-mapping tests cover each provider's error types |
| Aborting doesn't reach the provider | Pass the abort signal explicitly; API test for it |
| Keyword search misses synonyms | The agent reformulates queries; heading boosts; the check set includes synonym questions |
| The context window fills in long sessions | History trimming; the "context too long" error tells the user to start a new chat |
| AI SDK / AI Elements APIs have changed since the plan was written | Check against the installed docs before writing code |

## Open questions
None at the moment.
