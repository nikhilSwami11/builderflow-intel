import type { UIMessage } from "ai";
import { z } from "zod";
import type { Citation } from "./types";

/** What the model must return on every turn. The UI renders each field in its own place, so
 *  nothing the model writes can leak into the wrong spot. `answer` comes first so it streams first. */
export const replySchema = z.object({
  answer: z.string().describe("The reply shown to the user. Plain text, no ids, no tags."),
  sources: z.array(z.string()).describe("Ids of the data items the answer relied on, e.g. G3, P2, D12. Empty if none."),
  idea: z
    .object({
      title: z.string().describe("Max 8 words."),
      parent: z.string().describe('Id of the earlier idea this refines or branches from, or "root".'),
      why: z.string().describe("One sentence: why this is worth acting on."),
    })
    .nullable()
    .describe("Only for a genuinely strong, specific, new idea. Otherwise null."),
});

export type Reply = z.infer<typeof replySchema>;
export type Idea = NonNullable<Reply["idea"]>;

/** The stream carries the answer as text, then two data parts: the resolved sources and the idea. */
export type ChatMessage = UIMessage<never, { sources: { citations: Citation[] }; idea: Idea }>;
