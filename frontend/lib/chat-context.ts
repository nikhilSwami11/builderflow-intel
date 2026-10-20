import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "./data";
import { shortName } from "./opportunities";
import type { Citation } from "./types";

/** The guide split at "##" headings (each section keeps its "#" chapter as a prefix), so each
 *  section can be cited by id. The guide is ~12k tokens: small enough to send whole. */
function guideSections(): { heading: string; body: string }[] {
  const md = readFileSync(join(process.cwd(), "..", "data", "builderflow_guide.md"), "utf8");
  const out: { heading: string; body: string }[] = [];
  let chapter = "";
  let cur: { heading: string; body: string } | null = null;
  for (const line of md.split("\n")) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h1 || h2) {
      if (h1) chapter = h1[1].trim();
      cur = { heading: h1 ? chapter : `${chapter} > ${h2![1].trim()}`, body: "" };
      out.push(cur);
    } else if (cur) cur.body += line + "\n";
  }
  return out.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body);
}

const WEBSITE_PAGES = ["homepage", "pricing", "who-we-serve"];

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

  lines.push("", `## DATED NEWS (today is ${new Date().toISOString().slice(0, 10)}; feed | published | headline | summary | suggested use). Use these for "latest news" questions.`);
  bundle.news
    .slice()
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""))
    .forEach((n, i) =>
      add(`NW${i + 1}`, `${n.feed} | ${n.published?.slice(0, 10) ?? "undated"} | ${n.title} | ${n.summary}${n.builderflowUse ? ` | use: ${n.builderflowUse}` : ""}`, [{ source: "search", ref: n.url, note: n.title }]),
    );

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

  lines.push("", "## BUILDERFLOW USER GUIDE (source of truth, full text, by section)");
  guideSections().forEach((sec, i) =>
    add(`D${i + 1}`, `${sec.heading}\n${sec.body}`, [{ source: "guide", ref: sec.heading, note: null }]),
  );

  lines.push("", "## BUILDERFLOW PUBLIC WEBSITE (marketing copy; the guide wins where they differ)");
  WEBSITE_PAGES.forEach((name, i) => {
    const text = readFileSync(join(process.cwd(), "..", "data", "builderflow_site", `${name}.md`), "utf8").trim();
    add(`W${i + 1}`, `${name}\n${text}`, [{ source: "website", ref: `builderflow.app/${name === "homepage" ? "" : name}`, note: null }]);
  });

  const appSummary = readFileSync(join(process.cwd(), "..", "data", "app_summary.md"), "utf8");

  const system = `You are the Builderflow Growth Intelligence assistant. You answer questions from Builderflow's founders and product leads, using ONLY the data below. The guide sections [D..] hold the full how-to text: use them for questions about what a Builderflow feature does or how it works.

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

Output format: you always return JSON with three fields.
- answer: the reply in Markdown. Short replies stay conversational prose with at most a short list. Use **bold** for key terms. For long or structured replies, use ### headings, numbered steps, and a Markdown table when comparing options side by side. Never use a heading in a short reply. Put detail bullets under a numbered step by indenting them 3 spaces so they nest; never alternate a numbered line with an unindented bullet list. NEVER write item ids (G3, NW5, D12...), citations, source lists or tags inside it; refer to things by name. For news questions, name each story by a short headline and its date (e.g. "Oct 14 - ..."), newest first, and say how it applies to Builderflow.
- sources: the ids of the data items below that your answer relied on (like G3, P2, R5, D12), at most 6, only ids that appear below. Never invent an id.
- ideas: usually an empty array. Add an entry ONLY for an idea that is specific, new in this conversation, grounded in the data and genuinely worth acting on, whether you suggest it or the user does. At most 3 per reply. If your answer offers several distinct options or the user asks for N ideas, record each as its own idea (siblings under the same parent). title = max 8 words. anchor = a 3 to 8 word phrase copied EXACTLY (same characters) from your answer, at the spot where that idea is stated, so the UI can highlight it. why = one sentence. parent = the id (N1, N2...) of the earlier idea it builds on or improves, else "root". When the user says "improve that", "using AI", "next step" and so on, the new idea is a CHILD of the idea being discussed. Alternatives to the same idea are siblings (same parent). Ideas you add in one reply get the next consecutive ids, so a later entry in the same reply may use an earlier entry's id as its parent.

## ABOUT BUILDERFLOW
${appSummary}

${lines.join("\n")}`;

  return { system, sources };
}
