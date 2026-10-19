import { Cites } from "@/components/cite";
import { Section } from "@/components/section";
import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Pricing() {
  const { pricing, messaging } = bundle;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-03"
        title="Pricing"
        purpose="Public plans, hand-verified from each company's pricing page rather than extracted by AI."
        stat={{ label: "Companies", value: String(pricing.length) }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {pricing.map((co) => (
          <section key={co.id} className="flex flex-col border border-rule bg-sheet">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
              <h2 className="text-[16px] font-semibold tracking-tight">
                {co.name}
                {co.key === "builderflow" && <span className="ml-2 rounded bg-blue-wash px-1.5 py-0.5 text-[11px] font-medium text-blue">You</span>}
              </h2>
              <Cites citations={[co.citation]} />
            </div>
            <table className="w-full text-left text-[13px]">
              <thead className="text-[12px] text-text-2">
                <tr className="border-b border-rule">
                  <th className="px-5 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-5 py-2 font-medium">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {co.plans.map((p) => (
                  <tr key={p.label} className="align-top">
                    <td className="px-5 py-2.5 font-medium whitespace-nowrap">{p.label}</td>
                    <td className="px-3 py-2.5 tnum">{p.price}</td>
                    <td className="px-5 py-2.5 text-text-2">{p.users ?? "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-auto space-y-2 border-t border-rule px-5 py-3 text-[13px] text-text-2">
              {co.bestFeature && (
                <p>
                  <span className="font-medium text-text">Best at: </span>
                  {co.bestFeature}
                </p>
              )}
              {co.notes && <p>{co.notes}</p>}
            </div>
          </section>
        ))}
      </div>

      <Section title="Messaging inconsistencies" note="Where Builderflow's website, portal and guide disagree. Flagged, not resolved.">
        <ul className="divide-y divide-rule">
          {messaging.map((m) => (
            <li key={m.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold">{m.topic}</h3>
                <Cites citations={m.citations} />
              </div>
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] md:grid-cols-3">
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
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
