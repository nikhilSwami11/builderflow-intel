"use client";

import { Lightbulb } from "lucide-react";
import type { IdeaNode } from "@/lib/idea-tree";

/** Ideas from the conversation as an indented tree. Clicking a node scrolls to the reply that
 *  produced it. */
export function IdeaTree({ nodes, onPick }: { nodes: IdeaNode[]; onPick: (messageId: string) => void }) {
  const branch = (parent: string | null, depth: number) =>
    nodes
      .filter((n) => n.parent === parent)
      .map((n) => (
        <li key={n.id} className={depth ? "relative ml-3 border-l border-rule-strong pl-3" : ""}>
          <button
            title={n.why}
            onClick={() => onPick(n.messageId)}
            className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors duration-150 hover:bg-accent-wash"
          >
            <span aria-hidden className="mt-[5px] size-1.5 shrink-0 rounded-full bg-ink" />
            <span>{n.title}</span>
          </button>
          <ul>{branch(n.id, depth + 1)}</ul>
        </li>
      ));

  return (
    <aside aria-label="Idea tree" className="hidden w-64 shrink-0 flex-col border-l border-rule bg-paper lg:flex">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3 text-[13px] font-medium">
        <Lightbulb size={15} aria-hidden /> Idea tree
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {nodes.length ? (
          <ul>{branch(null, 0)}</ul>
        ) : (
          <p className="px-2 py-3 text-[12px] leading-snug text-text-2">Ideas from this conversation collect here as they take shape. Branches show where you changed direction.</p>
        )}
      </div>
    </aside>
  );
}
