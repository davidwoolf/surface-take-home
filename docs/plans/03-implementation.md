# Plan 3: Implementation

> Status: **approved** (2026-09-29). Depends on [01-purpose](01-purpose.md) and [02-architecture](02-architecture.md).

## Approach
- **Ingest first.** Answers can only be as accurate as the extracted text, so we prove extraction quality on the real PDF before building the chat.
- **Headless before UI.** The agent is proven through API tests and a CLI before any UI work.
- **One milestone at a time, committed on `main`.** Each milestone ends with passing `pnpm typecheck` and `pnpm test`, and a commit.
- **Check AI SDK APIs against current docs.** Anything from the AI SDK or AI Elements gets checked against the docs of the installed version, not written from memory.

## Milestones

### M0 — Scaffold
- `pnpm init`, TypeScript (strict), Vite + React (`src/main.tsx`, `src/app.tsx`), and a Hono app in `src/api/`.
- Folders created as in the [repo layout](02-architecture.md#repo-layout): `src/components/`, `src/modules/chat/`, `src/modules/knowledgebase/`, `knowledgebase/`.
- `shadcn init` for Vite, with components going to `src/components/`. Install the shadcn skill into `.agents/skills/`.
- Vitest set up for `__tests__/` folders (see [Testing strategy](#testing-strategy)).
- Scripts: `dev`, `ingest`, `ask`, `test`, `test:watch`, `test:handbook`, `typecheck`.
- `.gitignore`: `knowledgebase/`, `.env`, `node_modules/` and build output.
- `.env.example` listing all three keys and the optional `*_MODEL` overrides.
- `AGENTS.md` with the overview, commands, layout, and conventions: **kebab-case file names** (components included) and `__tests__/` folders.
- Rename Vite's generated `App.tsx` to `app.tsx`, and check that no generated file uses PascalCase.
- A root `README.md` stub that includes `pnpm ingest <path-to-pdf>` usage. The full setup walkthrough comes in M6, and its details are still to come from you.

**Done when:** `pnpm dev` serves a blank shadcn page with `/api/health` behind the proxy, and `pnpm test` runs a sample test in `src/api/__tests__/` and one in `src/modules/**/__tests__/`.

### M1 — Knowledgebase ingest (front-loaded)
1. **Spike.** Run `pdfjs-dist` over the real handbook. Dump the text runs with their fonts, the outline and the link annotations for sample pages. Decide:
   - Is the outline complete enough to be the heading source, or do we need font-based detection?
   - What do the headers and footers look like, so we can strip them?
   - How are the links laid out?
2. **Normalization** (`modules/knowledgebase/normalize.ts`): whitespace, ligatures, smart quotes, hyphenation at line breaks.
3. **Pipeline stages** in `modules/knowledgebase/ingest/`, as pure functions:
   - extract
   - build the heading tree
   - join lines into paragraphs
   - strip headers and footers
   - attach links
   - chunk
4. **`pnpm ingest <path-to-pdf>`**: check the argument (missing, unreadable or not a PDF → usage message, exit 1). Write to a temporary folder, then swap it into `knowledgebase/`: `manifest.json` (schema version, source name and SHA-256), sections, chunks, the BM25 index and `report.md`.
5. **`loadKnowledgebase()`** and its typed status (`ready`, `missing`, `invalid`), with the user-facing message for each.
6. **Review with you.** Read the report, and compare about 10 sections against the PDF.

**Done when:** you sign off on the report, and running ingest twice produces the same output (it's deterministic).

### M2 — Search, tools & retrieval check set
- BM25 search in `modules/knowledgebase`.
- `search_handbook` and `read_section` as AI SDK tools with zod schemas, in `modules/chat/tools/`.
- **Retrieval check set:** I generate 20–30 questions from the ingested text, each with its expected section(s).
  - They cover a range of topics and phrasings, including synonyms that don't appear word for word in the handbook.
  - They include multi-section questions, and 4–5 questions the handbook doesn't cover.
  - You review the set once. It's committed in `modules/knowledgebase/__tests__/handbook/retrieval.json`. It's tied to this handbook, so it gets regenerated if the source changes.

**Done when:** the expected section is in the top-k results for at least 90% of the check set. _(Threshold to confirm once we see the baseline.)_

### M3 — Agent, startup & chat API
- **`scripts/dev.ts`:**
  1. The **knowledgebase preflight**, with every state from [Error handling A](02-architecture.md#a-knowledgebase-not-found-pnpm-dev).
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
  3. `pnpm ingest <path-to-pdf>`
  4. `pnpm dev`

  It also includes a troubleshooting section that lists every startup and message error.
- `AGENTS.md` updated with final conventions and gotchas.

## Testing strategy
The focus is **unit and API tests with Vitest**. There are no browser or end-to-end tests; the UI is checked by hand in M5 and M6.

### Principles
- **The default suite needs no network and no API keys.** LLM calls use the AI SDK's mock language model from `ai/test`. We confirm the exact export against the installed version.
- **The default suite needs no real handbook.** Tests use a small **fixture PDF** in `modules/knowledgebase/__tests__/fixtures/`. It's generated with the structure that matters: nested headings, a running header and footer, links, a table-like block, an image and a hyphenated line break.
- **Pure functions first.** The ingest stages, normalization, preflight and status, search, trimming, quote parsing, error mapping and provider selection are all pure and easy to test directly.

### Layout & config
Tests sit next to each domain in a `__tests__/` folder, named `*.test.ts(x)`, so Vitest's default include pattern finds them:
```
src/api/__tests__/                         API tests (Hono app.request)
src/modules/chat/__tests__/                agent, tools, errors, trimming, verification, providers
src/modules/knowledgebase/__tests__/       normalize, ingest stages, loader/status, search
src/modules/knowledgebase/__tests__/fixtures/
src/modules/knowledgebase/__tests__/handbook/   opt-in real-handbook checks
```
- `pnpm test` runs everything except `**/__tests__/handbook/**`.
- `pnpm test:handbook` runs only the real-handbook checks. They skip with a message if `knowledgebase/` isn't ready.

### Unit tests
| Domain | What's tested |
|---|---|
| knowledgebase: normalize | whitespace, ligatures, smart quotes, hyphenation; it's idempotent |
| knowledgebase: ingest | heading tree from outline/fonts, header/footer stripping, paragraph joining, link attachment, chunk boundaries and overlap; the whole fixture PDF gives the expected sections and chunks (snapshot); the output is deterministic |
| knowledgebase: loader/status | each state (`ready`, `missing`, `invalid` for missing files, bad JSON or a schema mismatch) and its message |
| knowledgebase: ingest CLI args | no argument, a path that doesn't exist, a file that isn't a PDF → usage error; a failed run leaves the existing knowledgebase untouched |
| knowledgebase: search | ranking on the fixture index, heading-path boost, empty and no-hit queries |
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

### Real-handbook checks (opt-in)
- **Retrieval:** the hit rate of the expected section in the top-k results across the check set, without calling an LLM.
- **Ingest health:** thresholds on the report numbers, for example the share of low-text pages and of unattached links.
- Live-LLM answer quality is reviewed by hand in M6.

## Risks
| Risk | Mitigation |
|---|---|
| Heading structure is unreliable | The M1 spike decides early; the report makes problems visible |
| Links can't be tied to the right text | Attach by position, and report the ones left over |
| Models paraphrase instead of quoting word for word | The quote format, post-answer verification, unverified marks; tune in M6 |
| Providers differ in tool-calling, reasoning and error shapes | Run `pnpm ask` per provider in M3; the error-mapping tests cover each provider's error types |
| Aborting doesn't reach the provider | Pass the abort signal explicitly; API test for it |
| Keyword search misses synonyms | The agent reformulates queries; heading boosts; the check set includes synonym questions |
| The context window fills in long sessions | History trimming; the "context too long" error tells the user to start a new chat |
| AI SDK / AI Elements APIs have changed since the plan was written | Check against the installed docs before writing code |

## Open questions
None at the moment. Ready to start M0.
