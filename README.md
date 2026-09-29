# Surface

A local chat app that answers questions about a handbook, with streamed answers, verbatim quotes and citations.

> Work in progress. A full setup walkthrough is coming.

## Requirements
- Node.js and pnpm
- An API key for at least one of: Anthropic (Claude), OpenAI (ChatGPT), Google (Gemini)

## Quick start
```sh
pnpm install
cp .env.example .env              # add at least one API key
pnpm dev                          # start the app
```

## The knowledgebase
The handbook is committed in `knowledgebase/` as markdown, one file per handbook page (for example `knowledgebase/people/time-off.md`). It was converted once from the handbook PDF; the app reads these files at startup, so there's nothing to import.

## Commands
| Command | What it does |
|---|---|
| `pnpm dev` | Start the app (client + API) |
| `pnpm ask "<question>"` | Ask a question from the terminal (shows the searches and the answer) |
| `pnpm test` | Unit and API tests |
| `pnpm typecheck` | TypeScript check |

See [`docs/plans/`](docs/plans/) for the project's purpose, architecture and implementation plan.
