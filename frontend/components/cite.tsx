"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import type { Citation } from "@/lib/types";

// [background, text] pairs. A source keeps the same color everywhere it appears.
const TONES: [string, string][] = [
  ["#e8f0fe", "#1a56c4"],
  ["#e3f5ea", "#1b7a45"],
  ["#fdeed9", "#a65b00"],
  ["#fde8ee", "#b4234f"],
  ["#f0e8fd", "#6b34c9"],
  ["#dff4f4", "#0e7c7b"],
  ["#fbe9e1", "#b84a1c"],
  ["#eceff3", "#455468"],
  ["#fff3c4", "#8a6d00"],
];

type Group = { key: string; label: string; initial: string; tone: [string, string]; items: Citation[] };

function isUrl(ref: string) {
  return /^https?:\/\//.test(ref);
}

function hostOf(ref: string) {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref;
  }
}

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function groupFor(c: Citation): Pick<Group, "key" | "label" | "initial" | "tone"> {
  if (c.source === "screenshot") return { key: "screenshot", label: "Builderflow screenshots", initial: "S", tone: TONES[6] };
  if (c.source === "manual") return { key: "manual", label: "Hand-verified", initial: "H", tone: TONES[7] };
  if (c.source === "guide") return { key: "guide", label: "User guide", initial: "G", tone: TONES[8] };
  const host = hostOf(c.ref);
  return { key: host, label: host, initial: host[0].toUpperCase(), tone: TONES[[0, 1, 2, 3, 4, 5][hash(host) % 6]] };
}

/** Citations grouped by site. */
function group(citations: Citation[]): Group[] {
  const seen = new Set<string>();
  const groups = new Map<string, Group>();
  for (const c of citations) {
    const k = `${c.source}|${c.ref}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const g = groupFor(c);
    if (!groups.has(g.key)) groups.set(g.key, { ...g, items: [] });
    groups.get(g.key)!.items.push(c);
  }
  return [...groups.values()];
}

function pathOf(ref: string) {
  try {
    const u = new URL(ref);
    return (u.pathname + u.search).replace(/\/$/, "") || "Homepage";
  } catch {
    return ref;
  }
}

/** One source group: a colored initial chip. Hovering (or focusing) it opens a card listing
 *  every link in the group. The card is position: fixed, so scrolling tables and the screen
 *  edge never clip it. */
function SourceChip({ g }: { g: Group }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const [bg, fg] = g.tone;

  const show = () => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const W = 320;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    const below = r.top < 260;
    setPos({ left, top: below ? r.bottom : r.top, below });
  };

  const only = g.items.length === 1 ? g.items[0] : null;
  const onlyHref = only ? (isUrl(only.ref) ? only.ref : only.image ?? undefined) : undefined;
  const chipClass = "inline-flex h-[22px] min-w-[22px] items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-semibold";
  const content = (
    <>
      {g.initial}
      {g.items.length > 1 && <span className="font-mono font-normal opacity-70 tnum">{g.items.length}</span>}
    </>
  );

  return (
    <span
      ref={anchor}
      className="relative inline-block align-middle"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPos(null);
      }}
    >
      {onlyHref ? (
        <a href={onlyHref} target="_blank" rel="noreferrer" aria-label={`Source: ${g.label}`} className={chipClass} style={{ background: bg, color: fg }}>
          {content}
        </a>
      ) : (
        <span tabIndex={0} aria-label={`${g.items.length} sources: ${g.label}`} className={chipClass} style={{ background: bg, color: fg }}>
          {content}
        </span>
      )}

      {pos && (
        <span
          role="tooltip"
          style={{ left: pos.left, top: pos.top, transform: pos.below ? undefined : "translateY(-100%)" }}
          className={`fixed z-50 block w-80 text-left ${pos.below ? "pt-2" : "pb-2"}`}
        >
          <span className="block rounded-lg border border-rule-strong bg-sheet p-3 text-[12px] leading-snug whitespace-normal text-text shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]">
            <span className="flex items-center gap-2 font-medium">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded text-[10px] font-semibold" style={{ background: bg, color: fg }}>
                {g.initial}
              </span>
              {g.label}
              <span className="font-normal text-text-2">
                · {g.items.length} {g.items.length === 1 ? "source" : "sources"}
              </span>
            </span>
            <span className="mt-2 block max-h-72 space-y-1 overflow-y-auto">
              {g.items.slice(0, 8).map((c, i) => {
                const href = isUrl(c.ref) ? c.ref : c.image ?? undefined;
                const inner = (
                  <>
                    {c.source === "screenshot" && c.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="mb-1.5 max-h-24 w-full rounded border border-rule object-cover object-top" />
                    )}
                    <span className="block truncate font-medium">{c.source === "screenshot" ? c.flow ?? "screenshot" : isUrl(c.ref) ? pathOf(c.ref) : c.ref}</span>
                    {c.note && <span className="mt-0.5 line-clamp-2 block text-text-2">{c.note}</span>}
                  </>
                );
                return href ? (
                  <a key={i} href={href} target="_blank" rel="noreferrer" className="group/row block rounded-md px-2 py-1.5 hover:bg-paper">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1">{inner}</span>
                      <ExternalLink size={12} aria-hidden className="mt-0.5 shrink-0 text-text-2" />
                    </span>
                  </a>
                ) : (
                  <span key={i} className="block rounded-md px-2 py-1.5">
                    {inner}
                  </span>
                );
              })}
              {g.items.length > 8 && <span className="block px-2 text-text-2">+ {g.items.length - 8} more</span>}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

/** "Sources" followed by one colored chip per site. */
export function Cites({ citations, label = true }: { citations: Citation[]; label?: boolean }) {
  const groups = group(citations);
  if (!groups.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {label && <span className="mr-0.5 text-[12px] text-text-2">Sources</span>}
      {groups.map((g) => (
        <SourceChip key={g.key} g={g} />
      ))}
    </span>
  );
}
