import { Cites } from "@/components/cite";
import { OpportunityGrid } from "@/components/opportunity-grid";
import { PageTitle } from "@/components/page-title";
import { HAS_TONE, StateChip } from "@/components/state-chip";
import { bundle, HAS_LABEL, TIER_LABEL, TIER_ORDER } from "@/lib/data";
import { getOpportunities, shortName, toCard } from "@/lib/opportunities";
import type { Has } from "@/lib/types";

const RISK: Record<Has, number> = { no: 0, partial: 1, unverified: 2, yes: 3 };
const HAS_ORDER: Has[] = ["yes", "partial", "no", "unverified"];
const COMPANIES = ["CompanyCam", "JobNimbus", "Buildertrend"];

export default function GapMatrix() {
  const rows = bundle.gapMatrix;
  const opportunities = getOpportunities();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Gap Matrix" />

      <section aria-labelledby="opps">
        <h2 id="opps" className="mb-3 text-[15px] font-semibold tracking-tight">
          Opportunities
        </h2>
        <OpportunityGrid items={opportunities.map(toCard)} initial={6} />
      </section>

      <section aria-labelledby="all" className="rounded-xl border border-rule bg-sheet">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <h2 id="all" className="text-[15px] font-semibold tracking-tight">
            All {rows.length} features
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2" aria-label="Legend">
            {HAS_ORDER.filter((h) => rows.some((g) => g.builderflowHas === h)).map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${HAS_TONE[h].bar}`} />
                {HAS_LABEL[h]}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="text-[12px] text-text-2">
              <tr className="border-y border-rule">
                <th className="px-5 py-2 font-medium">Feature</th>
                <th className="px-3 py-2 font-medium">Builderflow</th>
                {COMPANIES.map((c) => (
                  <th key={c} className="px-3 py-2 text-center font-medium">
                    {c}
                  </th>
                ))}
                <th className="px-5 py-2 font-medium">Sources</th>
              </tr>
            </thead>
            {TIER_ORDER.map((tier) => {
              const tierRows = rows.filter((g) => g.tier === tier).sort((a, b) => RISK[a.builderflowHas] - RISK[b.builderflowHas]);
              if (!tierRows.length) return null;
              return (
                <tbody key={tier} className="divide-y divide-rule">
                  <tr className="bg-paper">
                    <th colSpan={6} className="px-5 py-1.5 text-left text-[12px] font-medium text-text-2">
                      {TIER_LABEL[tier]} ({tierRows.length})
                    </th>
                  </tr>
                  {tierRows.map((g) => (
                    <tr key={g.id}>
                      <td className="px-5 py-2.5 font-medium" title={g.feature}>
                        {shortName(g.feature)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StateChip has={g.builderflowHas} />
                      </td>
                      {COMPANIES.map((c) => {
                        const has = g.competitors.includes(c);
                        return (
                          <td key={c} className="px-3 py-2.5 text-center">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${has ? "bg-ink" : "border border-rule-strong"}`} role="img" aria-label={`${c}: ${has ? "has it" : "not found in our data"}`} />
                          </td>
                        );
                      })}
                      <td className="px-5 py-2.5 whitespace-nowrap [&>span]:flex-nowrap">
                        <Cites citations={g.citations} label={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
    </div>
  );
}
