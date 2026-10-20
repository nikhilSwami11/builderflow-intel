"use client";

import { Lightbulb, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { IdeaNode } from "@/lib/idea-tree";

const DOT = 16;
const ROW = 38; // distance between levels
const COL = 30; // distance between siblings
const PAD = 14;

type Placed = IdeaNode & { x: number; y: number; depth: number };

/** Top-to-bottom tree: depth sets y; each leaf takes the next column and a parent sits at the
 *  middle of its children. Roots hang off a small ring that stands for the conversation. */
function layout(nodes: IdeaNode[]): {
  placed: Placed[];
  width: number;
  height: number;
} {
  const kids = (id: string | null) => nodes.filter((n) => n.parent === id);
  const placed: Placed[] = [];
  let col = 0;
  const walk = (n: IdeaNode, depth: number): number => {
    const cs = kids(n.id);
    const xs = cs.length ? cs.map((c) => walk(c, depth + 1)) : [col++ * COL];
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    placed.push({ ...n, x, y: (depth + 1) * ROW, depth });
    return x;
  };
  kids(null).forEach((n) => walk(n, 0));
  const depth = Math.max(0, ...placed.map((p) => p.depth));
  return {
    placed,
    width: Math.max(col, 1) * COL + PAD * 2 - (COL - DOT),
    height: (depth + 1) * ROW + DOT + PAD * 2,
  };
}

export function IdeaTree({
  nodes,
  focus,
  onPick,
  onClose,
}: {
  nodes: IdeaNode[];
  focus: string | null;
  onPick: (node: IdeaNode) => void;
  onClose: () => void;
}) {
  const { placed, width, height } = useMemo(() => layout(nodes), [nodes]);
  const [hover, setHover] = useState<{
    node: Placed;
    x: number;
    y: number;
  } | null>(null);
  const byId = new Map(placed.map((p) => [p.id, p]));
  const roots = placed.filter((p) => p.parent === null);
  const rootX = roots.length
    ? roots.reduce((a, p) => a + p.x, 0) / roots.length
    : 0;
  const c = DOT / 2;
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const my = (y1 + y2) / 2;
    return `M${x1 + PAD + c},${y1 + PAD + c} C${x1 + PAD + c},${my + PAD + c} ${x2 + PAD + c},${my + PAD + c} ${x2 + PAD + c},${y2 + PAD + c}`;
  };

  return (
    <aside
      aria-label="Idea tree"
      className="absolute inset-y-0 right-0 z-20 flex w-[min(10rem,100%)] flex-col border-l border-rule bg-paper shadow-xl lg:static lg:shrink-0 lg:shadow-none"
    >
      <div className="flex items-center gap-1.5 border-b border-rule px-3 py-2.5 text-[12px] font-medium">
        <Lightbulb size={13} aria-hidden /> Ideas
        {nodes.length > 0 && (
          <span className="tnum font-normal text-text-2">{nodes.length}</span>
        )}
        <button
          onClick={onClose}
          aria-label="Close idea tree"
          className="ml-auto flex size-5 items-center justify-center rounded text-text-2 transition-colors duration-150 hover:bg-accent-wash hover:text-text"
        >
          <X size={13} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {nodes.length ? (
          <div className="relative" style={{ width, height }}>
            <svg
              width={width}
              height={height}
              className="absolute inset-0"
              aria-hidden
            >
              {placed.map((p) => {
                const from = p.parent ? byId.get(p.parent) : null;
                const [x1, y1] = from ? [from.x, from.y] : [rootX, 0];
                const lit = hover?.node.id === p.id || focus === p.id;
                return (
                  <path
                    key={p.id}
                    d={edge(x1, y1, p.x, p.y)}
                    fill="none"
                    stroke={lit ? "var(--ink)" : "var(--rule-strong)"}
                    strokeWidth={lit ? 2 : 1.5}
                    className="transition-all duration-150"
                  />
                );
              })}
            </svg>
            <span
              aria-hidden
              title="This conversation"
              className="absolute rounded-full border-2 border-ink bg-sheet"
              style={{ left: rootX + PAD, top: PAD, width: DOT, height: DOT }}
            />
            {placed.map((p) => {
              const on = focus === p.id || hover?.node.id === p.id;
              const show = (e: { currentTarget: HTMLElement }) => {
                const r = e.currentTarget.getBoundingClientRect();
                setHover({ node: p, x: r.left, y: r.top });
              };
              return (
                <button
                  key={p.id}
                  aria-label={p.title}
                  onClick={() => onPick(p)}
                  onMouseEnter={show}
                  onFocus={show}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                  className={`absolute rounded-full border-2 transition-all duration-150 ${on ? "scale-125 border-ink bg-[#fde68a]" : "border-[#c98a00] bg-[#fde68a] hover:scale-125"} ${focus === p.id ? "ring-2 ring-[#f0d68a]" : ""}`}
                  style={{
                    left: p.x + PAD,
                    top: p.y + PAD,
                    width: DOT,
                    height: DOT,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <p className="px-1 py-2 text-[11.5px] leading-snug text-text-2">
            Ideas you accept appear here. Hover a dot for details.
          </p>
        )}
      </div>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-56 rounded-lg border border-rule-strong bg-sheet p-3 shadow-lg"
          style={{
            left: Math.max(8, hover.x - 232),
            top: Math.max(8, hover.y - 8),
          }}
        >
          <p className="text-[13px] font-semibold">{hover.node.title}</p>
          <p className="mt-1 text-[12px] leading-snug text-text-2">
            {hover.node.why}
          </p>
          <p className="mt-1.5 text-[11px] text-text-2">
            Click to jump to the reply
          </p>
        </div>
      )}
    </aside>
  );
}
