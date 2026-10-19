import type { UIMessage } from "ai";
import type { Citation } from "./types";

/** The chat stream carries one custom data part at the end: the sources of every item the
 *  answer cited. */
export type ChatMessage = UIMessage<never, { sources: { citations: Citation[] } }>;
