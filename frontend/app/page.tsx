import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BarStrip } from "@/components/bars";
import { OpportunityGrid } from "@/components/opportunity-grid";
import { PageTitle } from "@/components/page-title";
import { Section } from "@/components/section";
import { HAS_TONE } from "@/components/state-chip";
import { bundle, HAS_LABEL, THEME_LABEL, TIER_LABEL, TIER_ORDER } from "@/lib/data";
import { getOpportunities, toCard } from "@/lib/opportunities";
import type { Has } from "@/lib/types";

const HAS_ORDER: Has[] = ["yes", "partial", "claimed", "no", "unverified"];
const COMPANIES = ["CompanyCam", "JobNimbus", "Buildertrend"];

export default function Overview() {
  const { gapMatrix, painPoints, recommendations } = bundle;
  const opportunities = getOpportunities();

  const tierRows = TIER_ORDER.filter((t) => gapMatrix.some((g) => g.tier === t)).map((tier) => {
    const rows = gapMatrix.filter((g) => g.tier === tier);
    return {
      label: TIER_LABEL[tier],
      segments: HAS_ORDER.map((has) => ({
        value: rows.filter((g) => g.builderflowHas === has).length,
        className: HAS_TONE[has].bar,
        label: HAS_LABEL[has].toLowerCase(),
      })),
    };
  });
  const tierMax = Math.max(...TIER_ORDER.map((t) => gapMatrix.filter((g) => g.tier === t).length));

  const shipped = [
    { label: "Builderflow", n: gapMatrix.filter((g) => g.builderflowHas === "yes").length, dark: true },
    ...COMPANIES.map((c) => ({ label: c, n: gapMatrix.filter((g) => g.competitors.includes(c)).length, dark: false })),
  ];

  const themeCounts = Object.entries(
    painPoints.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.theme]: (acc[p.theme] ?? 0) + 1 }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const quickWins = recommendations.filter((r) => r.category === "quick_win").slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Overview" />

      <section aria-labelledby="opps">
        <h2 id="opps" className="mb-3 text-[15px] font-semibold tracking-tight">
          Opportunities
        </h2>
        <OpportunityGrid items={opportunities.map(toCard)} initial={3} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Feature coverage">
          <BarStrip rows={tierRows} max={tierMax} />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2">
            {HAS_ORDER.map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${HAS_TONE[h].bar}`} />
                {HAS_LABEL[h]}
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-rule pt-4">
            <BarStrip
              rows={shipped.map((s) => ({ label: s.label, segments: [{ value: s.n, className: s.dark ? "bg-ink" : "bg-rule-strong", label: "features" }] }))}
              max={gapMatrix.length}
            />
          </div>
        </Section>

        <Section title="Top complaints">
          <BarStrip
            rows={themeCounts.map(([t, n]) => ({
              label: THEME_LABEL[t as keyof typeof THEME_LABEL],
              segments: [{ value: n, className: "bg-accent", label: "mentions" }],
            }))}
            max={themeCounts[0][1]}
          />
          <Link href="/pain-points" className="mt-4 inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
            All pain points <ArrowRight size={14} aria-hidden />
          </Link>
        </Section>
      </div>

      <section aria-labelledby="wins">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="wins" className="text-[15px] font-semibold tracking-tight">
            Quick wins
          </h2>
          <Link href="/advisor" className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
            All {recommendations.length} recommendations <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {quickWins.map((r) => (
            <li key={r.id}>
              <Link href={`/advisor/${r.id}`} className="block h-full rounded-xl border border-rule bg-sheet p-5 text-[14px] leading-snug font-medium transition-colors duration-150 hover:border-rule-strong">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
