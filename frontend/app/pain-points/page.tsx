import { BarStrip } from "@/components/bars";
import { Cites } from "@/components/cite";
import { Section } from "@/components/section";
import { TitleBlock } from "@/components/title-block";
import { bundle, THEME_LABEL } from "@/lib/data";
import type { PainPoint } from "@/lib/types";

export default function PainPoints() {
  const { painPoints, trends, reviewSnippets } = bundle;

  const byTheme = painPoints.reduce<Record<string, PainPoint[]>>((acc, p) => {
    (acc[p.theme] ??= []).push(p);
    return acc;
  }, {});
  const themes = Object.entries(byTheme).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-04"
        title="Pain Points & Market"
        purpose="What contractors complain about in competitors' products, and where the market is heading."
        stat={{ label: "Pain points", value: String(painPoints.length) }}
      />

      <Section title="Where the complaints cluster" note="Mentions per theme across CompanyCam, JobNimbus and Buildertrend reviews.">
        <BarStrip
          rows={themes.map(([t, ps]) => ({
            label: THEME_LABEL[t as keyof typeof THEME_LABEL],
            segments: [{ value: ps.length, className: "bg-blue", label: "mentions" }],
          }))}
          max={themes[0][1].length}
        />
      </Section>

      <Section title="Pain points by theme" note="Each one is quoted or summarized from a review source. Hover a number for the source.">
        <div className="space-y-6">
          {themes.map(([theme, ps]) => (
            <div key={theme}>
              <h3 className="mb-1 text-[14px] font-semibold">
                {THEME_LABEL[theme as keyof typeof THEME_LABEL]}{" "}
                <span className="font-mono text-[12px] font-normal text-text-2 tnum">({ps.length})</span>
              </h3>
              <ul className="divide-y divide-rule border-t border-rule">
                {ps.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 py-2.5">
                    <span className="min-w-0 flex-1 basis-80 text-[14px]">{p.description}</span>
                    <span className="text-[13px] text-text-2">{p.companies.length ? p.companies.join(", ") : "Industry-wide"}</span>
                    <Cites citations={[p.citation]} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Market trends">
          <ul className="divide-y divide-rule">
            {trends.map((t, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[14px]">{t.description}</span>
                <Cites citations={[t.citation]} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Review snippets" note="Excerpts from review sites, as found.">
          <ul className="divide-y divide-rule">
            {reviewSnippets.map((r, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[14px] text-text-2">{r.note ?? r.ref}</span>
                <Cites citations={[r]} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
