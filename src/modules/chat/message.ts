import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import type { HandbookTools } from "./tools";

export const messageMetadataSchema = z.object({
  /** Epoch ms when the server started the response. */
  startedAt: z.number().optional(),
  /** Epoch ms when the response finished. */
  finishedAt: z.number().optional(),
  model: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

const quoteCheckSchema = z.object({
  text: z.string(),
  source: z.string(),
  status: z.enum(["verified", "unverified"]),
  foundIn: z
    .object({
      sectionId: z.string(),
      source: z.string(),
      links: z.array(z.object({ text: z.string(), url: z.string() })),
    })
    .optional(),
});

/** Schemas for the custom data parts the server adds to assistant messages. */
export const dataPartSchemas = {
  /** Sent once after the answer: every quote in it, checked against the handbook. */
  "quote-verification": z.object({ quotes: z.array(quoteCheckSchema) }),
};

export type HandbookDataTypes = {
  [K in keyof typeof dataPartSchemas]: z.infer<(typeof dataPartSchemas)[K]>;
};

export type HandbookUIMessage = UIMessage<MessageMetadata, HandbookDataTypes, InferUITools<HandbookTools>>;
