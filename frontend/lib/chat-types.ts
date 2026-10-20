import type { UIMessage } from "ai";
import { z } from "zod";
import type { Citation } from "./types";

/** What the model must return on every turn. The UI renders each field in its own place, so
 *  nothing the model writes can leak into the wrong spot. `answer` comes first so it streams first. */
export const replySchema = z.object({
  answer: z.string().describe("The reply shown to the user, in Markdown. No item ids, no tags."),
  sources: z.array(z.string()).describe("Ids of the data items the answer relied on, e.g. G3, P2, D12. Empty if none."),
  ideas: z
    .array(
      z.object({
        title: z.string().describe("Max 8 words."),
        anchor: z.string().describe("A 3 to 8 word phrase copied EXACTLY from your answer where this idea is stated."),
        parent: z.string().describe('Id of the earlier idea this refines or branches from, or "root".'),
        why: z.string().describe("One sentence: why this is worth acting on."),
      }),
    )
    .max(3)
    .describe("Strong, specific, new ideas from this turn. Usually empty."),
});

export type Reply = z.infer<typeof replySchema>;
export type Idea = Reply["ideas"][number];

/** The stream carries the answer as text, then two data parts: the resolved sources and the idea. */
export type ChatMessage = UIMessage<never, { sources: { citations: Citation[] }; idea: Idea }>;
