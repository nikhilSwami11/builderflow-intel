import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { CategoryChip } from "@/components/category-chip";
import { Cites } from "@/components/cite";
import { DiscussButton } from "@/components/idea-tag";
import { Section } from "@/components/section";
import { StateChip } from "@/components/state-chip";
import { bundle, THEME_LABEL, TIER_LABEL } from "@/lib/data";
import { discussQuestion, evidenceFor } from "@/lib/evidence";
import type { GapRow, Messaging, PainPoint } from "@/lib/types";

function GapList({ rows }: { rows: GapRow[] }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map((g) => (
        <li
          key={g.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0"
        >
          <StateChip has={g.builderflowHas} />
          <span className="min-w-0 flex-1 basis-64 text-[14px] font-medium">
            {g.feature}
          </span>
          <span className="text-[13px] text-text-2">
            {TIER_LABEL[g.tier]} · competitors with it:{" "}
            {g.competitors.join(", ") || "none"}
          </span>
          <Cites citations={g.citations} />
        </li>
      ))}
    </ul>
  );
}

function PainList({ rows }: { rows: PainPoint[] }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-start gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0"
        >
          <span className="min-w-0 flex-1 basis-72 text-[14px]">
            <span className="mr-2 rounded bg-accent-wash px-1.5 py-0.5 text-[12px] font-medium">
              {THEME_LABEL[p.theme]}
            </span>
            {p.description}
          </span>
          <span className="text-[13px] text-text-2">
            {p.companies.join(", ") || "Industry-wide"}
          </span>
          <Cites citations={[p.citation]} />
        </li>
      ))}
    </ul>
  );
}

function MessagingList({ rows }: { rows: Messaging[] }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map((m) => (
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
  );
}

function MoreRows({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <details className="mt-4 border-t border-rule pt-3">
      <summary className="cursor-pointer text-[13px] font-medium text-text-2 hover:text-text">
        Also attached by the pipeline ({count} more {label})
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function generateStaticParams() {
  return bundle.recommendations.map((r) => ({ id: r.id }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  // Reading `params` has to sit inside a Suspense boundary (Next 16 instant navigation).
  return (
    <Suspense
      fallback={
        <div className="mx-auto h-64 max-w-4xl animate-pulse rounded-xl border border-rule bg-sheet" />
      }
    >
      <Recommendation params={params} />
    </Suspense>
  );
}

async function Recommendation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = bundle.recommendations.find((r) => r.id === id);
  if (!rec) notFound();

  const ev = evidenceFor(rec);
  // When nothing matched closely, still show a few of what was attached rather than an empty page.
  const gaps = ev.gaps.length ? ev.gaps : ev.more.gaps.slice(0, 3);
  const gapsRest = ev.gaps.length ? ev.more.gaps : ev.more.gaps.slice(3);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/advisor" label="Back" />

      <header className="rounded-xl border border-rule bg-sheet px-5 py-5">
        <CategoryChip category={rec.category} />
        <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight text-balance">
          {rec.title}
        </h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed">
          {rec.detail}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Cites citations={rec.citations} />
          <DiscussButton question={discussQuestion(rec)} />
        </div>
      </header>

      {gaps.length > 0 && (
        <Section title={`Gaps it addresses (${gaps.length})`}>
          <GapList rows={gaps} />
          <MoreRows count={gapsRest.length} label="gap rows">
            <GapList rows={gapsRest} />
          </MoreRows>
        </Section>
      )}

      {ev.pains.length > 0 && (
        <Section title={`Complaints behind it (${ev.pains.length})`}>
          <PainList rows={ev.pains} />
          <MoreRows count={ev.more.pains.length} label="complaints">
            <PainList rows={ev.more.pains} />
          </MoreRows>
        </Section>
      )}

      {ev.pricing.length > 0 && (
        <Section title="Pricing it relies on">
          <div className="grid gap-4 sm:grid-cols-2">
            {ev.pricing.map((co) => (
              <div key={co.id} className="rounded-lg border border-rule">
                <div className="flex items-center justify-between border-b border-rule px-3 py-2 text-[14px] font-semibold">
                  {co.name} <Cites citations={[co.citation]} label={false} />
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

      {ev.messaging.length > 0 && (
        <Section title={`Messaging issues it fixes (${ev.messaging.length})`}>
          <MessagingList rows={ev.messaging} />
          <MoreRows count={ev.more.messaging.length} label="messaging issues">
            <MessagingList rows={ev.more.messaging} />
          </MoreRows>
        </Section>
      )}
    </div>
  );
}
