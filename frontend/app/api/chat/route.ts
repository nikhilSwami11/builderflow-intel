import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  Output,
  streamText,
} from "ai";
import { buildChatContext } from "@/lib/chat-context";
import { type ChatMessage, replySchema } from "@/lib/chat-types";
import { buildIdeas, type Decisions, treeForPrompt } from "@/lib/idea-tree";

export const maxDuration = 60;

const { system, sources } = buildChatContext();

// Which model route to use, in order: AI Gateway when AI_GATEWAY_API_KEY is set; OpenAI directly
// when OPENAI_API_KEY is set (local dev, or a Vercel project without gateway credits); otherwise,
// on Vercel, the gateway authenticated by the platform's own token (needs a card on the account).
const model = process.env.AI_GATEWAY_API_KEY
  ? "openai/gpt-5-mini"
  : process.env.OPENAI_API_KEY
    ? openai("gpt-5-mini")
    : "openai/gpt-5-mini";

// Best-effort per-visitor cap (each serverless instance keeps its own counts, which is enough to
// stop a casual runaway on a public demo link; the provider's spend limit is the hard stop).
const LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function limited(req: Request): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  if (limited(req))
    return new Response(
      "Chat limit reached for this hour. Please try again later.",
      { status: 429 },
    );

  const {
    messages,
    decisions = {},
  }: { messages: ChatMessage[]; decisions?: Decisions } = await req.json();
  const nodes = buildIdeas(messages, decisions);
  const fullSystem = `${system}\n\n## IDEAS PROPOSED SO FAR, with the user's decision (use these ids as ideas[].parent; the next idea you add gets id N${nodes.length + 1})\n${treeForPrompt(nodes)}`;

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      let failure: unknown = null;
      const result = streamText({
        model,
        system: fullSystem,
        messages: await convertToModelMessages(messages.slice(-12)),
        output: Output.object({ schema: replySchema }),
        maxOutputTokens: 2500,
        providerOptions: { openai: { reasoningEffort: "low" } },
        onError: ({ error }) => {
          failure = error;
        },
      });

      // Forward only `answer` as text, as it grows; sources and idea go out as their own parts.
      const id = "answer";
      let sent = 0;
      writer.write({ type: "text-start", id });
      for await (const partial of result.partialOutputStream) {
        const answer = partial.answer ?? "";
        if (answer.length > sent) {
          writer.write({ type: "text-delta", id, delta: answer.slice(sent) });
          sent = answer.length;
        }
      }
      writer.write({ type: "text-end", id });

      if (failure) throw failure; // show the provider's real message, not "No output generated"
      const reply = await result.output;
      const seen = new Set<string>();
      const citations = reply.sources
        .flatMap((s) => sources[s.trim().toUpperCase()] ?? [])
        .filter(
          (c) =>
            !seen.has(`${c.source}|${c.ref}`) &&
            seen.add(`${c.source}|${c.ref}`),
        );
      writer.write({ type: "data-sources", data: { citations } });
      // Drop ideas that repeat one already proposed in this conversation (the model sometimes
      // re-proposes the idea the user has just accepted, or an earlier one).
      const words = (t: string) =>
        new Set(t.toLowerCase().match(/[a-z0-9]+/g) ?? []);
      const similar = (a: string, b: string) => {
        const x = words(a);
        const y = words(b);
        const shared = [...x].filter((w) => y.has(w)).length;
        return shared / Math.max(1, Math.min(x.size, y.size)) >= 0.85;
      };
      const known = nodes.map((n) => n.title);
      for (const idea of reply.ideas) {
        if (known.some((t) => similar(t, idea.title))) continue;
        known.push(idea.title);
        writer.write({ type: "data-idea", data: idea });
      }
    },
    onError: (e) => (e instanceof Error ? e.message : "Chat failed"),
  });

  return createUIMessageStreamResponse({ stream });
}
