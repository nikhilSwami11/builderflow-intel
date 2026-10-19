import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Cites } from "@/components/cite";
import { CategoryChip } from "@/components/category-chip";
import { Section } from "@/components/section";
import { StateChip } from "@/components/state-chip";
import { bundle, THEME_LABEL, TIER_LABEL } from "@/lib/data";
import type { GapRow } from "@/lib/types";

function GapList({ rows }: { rows: GapRow[] }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map((g) => (
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
  );
}

export function generateStaticParams() {
  return bundle.recommendations.map((r) => ({ id: r.id }));
}

export default async function Recommendation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = bundle.recommendations.find((r) => r.id === id);
  if (!rec) notFound();

  const ids = (kind: string) => rec.evidence.filter((e) => e.kind === kind).map((e) => e.id);
  const gaps = bundle.gapMatrix.filter((g) => ids("gap").includes(g.id));
  const pains = bundle.painPoints.filter((p) => ids("pain").includes(p.id));
  const prices = bundle.pricing.filter((p) => ids("pricing").includes(p.id));
  const msgs = bundle.messaging.filter((m) => ids("messaging").includes(m.id));
  // The pipeline often attaches the whole matrix. Rank rows by keyword overlap with the
  // recommendation's own text (boosting rows that aren't fully covered); lead with the best few
  // and fold the rest into "Also considered".
  const text = `${rec.title} ${rec.detail}`.toLowerCase();
  const words = (f: string) => [...new Set(f.toLowerCase().match(/[a-z]{5,}/g) ?? [])];
  const score = (g: GapRow) => words(g.feature).filter((w) => text.includes(w.slice(0, 6))).length + (g.builderflowHas !== "yes" ? 2 : 0);
  const ranked = [...gaps].sort((x, y) => score(y) - score(x));
  const gapMain = ranked.filter((g) => score(g) >= 2).slice(0, 5);
  const gapShown = gapMain.length ? gapMain : ranked.slice(0, 3);
  const gapMore = ranked.filter((g) => !gapShown.includes(g));
  const notes = rec.evidence.filter((e) => e.kind === "note");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisor" className="inline-flex items-center gap-1.5 text-[13px] text-text-2 hover:text-accent">
        <ArrowLeft size={14} aria-hidden /> Growth Advisor
      </Link>

      <header className="border border-rule-strong bg-sheet px-5 py-5">
        <CategoryChip category={rec.category} />
        <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight text-balance">{rec.title}</h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed">{rec.detail}</p>
        <div className="mt-4 flex items-center gap-3 text-[13px] text-text-2">
          Sources <Cites citations={rec.citations} />
        </div>
      </header>

      <h2 className="text-[13px] font-medium text-text-2">
        Backed by <span className="tnum">{gaps.length + pains.length + prices.length + msgs.length + notes.length}</span> pieces of evidence
      </h2>

      {gaps.length > 0 && (
        <Section title={`Gap matrix rows (${gapMain.length || Math.min(3, gaps.length)} most relevant of ${gaps.length})`}>
          <GapList rows={gapShown} />
          {gapMore.length > 0 && (
            <details className="mt-4 border-t border-rule pt-3">
              <summary className="cursor-pointer text-[13px] font-medium text-accent">Also considered ({gapMore.length} more rows)</summary>
              <div className="mt-3">
                <GapList rows={gapMore} />
              </div>
            </details>
          )}
        </Section>
      )}

      {pains.length > 0 && (
        <Section title={`Pain points (${pains.length})`}>
          <ul className="divide-y divide-rule">
            {pains.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1 basis-72 text-[14px]">
                  <span className="mr-2 rounded bg-accent-wash px-1.5 py-0.5 text-[12px] font-medium text-accent">{THEME_LABEL[p.theme]}</span>
                  {p.description}
                </span>
                <span className="text-[13px] text-text-2">{p.companies.join(", ") || "Industry-wide"}</span>
                <Cites citations={[p.citation]} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {prices.length > 0 && (
        <Section title="Pricing" note="Hand-verified. Full tables are on the Pricing sheet.">
          <div className="grid gap-4 sm:grid-cols-2">
            {prices.map((co) => (
              <div key={co.id} className="border border-rule">
                <div className="flex items-center justify-between border-b border-rule px-3 py-2 text-[14px] font-semibold">
                  {co.name} <Cites citations={[co.citation]} />
                </div>
                <table className="w-full text-[13px]">
                  <tbody className="divide-y divide-rule">
                    {co.plans.map((p) => (
                      <tr key={p.label}>
                        <td className="px-3 py-1.5 font-medium">{p.label}</td>
                        <td className="px-3 py-1.5 tnum">{p.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Section>
      )}

      {msgs.length > 0 && (
        <Section title={`Messaging inconsistencies (${msgs.length})`}>
          <ul className="divide-y divide-rule">
            {msgs.map((m) => (
              <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-semibold">{m.topic}</h3>
                  <Cites citations={m.citations} />
                </div>
                <p className="mt-1 text-[13px] text-text-2">
                  <span className="font-medium text-text">Website: </span>
                  {m.websiteSays ?? "not found in our data"}
                </p>
                <p className="mt-1 text-[13px] text-text-2">
                  <span className="font-medium text-text">Portal: </span>
                  {m.portalSays ?? "not found in our data"}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {notes.length > 0 && (
        <Section title="Other evidence">
          <ul className="list-disc space-y-1 pl-5 text-[14px]">
            {notes.map((n, i) => (
              <li key={i}>{n.label}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
