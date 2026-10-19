import { bundle } from "./data";
import type { GapRow, Messaging, PainPoint, PricingCompany, Recommendation } from "./types";

const words = (t: string) => [...new Set(t.toLowerCase().match(/[a-z]{5,}/g) ?? [])];
const GENERIC = new Set(["availability", "management"]);

function overlap(text: string, hay: string, ignore?: Set<string>): number {
  return words(text).filter((w) => !ignore?.has(w) && hay.includes(w.slice(0, 6))).length;
}

export type Evidence = {
  /** rows that clearly relate to the idea's own text (or, for gaps, that aren't fully covered) */
  gaps: GapRow[];
  pains: PainPoint[];
  pricing: PricingCompany[];
  messaging: Messaging[];
  /** the rest of what the pipeline attached; it often attaches whole tables */
  more: { gaps: GapRow[]; pains: PainPoint[]; messaging: Messaging[] };
  /** how much relevant evidence backs the idea. A measure of support, not of business impact. */
  support: number;
};

/** The pipeline often cites the whole matrix. Keep the rows that actually relate to the idea
 *  (keyword overlap with its own text) up front and fold the rest away. */
export function evidenceFor(rec: Recommendation): Evidence {
  const hay = `${rec.title} ${rec.detail}`.toLowerCase();
  const ids = (kind: string) => new Set(rec.evidence.filter((e) => e.kind === kind).map((e) => e.id));

  const gapScore = (g: GapRow) => overlap(g.feature, hay) + (g.builderflowHas !== "yes" ? 2 : 0);
  const linkedGaps = bundle.gapMatrix.filter((g) => ids("gap").has(g.id)).sort((a, b) => gapScore(b) - gapScore(a));
  const gaps = linkedGaps.filter((g) => gapScore(g) >= 2).slice(0, 5);

  const linkedPains = bundle.painPoints.filter((p) => ids("pain").has(p.id));
  const pains = linkedPains.filter((p) => overlap(p.description, hay) >= 1);

  const linkedMsgs = bundle.messaging.filter((m) => ids("messaging").has(m.id));
  const messaging = linkedMsgs.filter((m) => overlap(m.topic, hay, GENERIC) >= 1);

  const linkedPrices = bundle.pricing.filter((p) => ids("pricing").has(p.id));
  const pricing = rec.category === "pricing" ? linkedPrices : linkedPrices.filter((p) => hay.includes(p.name.toLowerCase()));

  return {
    gaps,
    pains,
    pricing,
    messaging,
    more: {
      gaps: linkedGaps.filter((g) => !gaps.includes(g)),
      pains: linkedPains.filter((p) => !pains.includes(p)),
      messaging: linkedMsgs.filter((m) => !messaging.includes(m)),
    },
    support: gaps.length + pains.length + pricing.length + messaging.length,
  };
}

/** The complaint theme that most of an idea's relevant pain points share, if any. */
export function themeFor(ev: Evidence): PainPoint["theme"] | null {
  const counts = new Map<PainPoint["theme"], number>();
  for (const p of ev.pains) counts.set(p.theme, (counts.get(p.theme) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function discussQuestion(rec: Recommendation): string {
  return `Our idea: "${rec.title}". ${rec.detail} How would we start, what are the risks, and is this the right priority?`;
}
