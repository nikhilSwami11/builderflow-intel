"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Cites } from "@/components/cite";
import type { ChatMessage } from "@/lib/chat-types";

const STARTERS = [
  "What should Builderflow fix first in Work Orders?",
  "How do JobNimbus and Buildertrend price differently from us?",
  "What do contractors complain about most?",
  "Where do our website, portal and guide disagree?",
];

/** Minimal rendering for the model's prose: paragraphs, "- " / "1." lists (also when a list
 *  follows a lead-in line in the same block) and **bold**. */
const LIST_ITEM = /^\s*(?:[-•*]|\d+[.)])\s+/;

function Prose({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    );

  // Blank lines separate paragraphs. Inside one, consecutive list lines group into one list and
  // consecutive plain lines into one paragraph.
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const para of text.split(/\n{2,}/)) {
    let prev: { list: boolean; lines: string[] } | null = null;
    for (const line of para.split("\n").filter((l) => l.trim())) {
      const list = LIST_ITEM.test(line);
      if (prev && prev.list === list) prev.lines.push(line);
      else blocks.push((prev = { list, lines: [line] }));
    }
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) =>
        b.list ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.lines.map((l, j) => (
              <li key={j}>{bold(l.replace(LIST_ITEM, ""))}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{bold(b.lines.join(" "))}</p>
        ),
      )}
    </div>
  );
}

// The model cites items by id ([G3], [P2][R5]). The ids are internal: hide them (and any
// half-streamed one at the end) and show the resolved sources under the answer instead.
const ID_GROUP = /\s*\[[A-Z]{1,2}\d+(?:\s*,\s*[A-Z]{1,2}\d+)*\]/g;
const PARTIAL_ID = /\s*\[[A-Z]{0,2}\d*(?:\s*,\s*[A-Z]{0,2}\d*)*$/;
const clean = (t: string) => t.replace(ID_GROUP, "").replace(PARTIAL_ID, "");

const textOf = (m: ChatMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
const sourcesOf = (m: ChatMessage) => m.parts.flatMap((p) => (p.type === "data-sources" ? p.data.citations : []));

export function Chat() {
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const seedQuestion = useSearchParams().get("q");
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    void sendMessage({ text: q });
  }

  // A "Discuss" link arrives as /chat?q=...: ask it once.
  useEffect(() => {
    if (seedQuestion && !seeded.current) {
      seeded.current = true;
      void sendMessage({ text: seedQuestion });
    }
  }, [seedQuestion, sendMessage]);

  const last = messages[messages.length - 1];
  const waitingForFirstWord = status === "submitted" || (status === "streaming" && last?.role === "assistant" && !textOf(last));

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-rule bg-sheet">
      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl pt-6">
            <p className="text-[15px] font-medium">Ask a growth question.</p>
            <p className="mt-1 text-[13px] text-text-2">Answers come from the analysis on the other pages and cite their sources.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-rule px-3 py-2.5 text-left text-[13px] transition-colors duration-150 hover:border-accent hover:bg-accent-wash"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[80%] rounded-lg bg-ink px-3.5 py-2 text-[14px] text-white">{textOf(m)}</p>
            </div>
          ) : textOf(m) ? (
            <div key={m.id} className="max-w-[78ch] text-[14px] leading-relaxed">
              <Prose text={clean(textOf(m))} />
              {sourcesOf(m).length > 0 && (
                <div className="mt-3">
                  <Cites citations={sourcesOf(m)} />
                </div>
              )}
            </div>
          ) : null,
        )}

        {waitingForFirstWord && <p className="text-[13px] text-text-2">Thinking…</p>}
        {status === "error" && (
          <p className="max-w-[80ch] rounded-md border border-red/30 bg-red-wash px-3.5 py-2.5 text-[13px] text-red">
            Something went wrong getting an answer{error?.message ? `: ${error.message.slice(0, 160)}` : ""}. Check that OPENAI_API_KEY or AI_GATEWAY_API_KEY is set in frontend/.env.local, then try again.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-rule bg-paper p-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a growth question
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask a growth question"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-rule-strong bg-sheet px-3 py-2 text-[14px] placeholder:text-text-2 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white transition-colors duration-150 hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-rule-strong"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
