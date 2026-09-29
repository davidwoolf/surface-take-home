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

export type HandbookUIMessage = UIMessage<MessageMetadata, never, InferUITools<HandbookTools>>;
