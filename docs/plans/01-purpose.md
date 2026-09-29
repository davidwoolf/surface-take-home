# Plan 1: Purpose

> Status: **approved** (2026-09-29)

## Summary
Surface is a private, natural-language chat interface that answers questions about a handbook. Every answer is grounded in the handbook, with direct quotes and citations. Users can't open the handbook PDF themselves, so the answer and its quotes have to stand on their own.

## Problem
The handbook is a large PDF, and it's hard to find a specific answer in it. Surface lets users ask in plain language and get a sourced answer without reading or searching the document.

## Users
- Individuals who run it **locally** on their own machine, set up from the README. Being local is what keeps it private, so there's no auth.
- Users **do not have access to the source PDF**. Surface is how they reach the handbook's content.

## Core capabilities
1. **Ask in plain language.** The user types a question and gets an answer drawn from the handbook.
2. **Multi-turn conversation.** Follow-up questions work like a standard LLM chat: the conversation keeps its context for the whole session.
3. **Cited, quoted answers.** Every handbook-based answer includes:
   - **direct quotes** of the handbook text it relies on
   - any **related links the handbook itself provides**, such as references to external sources

   Users can't open the PDF, so quotes are the evidence, not pointers into a document.
4. **Real-time streaming.** The answer streams in as it's generated.
5. **Visible progress.** While it works, the UI streams:
   - elapsed time
   - reasoning
   - tools used, such as skills called or handbook searches
6. **Live markdown rendering.** Responses are markdown and render correctly while they stream, including half-finished lists, tables and code blocks.
7. **Stop anytime.** A Stop button or the Escape key cancels an in-progress response, like other chat products.
8. **Clear failures.** If a response fails, the error appears in that turn of the conversation with a way to retry. If the handbook hasn't been set up, the app says exactly how to fix it.

## Answering rules
| Question type | Behavior |
|---|---|
| Covered by the handbook | Answer from the handbook, with quotes and citations. |
| Handbook topic, but the handbook doesn't cover it | Say plainly that it can't find or provide that information. **Never** fill the gap with general knowledge or guesses. |
| Not about the handbook at all | May answer from general knowledge, but this isn't the app's purpose and shouldn't be encouraged. |

## Non-goals
- **No saved conversations.** Context lasts only for the session. There's no history, persistence or cross-session memory, and a new session always starts fresh.
- **No access to the source document.** No PDF viewer, downloads or page deep links.
- **Not a general-purpose assistant.** General knowledge is tolerated for off-topic questions, not designed for.

## Success criteria
- Every handbook-based claim is backed by a verbatim quote that really appears in the handbook.
- Questions the handbook doesn't answer get an explicit "can't find that" response, with no invented answer.
- Follow-up questions resolve correctly using earlier turns in the session.
- Progress feedback (time, reasoning or a tool call) appears promptly after the user sends a question. _(target set in architecture)_
- Streamed markdown never shows broken or flickering formatting.

## Resolved in architecture
See [02-architecture](02-architecture.md): PDF ingest and search, local-only access, and quote verification.
