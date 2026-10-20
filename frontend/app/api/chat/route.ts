import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText } from "ai";
import { buildChatContext, citedIds } from "@/lib/chat-context";
import type { ChatMessage } from "@/lib/chat-types";

export const maxDuration = 60;

const { system, sources } = buildChatContext();

// With an AI Gateway key the plain model string routes through Vercel's gateway; without one,
// fall back to calling OpenAI directly with OPENAI_API_KEY.
const model = process.env.AI_GATEWAY_API_KEY ? "openai/gpt-5-mini" : openai("gpt-5-mini");

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system,
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
