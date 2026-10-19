import { Cites } from "@/components/cite";
import { PageTitle } from "@/components/page-title";
import { Section } from "@/components/section";
import { bundle } from "@/lib/data";
import type { PricingCompany } from "@/lib/types";

// How each company charges for users, from the plan and notes text in competitor_pricing.yaml.
const MODEL: Record<string, string> = {
  builderflow: "User-limit tiers",
  companycam: "Bundled seats, extra users billed",
  jobnimbus: "Per seat",
  buildertrend: "Flat, unlimited users",
  roofr: "Flat, unlimited users",
  jobtread: "Per internal user",
};

const AXIS_MAX = 1400;
const TICKS = [0, 500, 1000];
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function RangeRow({ co }: { co: PricingCompany }) {
  const r = co.priceRange;
  return (
    <li className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-[13px] sm:grid-cols-[8rem_1fr_9rem]">
      <span className="truncate font-medium">{co.name}</span>
      <span className="relative h-6">
        {TICKS.map((t) => (
          <span key={t} aria-hidden className="absolute top-0 bottom-0 border-l border-rule" style={{ left: `${(t / AXIS_MAX) * 100}%` }} />
        ))}
        {r ? (
          <span
            className="absolute top-1.5 h-3 rounded-full bg-ink"
            style={{ left: `${(r.min / AXIS_MAX) * 100}%`, width: `max(${((r.max - r.min) / AXIS_MAX) * 100}%, 10px)` }}
            role="img"
            aria-label={`${co.name}: ${usd(r.min)} to ${usd(r.max)} per month`}
          />
        ) : (
          <span className="absolute inset-y-1 left-0 flex items-center rounded border border-dashed border-rule-strong px-2 text-[12px] text-text-2">No published rate</span>
        )}
      </span>
      <span className="col-span-2 -mt-1 text-text-2 tnum sm:col-span-1 sm:mt-0 sm:text-right">
        {r ? `${usd(r.min)} – ${usd(r.max)}${r.plus ? "+" : ""}` : "Contact sales"}
      </span>
    </li>
  );
}

export default function Pricing() {
  const { pricing, messaging } = bundle;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Pricing" />

      <Section title="Monthly price range" note="Cheapest to dearest public plan, hand-verified. Per-seat add-ons not included.">
        <div className="mt-2">
          <div className="grid grid-cols-[6.5rem_1fr] gap-3 pb-1 text-[11px] text-text-2 sm:grid-cols-[8rem_1fr_9rem]">
            <span />
            <span className="relative h-4">
              {TICKS.map((t) => (
                <span key={t} className="absolute tnum" style={{ left: `${(t / AXIS_MAX) * 100}%` }}>
                  {usd(t)}
                </span>
              ))}
            </span>
          </div>
          <ul className="space-y-1.5">
            {pricing.map((co) => (
              <RangeRow key={co.id} co={co} />
            ))}
          </ul>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pricing.map((co) => (
          <article key={co.id} className="flex flex-col rounded-xl border border-rule bg-sheet p-5">
            <h3 className="text-[16px] font-semibold tracking-tight">{co.name}</h3>
            <p className="mt-0.5 text-[13px] text-text-2">{MODEL[co.key]}</p>
            {co.bestFeature ? (
              <p className="mt-3 line-clamp-3 text-[13px] leading-snug">
                <span className="font-medium">Best at: </span>
                {co.bestFeature}
              </p>
            ) : (
              co.notes && <p className="mt-3 line-clamp-3 text-[13px] leading-snug">{co.notes}</p>
            )}
            <details className="mt-auto pt-4">
              <summary className="cursor-pointer text-[13px] font-medium text-text-2 hover:text-text">Plans and notes</summary>
              <table className="mt-3 w-full text-left text-[13px]">
                <tbody className="divide-y divide-rule border-y border-rule">
                  {co.plans.map((p) => (
                    <tr key={p.label} className="align-top">
                      <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{p.label}</td>
                      <td className="py-1.5 tnum">
                        {p.price}
                        {p.users && <span className="block text-[12px] text-text-2">{p.users}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {co.notes && <p className="mt-3 text-[12px] leading-snug text-text-2">{co.notes}</p>}
              <div className="mt-3">
                <Cites citations={[co.citation]} />
              </div>
            </details>
          </article>
        ))}
      </div>

      <Section title="Where Builderflow's own messaging disagrees" note="Website, portal and guide. Flagged, not resolved.">
        <ul className="divide-y divide-rule">
          {messaging.map((m) => (
            <li key={m.id}>
              <details className="group py-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-medium">
                  {m.topic}
                  <span className="text-[12px] font-normal text-text-2 group-open:hidden">Show</span>
                </summary>
                <dl className="mt-3 grid gap-x-6 gap-y-3 text-[13px] md:grid-cols-3">
                  {(
                    [
                      ["Website says", m.websiteSays],
                      ["Portal says", m.portalSays],
                      ["Guide says", m.guideSays],
                    ] as const
                  ).map(([label, text]) => (
                    <div key={label}>
                      <dt className="text-text-2">{label}</dt>
                      <dd className="mt-0.5">{text ?? <span className="text-text-2">Not found in our data</span>}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <Cites citations={m.citations} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
