"use client";

import { ArrowUp, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Cites } from "@/components/cite";
import type { Citation } from "@/lib/types";

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; citations: Citation[]; usedLiveSearch: boolean }
  | { role: "error"; text: string };

const STARTERS = [
  "What should Builderflow fix first in Work Orders?",
  "How do JobNimbus and Buildertrend price differently from us?",
  "What do contractors complain about most?",
  "Where do our website, portal and guide disagree?",
];

/** Minimal rendering for the model's prose: paragraphs, "- " / "1)" lists, **bold**. */
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
  return (
    <div className="space-y-2.5">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.length > 1 && lines.every((l) => /^(\s*[-•*]\s+|\s*\d+[.)]\s+)/.test(l));
        return isList ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {lines.map((l, j) => (
              <li key={j}>{bold(l.replace(/^(\s*[-•*]\s+|\s*\d+[.)]\s+)/, ""))}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{bold(lines.join(" "))}</p>
        );
      })}
    </div>
  );
}

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setTurns((t) => [...t, { role: "user", text: q }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setTurns((t) => [...t, { role: "assistant", text: data.answer, citations: data.citations, usedLiveSearch: data.usedLiveSearch }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "error", text: "Couldn't reach the chat service. Start it from the repo root with: uvicorn scripts.chat_api:app --port 8000" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-rule bg-sheet">
      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {turns.length === 0 && (
          <div className="mx-auto max-w-2xl pt-6">
            <p className="text-[15px] font-medium">Ask a growth question.</p>
            <p className="mt-1 text-[13px] text-text-2">Answers come from the guide, website, screenshots, market research and the analysis on the other sheets, and cite their sources.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-rule px-3 py-2.5 text-left text-[13px] transition-colors duration-150 hover:border-blue hover:bg-blue-wash"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-lg bg-ink px-3.5 py-2 text-[14px] text-white">{t.text}</p>
            </div>
          ) : t.role === "error" ? (
            <p key={i} className="max-w-[80ch] rounded-md border border-red/30 bg-red-wash px-3.5 py-2.5 text-[13px] text-red">
              {t.text}
            </p>
          ) : (
            <div key={i} className="max-w-[78ch] text-[14px] leading-relaxed">
              <Prose text={t.text} />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-text-2">
                {t.citations.length > 0 && (
                  <span className="flex items-center gap-2">
                    Sources <Cites citations={t.citations} />
                  </span>
                )}
                {t.usedLiveSearch && (
                  <span className="flex items-center gap-1">
                    <Globe size={13} aria-hidden /> Included a live web search
                  </span>
                )}
              </div>
            </div>
          ),
        )}

        {busy && <p className="text-[13px] text-text-2">Retrieving sources and drafting an answer…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-rule-strong bg-paper p-3"
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
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-rule-strong bg-sheet px-3 py-2 text-[14px] placeholder:text-text-2 focus:border-blue focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue text-white transition-colors duration-150 hover:bg-ink disabled:cursor-not-allowed disabled:bg-rule-strong"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
