"use client";

import { useState } from "react";
import { Cites } from "@/components/cite";
import { IdeaTag } from "@/components/idea-tag";
import type { Citation } from "@/lib/types";

export type ThemeGroup = {
  theme: string;
  label: string;
  color: string;
  points: { id: string; description: string; companies: string[]; citation: Citation; idea: { id: string; title: string } | null }[];
};

/** Donut of complaint themes. Picking a slice (or its legend row) lists that theme's points. */
export function PainExplorer({ groups }: { groups: ThemeGroup[] }) {
  const total = groups.reduce((a, g) => a + g.points.length, 0);
  const [selected, setSelected] = useState(groups[0].theme);
  const current = groups.find((g) => g.theme === selected) ?? groups[0];

  let offset = 25; // start at 12 o'clock
  const slices = groups.map((g) => {
    const pct = (g.points.length / total) * 100;
    const slice = { g, pct, offset };
    offset -= pct;
    return slice;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div>
        <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
          <svg viewBox="0 0 42 42" className="h-full w-full" role="img" aria-label="Pain points by theme">
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--rule)" strokeWidth="6" />
            {slices.map(({ g, pct, offset }) => (
              <circle
                key={g.theme}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={g.color}
                strokeWidth={g.theme === selected ? 7.5 : 6}
                strokeDasharray={`${Math.max(pct - 0.6, 0.1)} ${100 - Math.max(pct - 0.6, 0.1)}`}
                strokeDashoffset={offset}
                opacity={g.theme === selected ? 1 : 0.35}
                className="cursor-pointer transition-all duration-200"
                onClick={() => setSelected(g.theme)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[28px] leading-none font-semibold tnum">{current.points.length}</span>
            <span className="mt-1 max-w-[7rem] text-[12px] leading-tight text-text-2">{current.label}</span>
          </div>
        </div>

        <ul className="mt-4 space-y-0.5">
          {groups.map((g) => (
            <li key={g.theme}>
              <button
                onClick={() => setSelected(g.theme)}
                aria-pressed={g.theme === selected}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-150 ${
                  g.theme === selected ? "bg-accent-wash font-medium" : "hover:bg-paper"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: g.color }} />
                <span className="flex-1">{g.label}</span>
                <span className="font-mono text-text-2 tnum">{g.points.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">
          {current.label} <span className="font-normal text-text-2 tnum">· {current.points.length} of {total}</span>
        </h3>
        <ul className="mt-2 divide-y divide-rule border-t border-rule">
          {current.points.map((p) => (
            <li key={p.id} className="py-3.5">
              <p className="text-[14px] leading-snug">{p.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-text-2">
                <span>{p.companies.length ? p.companies.join(", ") : "Industry-wide"}</span>
                <Cites citations={[p.citation]} />
                {p.idea && <IdeaTag href={`/advisor/${p.idea.id}`} title={p.idea.title} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
