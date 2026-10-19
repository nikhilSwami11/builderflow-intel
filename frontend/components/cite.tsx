"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import type { Citation } from "@/lib/types";

const SOURCE_LABEL: Record<Citation["source"], string> = {
  website: "Website",
  search: "Web search",
  screenshot: "Builderflow screenshot",
  manual: "Hand-verified",
  guide: "User guide",
};

function isUrl(ref: string) {
  return /^https?:\/\//.test(ref);
}

function host(ref: string) {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref;
  }
}

/** One citation as a numbered callout bubble. The hover card is position: fixed and placed
 *  from the bubble's rect, so it is never clipped by scrolling tables or the screen edge.
 *  Links open the source in a new tab. */
export function Cite({ citation, n }: { citation: Citation; n: number }) {
  const href = isUrl(citation.ref) ? citation.ref : citation.image ?? undefined;
  const bubble =
    "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-blue/50 bg-blue-wash px-1 font-mono text-[11px] font-medium text-blue tnum transition-colors duration-150 hover:bg-blue hover:text-white";
  const label = `Source ${n}: ${SOURCE_LABEL[citation.source]}`;
  const anchor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const show = () => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const W = 288;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    const below = r.top < 220;
    setPos({ left, top: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setPos(null);

  return (
    <span ref={anchor} className="relative inline-block align-middle" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={bubble} aria-label={label}>
          {n}
        </a>
      ) : (
        <span tabIndex={0} className={bubble} aria-label={label}>
          {n}
        </span>
      )}
      {pos && (
        <span
          role="tooltip"
          style={{ left: pos.left, top: pos.top, transform: pos.below ? undefined : "translateY(-100%)" }}
          className="pointer-events-none fixed z-50 w-72 rounded-md border border-rule-strong bg-sheet p-3 text-left text-[12px] leading-snug whitespace-normal text-text shadow-[0_6px_18px_-6px_rgba(14,42,71,0.28)]"
        >
          <span className="flex items-center justify-between gap-2 text-text-2">
            <span className="font-medium text-text">{SOURCE_LABEL[citation.source]}</span>
            {href && <ExternalLink size={12} aria-hidden />}
          </span>
          {citation.source === "screenshot" && citation.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={citation.image} alt="" className="mt-2 max-h-40 w-full rounded border border-rule object-cover object-top" />
          )}
          {citation.source === "screenshot" && !citation.image && <span className="mt-2 block text-text-2">Image not available</span>}
          {citation.note && <span className="mt-2 block text-text-2">{citation.note}</span>}
          <span className="mt-2 block font-mono text-[11px] break-all text-text-2">
            {isUrl(citation.ref) ? host(citation.ref) : citation.flow ? `flow: ${citation.flow}` : citation.ref}
          </span>
        </span>
      )}
    </span>
  );
}

/** Numbers citations 1..n per list, collapsing duplicate refs. */
export function Cites({ citations }: { citations: Citation[] }) {
  const seen = new Set<string>();
  const unique = citations.filter((c) => {
    const k = `${c.source}|${c.ref}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!unique.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {unique.map((c, i) => (
        <Cite key={`${c.source}|${c.ref}`} citation={c} n={i + 1} />
      ))}
    </span>
  );
}
