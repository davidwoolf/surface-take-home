# Surface

A local chat app that answers questions about the [PostHog handbook](https://posthog.com/handbook). Answers stream in as they're written, quote the handbook word for word, and name where each quote comes from, such as *People › Offboarding › Voluntary departure*.

## Assumptions made

- Knowledge base users have access to the handbook somewhere else (either as a website or PDF)
- Packaging the knowledge base into the repository is intentional due to idiosyncrasies with parsing PDF content reliably 
- Users understand the technical aspects of the responses (aka: tool calls, reasoning, etc) due to who will be reviewing the project
- Project setup can be used with Claude, ChatGPT, or Gemini. Testing was done with Claude Sonnet 5.5
- ShadCN and Vercel Components were used for the UI to create a proof of concept. More time was spent on architecting how the knowledge base will be stored, retrieved, and verified.

## Technology used

| Area | Technology |
|---|---|
| Language and tooling | [TypeScript](https://www.typescriptlang.org), [pnpm](https://pnpm.io), [tsx](https://tsx.is) for scripts |
| Web app | [React](https://react.dev) and [Vite](https://vite.dev) |
| API server | [Hono](https://hono.dev) on Node.js |
| AI | [Vercel AI SDK](https://ai-sdk.dev): the `ToolLoopAgent` agent, `useChat` streaming, and the Anthropic, OpenAI and Google provider packages |
| UI components | [shadcn/ui](https://ui.shadcn.com) with [Tailwind CSS](https://tailwindcss.com), including its `MessageScroller`; [AI Elements](https://ai-sdk.dev/elements) for messages, reasoning, tool steps and the prompt input, with [Streamdown](https://streamdown.ai) for streaming markdown |
| Search | [MiniSearch](https://lucaong.github.io/minisearch/) (BM25 keyword search, in memory) and [stemmer](https://github.com/words/stemmer) |
| Validation | [Zod](https://zod.dev) |
| Tests | [Vitest](https://vitest.dev), with the AI SDK's mock model for API tests |
| Handbook conversion | [pdf.js](https://mozilla.github.io/pdf.js/), used once to convert the handbook PDF to markdown; it isn't part of the app |

## Requirements

Install these before you start.

| Requirement | Version | Notes |
|---|---|---|
| Operating system | macOS or Linux | Developed and tested on macOS. On Windows, use [WSL 2](https://learn.microsoft.com/windows/wsl/install); native Windows hasn't been tested. |
| [Node.js](https://nodejs.org) | 22.12 or later (24 LTS recommended) | Check with `node -v`. |
| [pnpm](https://pnpm.io) | 10.x | Check with `pnpm -v`. |
| [git](https://git-scm.com) | any recent version | To clone the repo. |
| An API key | at least one | [Anthropic (Claude)](https://console.anthropic.com/settings/keys), [OpenAI (ChatGPT)](https://platform.openai.com/api-keys) or [Google AI Studio (Gemini)](https://aistudio.google.com/apikey). Using the app costs a small amount of API credit per question. |

## Set up and run locally

1. **Clone the repo and enter it:**
   ```sh
   git clone https://github.com/davidwoolf/surface-take-home.git
   cd surface-take-home
   ```
2. **Install dependencies:**
   ```sh
   pnpm install
   ```
3. **Add your API key(s).** Copy the example file, then set at least one key in `.env`:
   ```sh
   cp .env.example .env
   ```
   ```sh
   # .env
   ANTHROPIC_API_KEY=your-key-here
   # OPENAI_API_KEY=
   # GOOGLE_GENERATIVE_AI_API_KEY=
   ```
   `.env` is gitignored; never commit keys.
4. **Start the app:**
   ```sh
   pnpm dev
   ```
   It checks the handbook loads, picks your provider, then starts everything. Open **http://localhost:5173**.

   If more than one key is set, it asks which provider to use for the session:
   ```
   Several API keys are set. Which provider should this session use?
     1. Claude (Anthropic) (claude-sonnet-5-5)
     2. ChatGPT (OpenAI) (gpt-6-astra)
   Choose 1-2:
   ```
   Stop the app with **Ctrl-C**.

There's no import step: the handbook is already in the repo as markdown, in `knowledgebase/`.

## Using the app

- **Ask** in plain language, or click an example question. Follow-up questions use the earlier conversation.
- **Watch it work.** Each answer shows its handbook searches and the sections it read, its reasoning when the model shares it, and a timer.
- **Check the quotes.** Each quote card shows its source and a badge:

  | Badge | Meaning |
  |---|---|
  | Verified | The quote was found word for word in the handbook |
  | Not found in handbook | The quote doesn't match the handbook text, so treat it with caution |
  | Checking quote… | The answer is still streaming |
  | Not checked | The answer was stopped or failed before the check ran |

- **Stop** an answer with the Stop button or **Esc**. The partial answer stays.
- **Start over** with **New chat**. Nothing is saved: refreshing the page also starts a fresh session.

If the handbook doesn't cover a question, the app says so rather than guessing. Off-topic questions may get a brief general-knowledge answer, with no handbook quotes.

## Configuration

All settings go in `.env`.

| Variable | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` | none | Provider keys; set at least one |
| `SURFACE_PROVIDER` | asks when several keys are set | `anthropic`, `openai` or `google`: skip the prompt |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model override for Claude |
| `OPENAI_MODEL` | `gpt-6-astra` | Model override for ChatGPT |
| `GOOGLE_MODEL` | `gemini-3.8-flash` | Model override for Gemini |
| `SURFACE_API_PORT` | `8787` | Port for the local API server (the web app is on 5173) |

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Check the handbook, pick a provider, start the app |
| `pnpm ask "<question>"` | Ask one question in the terminal; shows searches, the answer and a quote-verification summary |
| `pnpm test` | Unit and API tests; no network or API keys needed |
| `pnpm typecheck` | TypeScript check |
| `pnpm eval` | Run the real agent over the check-set questions and report answer quality (uses API credit) |

## Troubleshooting

**When starting `pnpm dev`**

| Message | Fix |
|---|---|
| `No API key found. Copy .env.example to .env and set at least one of: …` | Create `.env` and add a key (step 3). |
| `SURFACE_PROVIDER is "…", but … isn't set in .env.` | Set that provider's key, or change or remove `SURFACE_PROVIDER`. |
| `Several API keys are set. Set SURFACE_PROVIDER to one of: …` | `pnpm dev` can't prompt without a terminal; set `SURFACE_PROVIDER`. |
| `The handbook in knowledgebase/ can't be loaded: …` | A handbook file was deleted or broken. Restore it with `git checkout -- knowledgebase`. |
| `Error: listen EADDRINUSE … 8787` | Another copy of the app (or something else) is using the API port. Stop it, or set `SURFACE_API_PORT`. |
| The app opens on a port other than 5173 | Port 5173 was busy, so Vite picked the next free one. Use the URL it prints. |
| An engine or syntax error on install or start | Node is too old. Check `node -v` is 22.12 or later. |

**In the chat** (shown in the failed answer, with **Retry**)

| Message | Fix |
|---|---|
| `The API key for … was rejected. Check … in .env and restart.` | The key is wrong or revoked. Fix `.env`, then restart `pnpm dev`. |
| `… is rate limiting requests. Wait a moment and try again.` | Wait, then press Retry. |
| `… is temporarily unavailable. Try again in a moment.` | A provider outage. Retry later. |
| `Couldn't reach … Check your internet connection and try again.` | Check your connection, then Retry. |
| `This conversation is too long for the model. Start a new chat.` | Click **New chat**. |
| `Couldn't reach the Surface server. Check that pnpm dev is still running, then retry.` | Restart `pnpm dev`. |
| **Surface can't answer right now** (full screen) | The server couldn't load the handbook or has no provider. Follow the message shown, then restart `pnpm dev`. |

## About the handbook content

`knowledgebase/` holds the PostHog handbook as 254 markdown files, one per handbook page, converted once from a PDF of the handbook. A few things didn't survive the PDF:
- About 40 lines are missing names that appear as widgets on the website (for example "handled by , , and on the team").
- A few amounts written in math notation lost their `$` signs.
- Content that's only in images isn't included.

The app says it can't find information that's missing. To fix a passage, edit its markdown file.

## Project docs

- [`docs/plans/`](docs/plans/): purpose, architecture and implementation plans
- [`AGENTS.md`](AGENTS.md): conventions and guardrails for coding agents working in this repo
