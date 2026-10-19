import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "./data";
import { shortName } from "./opportunities";
import type { Citation } from "./types";

/** Everything the chat model is allowed to answer from, as one prompt, plus a map from each
 *  item id (G3, P2, R5...) to the sources behind it. The analysis is only a few thousand tokens,
 *  so it is sent whole on every question instead of being searched. */
export function buildChatContext(): { system: string; sources: Record<string, Citation[]> } {
  const sources: Record<string, Citation[]> = {};
  const lines: string[] = [];
  const add = (id: string, text: string, cites: Citation[]) => {
    sources[id] = cites;
    lines.push(`[${id}] ${text}`);
  };

  lines.push("## GAP MATRIX (feature | importance tier | Builderflow status | competitors that ship it)");
  bundle.gapMatrix.forEach((g, i) =>
    add(`G${i + 1}`, `${shortName(g.feature)} | ${g.tier} | ${g.builderflowHas} | ${g.competitors.join(", ") || "none found"}`, g.citations),
  );

  lines.push("", "## CONTRACTOR PAIN POINTS (theme | companies | complaint)");
  bundle.painPoints.forEach((p, i) =>
    add(`P${i + 1}`, `${p.theme} | ${p.companies.join(", ") || "industry-wide"} | ${p.description}`, [p.citation]),
  );

  lines.push("", "## MARKET TRENDS");
  bundle.trends.forEach((t, i) => add(`T${i + 1}`, t.description, [t.citation]));

  lines.push("", "## PRICING (hand-verified, public plans)");
  bundle.pricing.forEach((c, i) =>
    add(`PR${i + 1}`, `${c.name}: ${c.plans.map((p) => `${p.label} ${p.price}${p.users ? ` (${p.users})` : ""}`).join("; ")}.${c.notes ? ` Notes: ${c.notes}` : ""}`, [c.citation]),
  );

  lines.push("", "## BUILDERFLOW MESSAGING INCONSISTENCIES (website vs portal vs guide)");
  bundle.messaging.forEach((m, i) =>
    add(`M${i + 1}`, `${m.topic} | website: ${m.websiteSays ?? "not found"} | portal: ${m.portalSays ?? "not found"} | guide: ${m.guideSays ?? "not found"}`, m.citations),
  );

  lines.push("", "## GROWTH IDEAS (category | title | reasoning)");
  bundle.recommendations.forEach((r, i) => add(`R${i + 1}`, `${r.category} | ${r.title} | ${r.detail}`, r.citations));

  const appSummary = readFileSync(join(process.cwd(), "..", "data", "app_summary.md"), "utf8");

  const system = `You are the Builderflow Growth Intelligence assistant. You answer questions from Builderflow's founders and product leads, using ONLY the data below.

Rules:
- Cite the evidence behind each claim inline with its id in square brackets, like [G3] or [P2][R5]. Cite only ids that appear below. Never invent an id.
- If the data does not answer the question, say "Not found in our data" and say what is missing. Never write that Builderflow "lacks" something; say it is "not found in our data".
- Builderflow's status in the gap matrix reflects what its own website, guide and portal claim. It was not checked in a running product, so do not present "have it" as verified.
- Be concise: lead with the answer, then short bullets or short paragraphs. No headings.

## ABOUT BUILDERFLOW
${appSummary}

${lines.join("\n")}`;

  return { system, sources };
}

const ID_GROUP = /\[[A-Z]{1,2}\d+(?:\s*,\s*[A-Z]{1,2}\d+)*\]/g;

/** Item ids the answer cited, in order of first appearance. */
export function citedIds(text: string): string[] {
  const ids = new Set<string>();
  for (const group of text.match(ID_GROUP) ?? []) for (const id of group.match(/[A-Z]{1,2}\d+/g) ?? []) ids.add(id);
  return [...ids];
}
