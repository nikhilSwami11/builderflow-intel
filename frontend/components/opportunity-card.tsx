import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Opportunity } from "@/lib/opportunities";

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <article className="flex flex-col rounded-xl border border-rule bg-sheet p-5">
      <span className="self-start rounded border border-rule-strong px-1.5 py-0.5 text-[12px] font-medium text-text-2">Idea</span>
      <h3 className="mt-3 text-[17px] leading-snug font-semibold tracking-tight">{opp.name}</h3>
      <p className="mt-1 text-[13px] text-text-2">
        {opp.gap.competitors.length ? `${opp.gap.competitors.join(", ")} ship it` : "No competitor ships it"}
      </p>
      {opp.rec && <p className="mt-4 line-clamp-3 text-[14px] leading-snug">{opp.rec.title}</p>}
      <div className="mt-auto flex items-center gap-4 pt-5">
        <Link
          href={`/chat?q=${encodeURIComponent(opp.question)}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#333]"
        >
          Discuss <ArrowUpRight size={14} aria-hidden />
        </Link>
        {opp.rec && (
          <Link href={`/advisor/${opp.rec.id}`} className="text-[13px] text-text-2 underline-offset-4 hover:text-text hover:underline">
            Evidence
          </Link>
        )}
      </div>
    </article>
  );
}
