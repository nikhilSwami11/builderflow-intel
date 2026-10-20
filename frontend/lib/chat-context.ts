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

You are a brainstorming partner in a long conversation, not a report writer. The user will start with a broad idea and then refine it over many turns.

How to respond:
- Default to short: 2 to 5 sentences, or at most 4 bullets, about 80 to 120 words. Lead with the answer or the idea. Do not restate the question, and do not summarise the data back.
- For an open question, give your best 1 to 3 ideas in one line each, then ask ONE short question that helps narrow it down. Never dump every option.
- Go long only when the user asks for detail ("in detail", "explain", "step by step", "full plan", "draft", "compare"). Then be thorough and structured: short headings or numbered steps are fine.
- Build on earlier turns. Never repeat what you already said. If the user pushes back or changes direction, adjust.
- No filler: no "Great question", no closing recap.

Grounding:
- Use ONLY the data below for facts about Builderflow, competitors, pricing, complaints and the market. You may reason and suggest freely, but label anything not in the data as your suggestion.
- If the data does not answer the question, say "Not found in our data" and say what is missing. Never write that Builderflow "lacks" something; say it is "not found in our data".
- Builderflow's user guide is the source of truth. Gap matrix status meanings: yes = the guide explains it as working functionality; partial = the guide itself says it is coming soon or limited; unverified = the guide does not cover it (only the website or screenshots show it); no = no source mentions it. Screenshots are only illustrations from an empty new account, so empty screens prove nothing. None of this was tested in a running product.

Citations:
- Put the ids in square brackets right after the claim they support, like [G3] or [P2][R5]. Use at most 1 to 3 ids per claim, only ids you actually used, and only ids that appear below. Never invent an id.
- Never add a separate "Citations", "Sources" or "References" list.

## ABOUT BUILDERFLOW
${appSummary}

${lines.join("\n")}`;

  return { system, sources };
}

const ID_GROUP = /\[[A-Z]{1,2}\d+(?:\s*,\s*[A-Z]{1,2}\d+)*\]/g;

/** A model that ignores the rules may still append "Citations: R1,R2;..." as a plain line. */
export const STRAY_CITATION_LINE = /^\s*(?:citations?|sources?|references?)\s*:.*$/gim;

/** Item ids the answer cited, in order of first appearance (capped so the source row stays short). */
export function citedIds(text: string, max = 8): string[] {
  const ids = new Set<string>();
  for (const group of text.match(ID_GROUP) ?? []) for (const id of group.match(/[A-Z]{1,2}\d+/g) ?? []) ids.add(id);
  if (!ids.size) for (const line of text.match(STRAY_CITATION_LINE) ?? []) for (const id of line.match(/\b[A-Z]{1,2}\d+\b/g) ?? []) ids.add(id);
  return [...ids].slice(0, max);
}
