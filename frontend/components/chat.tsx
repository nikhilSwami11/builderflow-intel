"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Lightbulb, Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cites } from "@/components/cite";
import { Prose } from "@/components/prose";
import { IdeaTree } from "@/components/idea-tree";
import type { ChatMessage } from "@/lib/chat-types";
import {
  acceptedTree,
  buildIdeas,
  type Decisions,
  type IdeaNode,
} from "@/lib/idea-tree";

const SLOTS = [1, 2, 3];
const storeKey = (slot: number) => `bf-chat-v3-${slot}`;
const ideasKey = (slot: number) => `bf-chat-v3-ideas-${slot}`;

const STARTERS = [
  "What should Builderflow fix first in Work Orders?",
  "How do JobNimbus and Buildertrend price differently from us?",
  "What do contractors complain about most?",
  "Where do our website, portal and guide disagree?",
];

const textOf = (m: ChatMessage) =>
  m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
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
  const [decisions, setDecisions] = useState<Decisions>({});
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
      const ideas = localStorage.getItem(ideasKey(slot));
      if (ideas) setDecisions(JSON.parse(ideas));
    } catch {}
  }, [seedQuestion, setMessages, slot]);

  useEffect(() => {
    if (!restored.current || status !== "ready") return;
    try {
      if (messages.length)
        localStorage.setItem(STORE_KEY, JSON.stringify(messages));
      else localStorage.removeItem(STORE_KEY);
    } catch {}
    onSaved();
  }, [messages, status, STORE_KEY, onSaved]);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  function send(question: string, withDecisions: Decisions = decisions) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    void sendMessage({ text: q }, { body: { decisions: withDecisions } });
  }

  // The assistant proposes ideas; the user decides. "Go ahead" adds the idea to the tree and tells
  // the assistant to carry on with it; "Not this" just drops the proposal.
  function decide(node: IdeaNode, choice: "accepted" | "dismissed") {
    if (busy) return;
    const next = { ...decisions, [node.id]: choice };
    setDecisions(next);
    try {
      localStorage.setItem(ideasKey(slot), JSON.stringify(next));
    } catch {}
    if (choice === "accepted") {
      setTreeOpen(true);
      setFocusNode(node.id);
      send(`Yes, go ahead with "${node.title}".`, next);
    }
  }

  // A "Discuss" link arrives as /chat?q=...: ask it once.
  useEffect(() => {
    if (seedQuestion && !seeded.current) {
      seeded.current = true;
      void sendMessage({ text: seedQuestion }, { body: { decisions: {} } });
    }
  }, [seedQuestion, sendMessage]);

  const ideas = buildIdeas(messages, decisions);
  const tree = acceptedTree(ideas);
  const [focus, setFocusNode] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const setFocus = (id: string) => {
    setFocusNode(id);
    setTreeOpen(true);
  };
  const markersOf = (m: ChatMessage) =>
    ideas
      .filter(
        (n) => n.messageId === m.id && n.anchor && n.status !== "dismissed",
      )
      .map((n) => ({ id: n.id, anchor: n.anchor!, title: n.title }));
  const proposalsOf = (m: ChatMessage) =>
    ideas.filter((n) => n.messageId === m.id);
  const jumpTo = (id: string) =>
    document
      .getElementById(`msg-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  const last = messages[messages.length - 1];
  const waitingForFirstWord =
    status === "submitted" ||
    (status === "streaming" && last?.role === "assistant" && !textOf(last));

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-rule bg-sheet">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setTreeOpen((o) => !o)}
          aria-expanded={treeOpen}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-rule-strong bg-sheet px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150 hover:border-accent"
        >
          <Lightbulb
            size={13}
            aria-hidden
            className="text-[#c98a00]"
            fill="#fde68a"
          />
          Ideas
          {tree.length > 0 && (
            <span className="tnum rounded bg-accent-wash px-1.5 text-text-2">
              {tree.length}
            </span>
          )}
        </button>

        <div
          ref={scroller}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-14 pb-5"
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
                <Prose
                  text={textOf(m)}
                  markers={markersOf(m)}
                  onMarker={setFocus}
                />
                {proposalsOf(m).map((n) => (
                  <div
                    key={n.id}
                    className={`mt-3 flex gap-2.5 rounded-lg border px-3.5 py-3 ${n.status === "dismissed" ? "border-rule bg-paper opacity-60" : "border-amber/40 bg-amber-wash"}`}
                  >
                    <Lightbulb
                      size={16}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-amber"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-[13px] text-text-2">{n.why}</p>
                      {n.status === "pending" && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-text-2">
                            Does this direction look good?
                          </span>
                          <button
                            onClick={() => decide(n, "accepted")}
                            disabled={busy}
                            className="rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-white transition-colors duration-150 hover:bg-[#333] disabled:opacity-40"
                          >
                            Yes, go ahead
                          </button>
                          <button
                            onClick={() => decide(n, "dismissed")}
                            disabled={busy}
                            className="rounded-md border border-rule-strong bg-sheet px-2.5 py-1 text-[12px] text-text-2 transition-colors duration-150 hover:border-accent hover:text-text disabled:opacity-40"
                          >
                            Not this
                          </button>
                        </div>
                      )}
                      {n.status === "accepted" && (
                        <button
                          onClick={() => setFocus(n.id)}
                          className="mt-1.5 text-[11.5px] text-text-2 underline underline-offset-2 hover:text-text"
                        >
                          In your idea tree
                        </button>
                      )}
                      {n.status === "dismissed" && (
                        <p className="mt-1 text-[11.5px] text-text-2">
                          Skipped
                        </p>
                      )}
                    </div>
                  </div>
                ))}
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
      {treeOpen && (
        <IdeaTree
          onClose={() => setTreeOpen(false)}
          nodes={tree}
          focus={focus}
          onPick={(n) => {
            setFocus(n.id);
            jumpTo(n.messageId);
          }}
        />
      )}
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

const TABS_KEY = "bf-chat-tabs";

const clearSlot = (slot: number) => {
  try {
    localStorage.removeItem(storeKey(slot));
    localStorage.removeItem(ideasKey(slot));
  } catch {}
};

/** Up to three separate conversations, kept in this browser. One tab is always open. */
export function Chat() {
  const seedQuestion = useSearchParams().get("q");
  const [open, setOpen] = useState<number[]>([1]);
  const [active, setActive] = useState(1);
  const [seed, setSeed] = useState<{ slot: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [titles, setTitles] = useState<Record<number, string | null>>({});
  const [ready, setReady] = useState(false);
  const refresh = useCallback(
    () => setTitles(Object.fromEntries(SLOTS.map((s) => [s, titleOf(s)]))),
    [],
  );

  useEffect(() => {
    let tabs = [1];
    try {
      const saved: number[] = JSON.parse(
        localStorage.getItem(TABS_KEY) ?? "[1]",
      );
      if (
        Array.isArray(saved) &&
        saved.length &&
        saved.every((n) => SLOTS.includes(n))
      )
        tabs = saved;
    } catch {}
    let current = tabs[0];
    // A "Discuss" link opens a fresh tab (or replaces the last one when all three are used).
    if (seedQuestion) {
      const free = SLOTS.find((s) => !tabs.includes(s));
      current = free ?? tabs[tabs.length - 1];
      if (!free) clearSlot(current);
      else tabs = [...tabs, free];
      setSeed({ slot: current, text: seedQuestion });
    }
    setOpen(tabs);
    setActive(current);
    refresh();
    setReady(true);
  }, [seedQuestion, refresh]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(open));
    } catch {}
  }, [open, ready]);

  function addTab() {
    const free = SLOTS.find((s) => !open.includes(s));
    if (free === undefined) return;
    clearSlot(free);
    setOpen([...open, free]);
    setActive(free);
    refresh();
  }

  function closeTab(slot: number) {
    if (open.length === 1) return;
    clearSlot(slot);
    const rest = open.filter((s) => s !== slot);
    setOpen(rest);
    if (active === slot) setActive(rest[0]);
    refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div role="tablist" aria-label="Chats" className="flex gap-1.5">
        {open.map((slot, i) => (
          <div
            key={slot}
            className={`flex max-w-52 items-center rounded-md border text-[13px] transition-colors duration-150 ${
              active === slot
                ? "border-ink bg-ink text-white"
                : "border-rule-strong text-text-2 hover:border-accent hover:text-text"
            }`}
          >
            <button
              role="tab"
              aria-selected={active === slot}
              disabled={busy && active !== slot}
              onClick={() => setActive(slot)}
              className="min-w-0 flex-1 truncate py-1.5 pr-1 pl-3 text-left disabled:opacity-40"
            >
              {titles[slot] ?? `Chat ${i + 1}`}
            </button>
            {open.length > 1 && (
              <button
                aria-label={`Close ${titles[slot] ?? `chat ${i + 1}`}`}
                disabled={busy}
                onClick={() => closeTab(slot)}
                className="mr-1 flex size-5 shrink-0 items-center justify-center rounded opacity-70 hover:bg-white/15 hover:opacity-100 disabled:opacity-30"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {open.length < SLOTS.length && (
          <button
            aria-label="New chat tab"
            disabled={busy}
            onClick={addTab}
            className="flex size-8 items-center justify-center rounded-md border border-rule-strong text-text-2 transition-colors duration-150 hover:border-accent hover:text-text disabled:opacity-40"
          >
            <Plus size={15} aria-hidden />
          </button>
        )}
      </div>
      {ready && (
        <ChatPane
          key={active}
          slot={active}
          seed={seed?.slot === active ? seed.text : null}
          onSaved={refresh}
          onBusy={setBusy}
        />
      )}
    </div>
  );
}
