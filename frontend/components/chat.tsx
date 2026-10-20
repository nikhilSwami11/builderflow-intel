"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Lightbulb, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cites } from "@/components/cite";
import { IdeaTree } from "@/components/idea-tree";
import type { ChatMessage } from "@/lib/chat-types";
import { buildTree } from "@/lib/idea-tree";

const SLOTS = [1, 2, 3];
const storeKey = (slot: number) => `bf-chat-v3-${slot}`;

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

const textOf = (m: ChatMessage) =>
  m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
const ideaOf = (m: ChatMessage) =>
  m.parts.flatMap((p) => (p.type === "data-idea" ? [p.data] : []))[0];
const sourcesOf = (m: ChatMessage) =>
  m.parts.flatMap((p) => (p.type === "data-sources" ? p.data.citations : []));

function ChatPane({
  slot,
  seed,
  onSaved,
  onBusy,
}: {
  slot: number;
  seed: string | null;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const STORE_KEY = storeKey(slot);
  const { messages, sendMessage, setMessages, status, error } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });
  const restored = useRef(false);
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const seedQuestion = seed;
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => onBusy(busy), [busy, onBusy]);

  // Keep the conversation across reloads (this browser only). A "Discuss" link (?q=) starts fresh.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (seedQuestion) return;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [seedQuestion, setMessages]);

  useEffect(() => {
    if (!restored.current || status !== "ready") return;
    try {
      if (messages.length)
        localStorage.setItem(STORE_KEY, JSON.stringify(messages));
      else localStorage.removeItem(STORE_KEY);
    } catch {}
    onSaved();
  }, [messages, status, STORE_KEY, onSaved]);

  function newChat() {
    setMessages([]);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {}
    onSaved();
  }

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
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

  const tree = buildTree(messages);
  const jumpTo = (id: string) =>
    document
      .getElementById(`msg-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  const last = messages[messages.length - 1];
  const waitingForFirstWord =
    status === "submitted" ||
    (status === "streaming" && last?.role === "assistant" && !textOf(last));

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-rule bg-sheet">
      <div className="flex min-w-0 flex-1 flex-col">
        {messages.length > 0 && (
          <div className="flex justify-end border-b border-rule px-3 py-2">
            <button
              onClick={newChat}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md border border-rule-strong px-2.5 py-1 text-[12px] text-text-2 transition-colors duration-150 hover:border-accent hover:text-text disabled:opacity-40"
            >
              <Plus size={13} aria-hidden /> New chat
            </button>
          </div>
        )}
        <div
          ref={scroller}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl pt-6">
              <p className="text-[15px] font-medium">Ask a growth question.</p>
              <p className="mt-1 text-[13px] text-text-2">
                Answers come from the analysis on the other pages and cite their
                sources.
              </p>
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
                <p className="max-w-[80%] rounded-lg bg-ink px-3.5 py-2 text-[14px] text-white">
                  {textOf(m)}
                </p>
              </div>
            ) : textOf(m) ? (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className="max-w-[78ch] scroll-mt-4 text-[14px] leading-relaxed"
              >
                <Prose text={textOf(m)} />
                {ideaOf(m) && (
                  <div className="mt-3 flex gap-2.5 rounded-lg border border-amber/40 bg-amber-wash px-3.5 py-3">
                    <Lightbulb
                      size={16}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-amber"
                    />
                    <div>
                      <p className="text-[13px] font-semibold">
                        {ideaOf(m)!.title}
                      </p>
                      <p className="mt-0.5 text-[13px] text-text-2">
                        {ideaOf(m)!.why}
                      </p>
                      <p className="mt-1 text-[11px] text-text-2">
                        Added to the idea tree
                      </p>
                    </div>
                  </div>
                )}
                {sourcesOf(m).length > 0 && (
                  <div className="mt-3">
                    <Cites citations={sourcesOf(m)} />
                  </div>
                )}
                {m.id === last?.id && status === "ready" && (
                  <button
                    onClick={() => send("Go into more detail on that.")}
                    className="mt-3 rounded-md border border-rule-strong px-2.5 py-1 text-[12px] text-text-2 transition-colors duration-150 hover:border-accent hover:text-text"
                  >
                    More detail
                  </button>
                )}
              </div>
            ) : null,
          )}

          {waitingForFirstWord && (
            <p className="text-[13px] text-text-2">Thinking…</p>
          )}
          {status === "error" && (
            <p className="max-w-[80ch] rounded-md border border-red/30 bg-red-wash px-3.5 py-2.5 text-[13px] text-red">
              Something went wrong getting an answer
              {error?.message ? `: ${error.message.slice(0, 160)}` : ""}. Check
              that OPENAI_API_KEY or AI_GATEWAY_API_KEY is set in
              frontend/.env.local, then try again.
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
      <IdeaTree nodes={tree} onPick={jumpTo} />
    </div>
  );
}

const titleOf = (slot: number): string | null => {
  try {
    const saved: ChatMessage[] = JSON.parse(
      localStorage.getItem(storeKey(slot)) ?? "[]",
    );
    const first = saved.find((m) => m.role === "user");
    return first ? textOf(first).slice(0, 28) : null;
  } catch {
    return null;
  }
};

/** Up to three separate conversations, kept in this browser. */
export function Chat() {
  const seedQuestion = useSearchParams().get("q");
  const [active, setActive] = useState(1);
  const [busy, setBusy] = useState(false);
  const [titles, setTitles] = useState<(string | null)[]>([null, null, null]);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(() => setTitles(SLOTS.map(titleOf)), []);

  // A "Discuss" link goes into the first empty chat (or the last one when all three are used).
  useEffect(() => {
    const t = SLOTS.map(titleOf);
    setTitles(t);
    if (seedQuestion) setActive(t.findIndex((x) => x === null) + 1 || 3);
    setReady(true);
  }, [seedQuestion]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Chats" className="flex gap-1.5">
        {SLOTS.map((slot) => (
          <button
            key={slot}
            role="tab"
            aria-selected={active === slot}
            disabled={busy && active !== slot}
            onClick={() => setActive(slot)}
            className={`max-w-48 truncate rounded-md border px-3 py-1.5 text-[13px] transition-colors duration-150 disabled:opacity-40 ${
              active === slot
                ? "border-ink bg-ink text-white"
                : "border-rule-strong text-text-2 hover:border-accent hover:text-text"
            }`}
          >
            {titles[slot - 1] ?? `Chat ${slot}`}
          </button>
        ))}
      </div>
      {ready && (
        <ChatPane
          key={active}
          slot={active}
          seed={
            seedQuestion &&
            active === (titles.findIndex((x) => x === null) + 1 || 3)
              ? seedQuestion
              : null
          }
          onSaved={refresh}
          onBusy={setBusy}
        />
      )}
    </div>
  );
}
