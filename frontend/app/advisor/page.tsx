import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BarStrip } from "@/components/bars";
import { CategoryChip } from "@/components/category-chip";
import { Section } from "@/components/section";
import { PageTitle } from "@/components/page-title";
import { bundle, CATEGORY_LABEL, CATEGORY_ORDER, THEME_LABEL } from "@/lib/data";

export default function Advisor() {
  const recs = bundle.recommendations;
  const risky = bundle.gapMatrix.filter((g) => g.builderflowHas !== "yes").length;
  const topThemes = Object.entries(
    bundle.painPoints.reduce<Record<string, number>>((a, p) => ({ ...a, [p.theme]: (a[p.theme] ?? 0) + 1 }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle title="Growth Advisor" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="What the advice rests on">
          <p className="text-[14px]">
            {risky} gap-matrix rows are not fully covered. The most-mentioned complaint themes are{" "}
            {topThemes.map(([t, n], i) => (
              <span key={t}>
                {i > 0 && (i === topThemes.length - 1 ? " and " : ", ")}
                <strong className="font-medium">{THEME_LABEL[t as keyof typeof THEME_LABEL].toLowerCase()}</strong> ({n})
              </span>
            ))}
            .
          </p>
        </Section>
        <Section title="Recommendations by type">
          <BarStrip
            rows={CATEGORY_ORDER.map((c) => ({
              label: CATEGORY_LABEL[c],
              segments: [{ value: recs.filter((r) => r.category === c).length, className: "bg-accent", label: "recommendations" }],
            }))}
            max={Math.max(...CATEGORY_ORDER.map((c) => recs.filter((r) => r.category === c).length))}
          />
        </Section>
      </div>

      {CATEGORY_ORDER.map((c) => {
        const group = recs.filter((r) => r.category === c);
        if (!group.length) return null;
        return (
          <Section key={c} title={`${CATEGORY_LABEL[c]} (${group.length})`}>
            <ul className="divide-y divide-rule">
              {group.map((r) => {
                const rows = r.evidence.filter((e) => e.kind !== "note").length;
                return (
                  <li key={r.id}>
                    <Link href={`/advisor/${r.id}`} className="group flex items-start justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium group-hover:text-accent">{r.title}</span>
                        <span className="mt-0.5 line-clamp-2 block max-w-[80ch] text-[13px] text-text-2">{r.detail}</span>
                        <span className="mt-1 block text-[12px] text-text-2 tnum">
                          {rows} linked evidence rows · {r.citations.length} sources
                        </span>
                      </span>
                      <ArrowRight size={16} aria-hidden className="mt-1 shrink-0 text-text-2 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
