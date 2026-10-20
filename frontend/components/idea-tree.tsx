"use client";

import { Lightbulb, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { IdeaNode } from "@/lib/idea-tree";

const NODE_W = 100;
const NODE_H = 44;
const COL = 120; // distance between levels
const ROW = 58; // distance between siblings
const PAD = 12;
const ROOT_D = 40; // diameter of the "Chat" root circle

type Placed = IdeaNode & { x: number; y: number; depth: number };

/** Tidy left-to-right layout: depth sets x; each leaf takes the next row and a parent sits at the
 *  middle of its children. The conversation itself is the root on the left. */
function layout(nodes: IdeaNode[]): {
  placed: Placed[];
  width: number;
  height: number;
} {
  const kids = (id: string | null) => nodes.filter((n) => n.parent === id);
  const placed: Placed[] = [];
  let row = 0;
  const walk = (n: IdeaNode, depth: number): number => {
    const cs = kids(n.id);
    const ys = cs.length ? cs.map((c) => walk(c, depth + 1)) : [row++ * ROW];
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    placed.push({ ...n, x: ROOT_D + 14 + depth * COL, y, depth });
    return y;
  };
  kids(null).forEach((n) => walk(n, 0));
  return {
    placed,
    width:
      (Math.max(0, ...placed.map((p) => p.depth)) + 2) * COL -
      (COL - NODE_W) +
      PAD * 2,
    height: Math.max(row, 1) * ROW + PAD * 2,
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
  const rootY = placed.length
    ? placed.filter((p) => p.parent === null).reduce((a, p) => a + p.y, 0) /
      placed.filter((p) => p.parent === null).length
    : 0;
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    return `M${x1 + PAD},${y1 + PAD} C${mx + PAD},${y1 + PAD} ${mx + PAD},${y2 + PAD} ${x2 + PAD},${y2 + PAD}`;
  };

  return (
    <aside
      aria-label="Idea tree"
      className="absolute inset-y-0 right-0 z-20 flex w-[min(28rem,100%)] flex-col border-l border-rule bg-paper shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3 text-[13px] font-medium">
        <Lightbulb size={15} aria-hidden /> Idea tree
        {nodes.length > 0 && (
          <span className="tnum text-[12px] font-normal text-text-2">
            {nodes.length}
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Close idea tree"
          className="ml-auto flex size-6 items-center justify-center rounded-md text-text-2 transition-colors duration-150 hover:bg-accent-wash hover:text-text"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
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
                const [x1, y1] = from
                  ? [from.x + NODE_W, from.y + NODE_H / 2]
                  : [ROOT_D, rootY + NODE_H / 2];
                const lit = hover?.node.id === p.id || focus === p.id;
                return (
                  <path
                    key={p.id}
                    d={edge(x1, y1, p.x, p.y + NODE_H / 2)}
                    fill="none"
                    stroke={lit ? "var(--ink)" : "var(--rule-strong)"}
                    strokeWidth={lit ? 2 : 1.5}
                    className="transition-all duration-150"
                  />
                );
              })}
            </svg>
            <span
              className="absolute flex items-center justify-center rounded-full bg-ink text-[10px] font-medium text-white"
              style={{
                left: PAD,
                top: rootY + PAD,
                width: ROOT_D,
                height: ROOT_D,
              }}
              title="This conversation"
            >
              Chat
            </span>
            {placed.map((p) => {
              const on = focus === p.id || hover?.node.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ node: p, x: r.left, y: r.top });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onFocus={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ node: p, x: r.left, y: r.top });
                  }}
                  onBlur={() => setHover(null)}
                  className={`absolute flex items-center gap-1.5 rounded-lg border px-2 text-left text-[11.5px] leading-tight shadow-sm transition-all duration-150 ${
                    on
                      ? "z-10 scale-105 border-ink bg-sheet"
                      : "border-rule-strong bg-sheet hover:border-ink"
                  } ${focus === p.id ? "ring-2 ring-[#f0d68a]" : ""}`}
                  style={{
                    left: p.x + PAD,
                    top: p.y + PAD,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <Lightbulb
                    size={12}
                    aria-hidden
                    className="shrink-0 text-[#c98a00]"
                    fill="#fde68a"
                  />
                  <span className="line-clamp-2">{p.title}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-1 py-2 text-[12px] leading-snug text-text-2">
            Ideas from this conversation appear here as a graph. Building on an
            idea adds a branch; hover a node for the reasoning.
          </p>
        )}
      </div>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-60 rounded-lg border border-rule-strong bg-sheet p-3 shadow-lg"
          style={{
            left: Math.min(Math.max(8, hover.x), window.innerWidth - 256),
            top: hover.y + NODE_H + 8,
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
