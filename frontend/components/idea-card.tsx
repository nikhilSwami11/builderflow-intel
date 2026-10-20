import Link from "next/link";
import { DiscussButton } from "@/components/idea-tag";
import { StrengthChip, strengthEdge } from "@/components/strength";
import type { Strength } from "@/lib/strength";

export type IdeaCardData = {
  id: string;
  title: string;
  summary: string;
  question: string;
  counts: { pains: number; gaps: number; pricing: number; messaging: number };
  theme: string | null;
  themeLabel: string | null;
  strength: Strength;
  /** competitors that already ship what the idea covers */
  competitors: string[];
  news: number;
};

function evidenceLine(c: IdeaCardData): string {
  const parts: [number, string, string][] = [
    [c.counts.pains, "complaint", "complaints"],
    [c.counts.gaps, "gap", "gaps"],
    [c.competitors.length, "competitor ships it", "competitors ship it"],
    [c.news, "news item", "news items"],
  ];
  const shown = parts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  return shown.length ? shown.join(" · ") : "Backed by sources only";
}

export function IdeaCard({
  card,
  hero = false,
}: {
  card: IdeaCardData;
  hero?: boolean;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-sheet transition-colors duration-150 hover:border-rule-strong ${hero ? "p-5" : "p-4"}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${strengthEdge(card.strength)}`}
      />
      <div className="mb-2 flex items-center justify-between gap-2 pl-1">
        <StrengthChip level={card.strength} size={hero ? "lg" : "sm"} />
      </div>
      <Link
        href={`/advisor/${card.id}`}
        className={`pl-1 leading-snug font-semibold tracking-tight after:absolute after:inset-0 ${hero ? "text-[16px]" : "text-[14px]"}`}
      >
        {card.title}
      </Link>
      <p
        className={`mt-1.5 pl-1 leading-snug text-text-2 ${hero ? "line-clamp-3 text-[13.5px]" : "line-clamp-2 text-[13px]"}`}
      >
        {card.summary}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 pl-1">
        <span className="text-[12px] text-text-2 tnum">
          {evidenceLine(card)}
        </span>
        <span className="relative z-10 shrink-0">
          <DiscussButton question={card.question} />
        </span>
      </div>
    </article>
  );
}
