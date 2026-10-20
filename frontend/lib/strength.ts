import { bundle } from "./data";
import type { Evidence } from "./evidence";
import type { Recommendation } from "./types";

export type Strength = "strong" | "promising" | "early";

export const STRENGTH_LABEL: Record<Strength, string> = {
  strong: "Strong",
  promising: "Promising",
  early: "Early",
};

/** What each level means, shown on hover. This grades how much of our data backs an idea, so it
 *  is a measure of evidence, not a forecast of business impact. */
export const STRENGTH_NOTE: Record<Strength, string> = {
  strong:
    "Lots of evidence points here: complaints, competitor coverage and news agree.",
  promising: "A fair amount of evidence backs this. Worth a closer look.",
  early: "Thin evidence so far. Treat it as a hypothesis to test.",
};

const words = (t: string) => [
  ...new Set(t.toLowerCase().match(/[a-z]{5,}/g) ?? []),
];

export type StrengthInfo = {
  level: Strength;
  score: number;
  /** distinct competitors that ship what the idea covers, from the gaps it links to */
  competitors: string[];
  news: number;
};

/** Evidence strength: relevant complaints and gaps count most, then competitors that already
 *  ship the capability, then recent news touching the idea, then pricing/messaging rows. */
export function strengthFor(rec: Recommendation, ev: Evidence): StrengthInfo {
  const hay = `${rec.title} ${rec.detail}`.toLowerCase();
  const competitors = [
    ...new Set(
      ev.gaps
        .filter((g) => g.builderflowHas !== "yes")
        .flatMap((g) => g.competitors),
    ),
  ];
  const news = bundle.news.filter(
    (n) =>
      words(`${n.title} ${n.summary}`).filter((w) =>
        hay.includes(w.slice(0, 6)),
      ).length >= 3,
  ).length;
  const score =
    ev.pains.length * 2 +
    ev.gaps.length * 2 +
    competitors.length * 1.5 +
    Math.min(news, 3) +
    ev.pricing.length +
    ev.messaging.length;
  const level: Strength =
    score >= 12 ? "strong" : score >= 7 ? "promising" : "early";
  return { level, score, competitors, news };
}
