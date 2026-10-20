import { bundle } from "./data";
import type { GapRow, Recommendation } from "./types";

export type Opportunity = {
  gap: GapRow;
  name: string;
  rec: Recommendation | null;
  question: string;
};

/** "Work orders / FSM (work order creation from…)" -> "Work orders / FSM";
 *  a long name with commas is cut at the first comma. */
export function shortName(feature: string): string {
  const base = feature.split(" (")[0].trim();
  return base.length > 36 && base.includes(",") ? base.split(",")[0].trim() : base;
}

const words = (f: string) => [...new Set(f.toLowerCase().match(/[a-z]{5,}/g) ?? [])];

function score(gap: GapRow, rec: Recommendation): number {
  const text = `${rec.title} ${rec.detail}`.toLowerCase();
  const linked = rec.evidence.some((e) => e.kind === "gap" && e.id === gap.id) ? 3 : 0;
  return linked + words(gap.feature).filter((w) => text.includes(w.slice(0, 6))).length;
}

/** Every gap Builderflow doesn't fully cover is an opportunity. Each is paired with the
 *  growth recommendation that best matches it (no two opportunities share one). */
export function getOpportunities(): Opportunity[] {
  const gaps = bundle.gapMatrix
    .filter((g) => g.builderflowHas !== "yes")
    // real gaps (the guide says partial/absent) before features the guide does not cover; then
    // table-stakes first, then the features more competitors already ship
    .sort(
      (a, b) =>
        (a.builderflowHas === "unverified" ? 1 : 0) - (b.builderflowHas === "unverified" ? 1 : 0) ||
        (a.tier === "table_stakes" ? 0 : 1) - (b.tier === "table_stakes" ? 0 : 1) ||
        b.competitors.length - a.competitors.length,
    );
  const used = new Set<string>();

  return gaps.map((gap) => {
    const best = [...bundle.recommendations]
      .filter((r) => !used.has(r.id))
      .sort((a, b) => score(gap, b) - score(gap, a))[0];
    const rec = best && score(gap, best) >= 2 ? best : null;
    if (rec) used.add(rec.id);

    const name = shortName(gap.feature);
    const status =
      gap.builderflowHas === "partial"
        ? "only partial (the guide says it is coming soon or limited)"
        : gap.builderflowHas === "no"
          ? "not found in our data"
          : "not covered in Builderflow's user guide (the website or screenshots show it)";
    const who = gap.competitors.length ? `${gap.competitors.join(", ")} ship it` : "no competitor in our data ships it";
    return {
      gap,
      name,
      rec,
      question: `${name} is ${status} for Builderflow, and ${who}. What should we do first to turn this into an opportunity, and why?`,
    };
  });
}

/** The few fields a card needs, so a client component can take them as props. */
export type OpportunityCardData = {
  id: string;
  name: string;
  competitors: string[];
  recId: string | null;
  recTitle: string | null;
  question: string;
};

export const toCard = (o: Opportunity): OpportunityCardData => ({
  id: o.gap.id,
  name: o.name,
  competitors: o.gap.competitors,
  recId: o.rec?.id ?? null,
  recTitle: o.rec?.title ?? null,
  question: o.question,
});
