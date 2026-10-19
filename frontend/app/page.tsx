import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BarStrip } from "@/components/bars";
import { Cites } from "@/components/cite";
import { Section } from "@/components/section";
import { HAS_TONE, StateChip } from "@/components/state-chip";
import { TitleBlock } from "@/components/title-block";
import { bundle, HAS_LABEL, THEME_LABEL, TIER_LABEL, TIER_ORDER } from "@/lib/data";
import type { Has } from "@/lib/types";

const HAS_ORDER: Has[] = ["yes", "partial", "no", "unverified"];

export default function Overview() {
  const { gapMatrix, painPoints, recommendations } = bundle;

  const tierRows = TIER_ORDER.map((tier) => {
    const rows = gapMatrix.filter((g) => g.tier === tier);
    return {
      label: `${TIER_LABEL[tier]} (${rows.length})`,
      segments: HAS_ORDER.map((has) => ({
        value: rows.filter((g) => g.builderflowHas === has).length,
        className: HAS_TONE[has].bar,
        label: HAS_LABEL[has].toLowerCase(),
      })),
    };
  });
  const tierMax = Math.max(...TIER_ORDER.map((t) => gapMatrix.filter((g) => g.tier === t).length));

  const themeCounts = Object.entries(
    painPoints.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.theme]: (acc[p.theme] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const themeRows = themeCounts.map(([theme, n]) => ({
    label: THEME_LABEL[theme as keyof typeof THEME_LABEL],
    segments: [{ value: n, className: "bg-blue", label: "mentions" }],
  }));

  const COMPANIES = ["CompanyCam", "JobNimbus", "Buildertrend"];
  const shipped = [
    {
      label: `Builderflow (+${gapMatrix.filter((g) => g.builderflowHas === "partial").length} partial)`,
      n: gapMatrix.filter((g) => g.builderflowHas === "yes").length,
    },
    ...COMPANIES.map((c) => ({ label: c, n: gapMatrix.filter((g) => g.competitors.includes(c)).length })),
  ];
  const exposed = gapMatrix.filter((g) => g.builderflowHas !== "yes" && g.tier !== "emerging");
  const tableStakes = gapMatrix.filter((g) => g.tier === "table_stakes");
  const covered = tableStakes.filter((g) => g.builderflowHas === "yes").length;
  const quickWins = recommendations.filter((r) => r.category === "quick_win");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-01"
        title="Overview"
        purpose="Where Builderflow stands against CompanyCam, JobNimbus and Buildertrend, and what to do first."
        stat={{ label: "Recommendations", value: String(recommendations.length) }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Feature coverage by tier"
          note={`Builderflow has ${covered} of ${tableStakes.length} table-stakes features; the rest are partial. Tier comes from how many competitors ship the feature.`}
        >
          <BarStrip rows={tierRows} max={tierMax} />
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2">
            {HAS_ORDER.map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${HAS_TONE[h].bar}`} />
                {HAS_LABEL[h]}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 mb-3 text-[13px] font-medium">Features each company ships, of {gapMatrix.length}</h3>
          <BarStrip
            rows={shipped.map((s) => ({ label: s.label, segments: [{ value: s.n, className: s.label.startsWith("Builderflow") ? "bg-ink" : "bg-blue", label: "features" }] }))}
            max={gapMatrix.length}
          />
        </Section>

        <Section title="What contractors complain about" note={`${painPoints.length} pain points from reviews and forums, grouped by theme.`}>
          <BarStrip rows={themeRows} max={themeCounts[0][1]} />
        </Section>
      </div>

      <Section title="Where Builderflow is exposed" note="Table-stakes or differentiating features that are partial, missing or unverified. Hover a number for its source.">
        {exposed.length === 0 ? (
          <p className="text-[14px] text-text-2">None found in our data.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {exposed.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                <StateChip has={g.builderflowHas} />
                <span className="min-w-0 flex-1 basis-64 text-[14px] font-medium">{g.feature}</span>
                <span className="text-[13px] text-text-2">
                  {TIER_LABEL[g.tier]} · competitors with it: {g.competitors.join(", ") || "none"}
                </span>
                <Cites citations={g.citations} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Start here" note="Quick wins from the Growth Advisor. Each one rests on the signals above.">
        <ul className="divide-y divide-rule">
          {quickWins.map((r) => (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <Link href="/advisor" className="group flex items-start justify-between gap-4">
                <span>
                  <span className="block text-[14px] font-medium group-hover:text-blue">{r.title}</span>
                  <span className="mt-0.5 line-clamp-2 block max-w-[80ch] text-[13px] text-text-2">{r.detail}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="mt-1 shrink-0 text-text-2 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-blue" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
