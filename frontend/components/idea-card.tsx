import Link from "next/link";
import { DiscussButton } from "@/components/idea-tag";

export type IdeaCardData = {
  id: string;
  title: string;
  summary: string;
  question: string;
  counts: { pains: number; gaps: number; pricing: number; messaging: number };
  theme: string | null;
  themeLabel: string | null;
};

function countsLine(c: IdeaCardData["counts"]): string {
  const parts: [number, string, string][] = [
    [c.pains, "complaint", "complaints"],
    [c.gaps, "gap", "gaps"],
    [c.pricing, "pricing table", "pricing tables"],
    [c.messaging, "messaging issue", "messaging issues"],
  ];
  const shown = parts.filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  return shown.length ? shown.join(" · ") : "Backed by sources only";
}

export function IdeaCard({ card }: { card: IdeaCardData }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-rule bg-sheet p-4 transition-colors duration-150 hover:border-rule-strong">
      <Link href={`/advisor/${card.id}`} className="text-[14px] leading-snug font-semibold tracking-tight after:absolute after:inset-0">
        {card.title}
      </Link>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-text-2">{card.summary}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12px] text-text-2 tnum">{countsLine(card.counts)}</span>
        <span className="relative z-10">
          <DiscussButton question={card.question} />
        </span>
      </div>
    </article>
  );
}
