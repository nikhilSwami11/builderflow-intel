import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText } from "ai";
import { buildChatContext, citedIds } from "@/lib/chat-context";
import type { ChatMessage } from "@/lib/chat-types";
import { buildTree, treeForPrompt } from "@/lib/idea-tree";

export const maxDuration = 60;

const { system, sources } = buildChatContext();

// With an AI Gateway key the plain model string routes through Vercel's gateway; without one,
// fall back to calling OpenAI directly with OPENAI_API_KEY.
const model = process.env.AI_GATEWAY_API_KEY ? "openai/gpt-5-mini" : openai("gpt-5-mini");

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const tree = treeForPrompt(buildTree(messages));
  const treeRules = `

## IDEA TREE
The UI shows the user a tree of the ideas this conversation has produced. When your reply lands on or develops a concrete idea worth keeping (not for every answer), end it with ONE tag on its own last line: [[idea: parent=<id> | <title, max 8 words>]]. Use parent=root for a new top-level idea, or the id of the node it refines or branches from. If the user changes direction, branch from the right ancestor instead of the latest node. Do not tag plain factual answers, and never mention the tag or the tree in your prose.
Current tree:
${tree}`;

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: system + treeRules,
        messages: await convertToModelMessages(messages.slice(-12)),
        maxOutputTokens: 2000,
        providerOptions: { openai: { reasoningEffort: "low" } },
        onFinish: ({ text }) => {
          const seen = new Set<string>();
          const citations = citedIds(text)
            .flatMap((id) => sources[id] ?? [])
            .filter((c) => !seen.has(`${c.source}|${c.ref}`) && seen.add(`${c.source}|${c.ref}`));
          writer.write({ type: "data-sources", data: { citations } });
        },
      });
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
