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
pnpm ingest <path-to-pdf>         # build knowledgebase/ from the handbook PDF (M1)
pnpm dev                          # start the app
```

## Ingesting the handbook
The handbook PDF stays outside the repo. Point `pnpm ingest` at it:

```sh
pnpm ingest ~/Downloads/handbook.pdf
```

This writes the processed handbook to `knowledgebase/` (gitignored). Re-run it whenever the handbook changes. `pnpm dev` won't start until a handbook has been ingested.

## Commands
| Command | What it does |
|---|---|
| `pnpm dev` | Start the app (client + API) |
| `pnpm ingest <path-to-pdf>` | Build `knowledgebase/` from the handbook PDF |
| `pnpm ask "<question>"` | Ask a question from the terminal |
| `pnpm test` | Unit and API tests |
| `pnpm test:handbook` | Checks against the real ingested handbook |
| `pnpm typecheck` | TypeScript check |

See [`docs/plans/`](docs/plans/) for the project's purpose, architecture and implementation plan.
