"use client";

import { useState } from "react";
import { IdeaCard, type IdeaCardData } from "@/components/idea-card";
import { strengthSelected } from "@/components/strength";
import { STRENGTH_LABEL, type Strength } from "@/lib/strength";

export type BoardCard = IdeaCardData & { column: string };
export type BoardColumn = { key: string; label: string };

/** Ideas in columns by the kind of move they are. The chips filter by the complaint theme an
 *  idea's evidence points to. */
export function AdvisorBoard({
  cards,
  columns,
}: {
  cards: BoardCard[];
  columns: BoardColumn[];
}) {
  const [theme, setTheme] = useState<string>("all");
  const [level, setLevel] = useState<"all" | Strength>("all");
  const themes = [
    ...new Map(
      cards.filter((c) => c.theme).map((c) => [c.theme!, c.themeLabel!]),
    ).entries(),
  ];
  const visible = cards.filter(
    (c) =>
      (theme === "all" || c.theme === theme) &&
      (level === "all" || c.strength === level),
  );

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by evidence strength"
      >
        <span className="mr-1 text-[12px] text-text-2">Strength</span>
        {(["all", "strong", "promising", "early"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setLevel(k)}
            aria-pressed={level === k}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-150 ${
              level === k
                ? k === "all"
                  ? "border-accent bg-accent text-white"
                  : strengthSelected[k]
                : "border-rule-strong bg-sheet text-text-2 hover:text-text"
            }`}
          >
            {k === "all" ? "All" : STRENGTH_LABEL[k]}
          </button>
        ))}
      </div>
      <div
        className="mb-4 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by complaint theme"
      >
        <span className="mr-1 text-[12px] text-text-2">Fixes</span>
        {[["all", "Everything"], ...themes].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            aria-pressed={theme === key}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-150 ${
              theme === key
                ? "border-accent bg-accent text-white"
                : "border-rule-strong bg-sheet text-text-2 hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = visible.filter((c) => c.column === col.key);
          return (
            <section key={col.key} aria-label={col.label}>
              <h3 className="mb-2 flex items-baseline gap-1.5 text-[13px] font-semibold">
                {col.label}
                <span className="font-mono text-[12px] font-normal text-text-2 tnum">
                  {items.length}
                </span>
              </h3>
              <div className="space-y-3">
                {items.length ? (
                  items.map((c) => <IdeaCard key={c.id} card={c} />)
                ) : (
                  <p className="text-[13px] text-text-2">
                    Nothing here for this filter.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
