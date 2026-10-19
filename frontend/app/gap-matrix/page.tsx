import { Cites } from "@/components/cite";
import { HAS_TONE, StateChip } from "@/components/state-chip";
import { TitleBlock } from "@/components/title-block";
import { bundle, HAS_LABEL, TIER_LABEL, TIER_ORDER } from "@/lib/data";
import type { Has } from "@/lib/types";

const RISK: Record<Has, number> = { no: 0, partial: 1, unverified: 2, yes: 3 };
const HAS_ORDER: Has[] = ["yes", "partial", "no", "unverified"];
const COMPANIES = ["CompanyCam", "JobNimbus", "Buildertrend"];

export default function GapMatrix() {
  const rows = bundle.gapMatrix;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-02"
        title="Gap Matrix"
        purpose="Features competitors ship, and whether Builderflow has them. Riskiest rows first within each tier."
        stat={{ label: "Features", value: String(rows.length) }}
      />

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2" aria-label="Legend">
        {HAS_ORDER.map((h) => (
          <li key={h} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${HAS_TONE[h].bar}`} />
            {HAS_LABEL[h]}
          </li>
        ))}
        <li>Dot = competitor ships it</li>
      </ul>

      {TIER_ORDER.map((tier) => {
        const tierRows = rows.filter((g) => g.tier === tier).sort((a, b) => RISK[a.builderflowHas] - RISK[b.builderflowHas]);
        if (!tierRows.length) return null;
        return (
          <section key={tier} className="border border-rule bg-sheet">
            <h2 className="border-b border-rule px-5 py-3 text-[16px] font-semibold tracking-tight">
              {TIER_LABEL[tier]} <span className="font-mono text-[13px] font-normal text-text-2 tnum">({tierRows.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="text-[12px] text-text-2">
                  <tr className="border-b border-rule">
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
                <tbody className="divide-y divide-rule">
                  {tierRows.map((g) => (
                    <tr key={g.id} className="align-top">
                      <td className="max-w-[28rem] px-5 py-3 font-medium">{g.feature}</td>
                      <td className="px-3 py-3">
                        <StateChip has={g.builderflowHas} />
                      </td>
                      {COMPANIES.map((c) => {
                        const has = g.competitors.includes(c);
                        return (
                          <td key={c} className="px-3 py-3 text-center">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${has ? "bg-ink" : "border border-rule-strong"}`} role="img" aria-label={`${c}: ${has ? "has it" : "not found in our data"}`} />
                          </td>
                        );
                      })}
                      <td className="px-5 py-3">
                        <Cites citations={g.citations} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
