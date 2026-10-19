import { bundle } from "./data";
import type { PainPoint, Recommendation, Trend } from "./types";

export type IdeaRef = { id: string; title: string };

const words = (t: string) => [...new Set(t.toLowerCase().match(/[a-z]{5,}/g) ?? [])];

function overlap(text: string, rec: Recommendation): number {
  const hay = `${rec.title} ${rec.detail}`.toLowerCase();
  return words(text).filter((w) => hay.includes(w.slice(0, 6))).length;
}

const ref = (r: Recommendation): IdeaRef => ({ id: r.id, title: r.title });

/** A pain point has an idea when the Growth Advisor cited it as evidence. The pipeline often
 *  cites many; show the one whose text matches the complaint best. */
export function ideaForPain(p: PainPoint): IdeaRef | null {
  const linked = bundle.recommendations.filter((r) => r.evidence.some((e) => e.kind === "pain" && e.id === p.id));
  if (!linked.length) return null;
  return ref([...linked].sort((a, b) => overlap(p.description, b) - overlap(p.description, a))[0]);
}

/** News has no evidence links in the pipeline output. An idea is attached only when it cites
 *  the same article, or its text clearly overlaps the trend (4+ shared keywords; looser matches proved wrong). */
export function ideaForTrend(t: Trend): IdeaRef | null {
  const shared = bundle.recommendations.find((r) => r.citations.some((c) => c.ref === t.citation.ref));
  if (shared) return ref(shared);
  const best = [...bundle.recommendations].sort((a, b) => overlap(t.description, b) - overlap(t.description, a))[0];
  return best && overlap(t.description, best) >= 4 ? ref(best) : null;
}

/** The question the Discuss button sends to the chat: the item itself, then its idea. */
export function painQuestion(p: PainPoint, idea: IdeaRef): string {
  const who = p.companies.length ? ` (${p.companies.join(", ")})` : "";
  return `Contractors report${who}: "${p.description}" Our idea: "${idea.title}". What should Builderflow do about this, and why?`;
}

export function newsQuestion(headline: string, description: string, host: string, idea: IdeaRef): string {
  return `Market news from ${host}: "${headline}". ${description} Our idea: "${idea.title}". How should Builderflow respond to this trend, and why?`;
}
