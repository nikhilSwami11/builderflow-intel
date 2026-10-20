"""Analyze node: feature gap matrix, pricing comparison, top pain points, messaging
inconsistencies.

Grounded in app_summary + screen digest + the 3 competitor profiles + Builderflow's own
pricing page + market_insights (not raw scraping alone -- feature lists from marketing pages
are weak signal on their own):

1. Gap matrix -- one cached mini-model call synthesizes one canonical feature list across
   competitors (dedupes synonyms), tiers each row (table_stakes / differentiator / emerging,
   the last one tied to market trends, not invented), and marks Builderflow's status as
   yes/partial/claimed/unverified/no grounded only in app_summary + screen digest. One extra row (the
   flat-vs-per-seat pricing model) is appended deterministically in Python -- see
   _pricing_model_gap_row below -- since it's a hand-verified fact, not something worth an
   LLM guessing at.
2. Pricing comparison -- NOT an LLM call. Dollar figures need to be exact, and competitor
   pricing pages are inconsistent/gated, so this reads data/manual/competitor_pricing.yaml
   (hand-researched, same source the Pricing tab renders) instead of asking a model to infer
   prices from a scrape.
3. Messaging inconsistencies -- one cached mini-model call, grounded in pricing pages on both
   sides and the provenance/mismatch note already surfaced in app_summary.md. This one stays
   AI-driven -- it's about which modules are live/rolling-out, not dollar amounts.

Top pain points is NOT an LLM call either -- market.py already extracted and themed them with
citations, so this step is a plain Python select/group (named-competitor complaints first,
capped per theme) to avoid re-deriving what's already structured.
"""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import yaml

from intel.cache import cached
from intel.config import MINI_MODEL, client
from intel.nodes.collect import collect_competitor
from intel.nodes.extract import extract_competitor
from intel.nodes.market import run as run_market
from intel.schemas import (
    AnalysisResult,
    Citation,
    GapMatrixEntry,
    GapMatrixResult,
    MessagingResult,
    PainPoint,
    PricingComparisonEntry,
)

APP_SUMMARY_PATH = Path("data/app_summary.md")
BUILDERFLOW_PRICING_PATH = Path("data/builderflow_site/pricing.md")
BUILDERFLOW_HOMEPAGE_PATH = Path("data/builderflow_site/homepage.md")
MANUAL_PRICING_PATH = Path("data/manual/competitor_pricing.yaml")
SCREEN_ANALYSES_PATH = Path("data/cache/screen_analyses.json")
OUT_PATH = Path("data/cache/analysis_result.json")


def _screen_digest_with_paths() -> str:
    """Like summary._screen_digest but keeps image_path so the gap-matrix call can cite a
    real file instead of inventing a descriptive label."""
    analyses = json.loads(SCREEN_ANALYSES_PATH.read_text())
    seen = set()
    lines = []
    for a in analyses:
        key = (a["module"], a["purpose"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"- [{a['module']}] {a['screen']}: {a['purpose']} (path: {a['image_path']})")
    return "\n".join(lines)

TOP_PAIN_POINTS_CAP = 8
MAX_PER_THEME = 3


def _competitor_profiles() -> dict:
    competitors = yaml.safe_load(open("data/competitors.yaml"))
    profiles = {}
    for c in competitors:
        pages = collect_competitor(c["name"], c["homepage"])
        profiles[c["name"]] = extract_competitor(c["name"], pages)
    return profiles


def _format_profiles(profiles: dict) -> str:
    chunks = []
    for name, profile in profiles.items():
        chunks.append(f"-- {name} --\nFeatures: {', '.join(profile.features)}")
    return "\n\n".join(chunks)


GAP_MATRIX_PROMPT = """You are building a feature gap matrix for Builderflow, a smaller
lead-management/CRM tool for remodelers and contractors, against three competitors
(CompanyCam, JobNimbus, Buildertrend).

A raw list of "do they have feature X" is weak on its own -- marketing pages overstate
parity. So for every row, also classify how much it actually matters:
- "table_stakes": most/all competitors have it -- Builderflow not having it is a real risk,
  not an opportunity.
- "differentiator": only some competitors have it -- a real edge either way.
- "emerging": shows up in the market trends below but few/no competitors have it yet --
  a frontier opportunity. Only use this tier if the market trends actually support it, don't
  invent emerging features.

Synthesize ONE canonical feature list across all three competitors' raw feature lists below
-- merge obvious synonyms (e.g. "Mobile App" / "Technician Mobile App" / "Field app" are the
same row). Weight the list toward CRM / lead-management / scheduling / estimating
capabilities, not only inspection/photo-documentation features.

For builderflow_has, use ONLY the Builderflow app_summary and screen digest below, and decide
by the strongest source (guide and portal note outrank the website; the website outranks screenshots):
- "yes": the guide describes it as working functionality, and nothing in the app_summary flags it
  as pilot, coming soon or rolling out.
- "partial": the guide, portal note or app_summary says it is pilot-only, coming soon, rolling
  out or limited.
- "claimed": only Builderflow's website marketing (module list, pricing table) mentions it; the
  guide does not describe it and nothing confirms it is available today.
- "unverified": screenshots show UI for it, but neither the guide nor the website covers it
  (or the sources conflict in a way you cannot resolve).
- "no": clearly absent from every source.
The screenshots were captured from a brand-new account with no data, so an empty state is NOT
evidence that a feature is partial or limited, and a feature not appearing in the screenshots is
NOT evidence that it is absent. Never guess.

citations: for each row, cite the competitor source (use their website homepage as ref if no
more specific URL is available) and, for Builderflow's status, cite a builderflow_site/*.md
file, or -- when the evidence is a screenshot -- copy the exact "(path: ...)" value from the
screen digest below verbatim as ref (source="screenshot"). Never paraphrase or invent a ref.

=== COMPETITOR FEATURES ===
{competitor_features}

=== MARKET TRENDS (for "emerging" tier only) ===
{trends}

=== BUILDERFLOW APP SUMMARY ===
{app_summary}

=== BUILDERFLOW SCREEN DIGEST (module: screen - purpose) ===
{screen_digest}
"""


_PATH_WRAPPER = re.compile(r"^\(path:\s*(.+)\)$")


def _clean_screenshot_ref(ref: str) -> str:
    """The model sometimes copies the whole '(path: ...)' wrapper instead of just the path."""
    m = _PATH_WRAPPER.match(ref.strip())
    return m.group(1) if m else ref


def _recompute_tier(count: int, total: int) -> str:
    """Tier is a counting rule, not a judgment call -- compute it deterministically instead
    of trusting the model's per-row tier label, which drifts inconsistent across a long list."""
    if count == 0:
        return "emerging"  # only legitimate when trend-grounded, per the prompt
    if count == 1:
        return "differentiator"
    return "table_stakes"  # majority or all competitors have it


def _load_manual_pricing() -> dict:
    return yaml.safe_load(MANUAL_PRICING_PATH.read_text())


def _pricing_model_gap_row(profiles: dict, manual_pricing: dict) -> GapMatrixEntry:
    """Whether a company's pricing scales with headcount is a real, hand-verified competitive
    fact (data/competition.txt) -- not something worth an LLM guessing at from a marketing
    page, so this row is built in Python and appended to the LLM's gap matrix rather than
    asked for in the prompt."""
    flat_competitors = [
        name for name in profiles
        if manual_pricing.get(name.lower().replace(" ", ""), {}).get("flat_unlimited_pricing")
    ]
    citations = [
        Citation(
            source="manual", ref="data/competition.txt",
            note="Buildertrend: flat per-tier pricing, unlimited users. CompanyCam: $29-34/mo per extra user "
                 "above plan bundle. JobNimbus: cost scales with team size/seats.",
        ),
        Citation(
            source="website", ref="https://builderflow.app/pricing/",
            note="Tiers differentiated by a user-count LIMIT (3 / 10 / unlimited), not a per-seat fee -- "
                 "but lower tiers cap out rather than scaling freely like Buildertrend's.",
        ),
    ]
    return GapMatrixEntry(
        feature="Flat, per-tier pricing (adding users doesn't raise the bill)",
        tier=_recompute_tier(len(flat_competitors), len(profiles)),
        builderflow_has="partial",
        competitors_with_it=flat_competitors,
        citations=citations,
    )


def build_gap_matrix(profiles: dict, trends: list, app_summary: str, screen_digest: str) -> GapMatrixResult:
    prompt = GAP_MATRIX_PROMPT.format(
        competitor_features=_format_profiles(profiles),
        trends="\n".join(f"- {t.description} ({t.citation.ref})" for t in trends),
        app_summary=app_summary,
        screen_digest=screen_digest,
    )
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=GapMatrixResult,
        )
        return resp.output_parsed.model_dump()

    result = GapMatrixResult(**cached("analyze_gap_matrix", key, _call))
    total = len(profiles)
    for entry in result.entries:
        entry.tier = _recompute_tier(len(entry.competitors_with_it), total)
        for c in entry.citations:
            if c.source == "screenshot":
                c.ref = _clean_screenshot_ref(c.ref)
    return result


def _build_pricing_comparison(profiles: dict, manual_pricing: dict) -> list[PricingComparisonEntry]:
    """Not an LLM call -- reads the same hand-verified data/manual/competitor_pricing.yaml the
    Pricing tab renders, so growth_advisor's "pricing" reasoning and chat's citations trace
    back to real numbers instead of an LLM guess at a competitor's dollar pricing."""
    entries = []
    for name in profiles:
        company = manual_pricing.get(name.lower().replace(" ", ""))
        if not company:
            continue
        plan_bits = "; ".join(f"{p['label']} {p['price']} ({p['users']} users)" for p in company["plans"])
        summary = f"{plan_bits}."
        if company.get("notes"):
            summary += f" {company['notes']}"
        entries.append(
            PricingComparisonEntry(company=name, summary=summary, citation=Citation(**company["citation"]))
        )
    return entries


MESSAGING_PROMPT = """You are flagging messaging inconsistencies in Builderflow's own public
materials -- Builderflow is a smaller lead-management/CRM tool for remodelers and contractors.

Builderflow's own materials already flag a mismatch -- the homepage explicitly notes the
portal says only Claim Scope is live while other modules are "rolling out next", yet the
pricing page's comparison table shows FSM/Claim Scope/Work Orders/Estimates as already
available (checkmark or add-on) on paid tiers. Extract these into structured entries -- topic,
what the website says, what the portal says (if stated), what the guide says (if stated).
citations MUST point to an exact URL from the "source:"/"url:" frontmatter of the pages below
(source="website") -- never cite "app_summary" or any meta-source, cite the actual page.
Don't invent inconsistencies beyond what's evidenced below.

=== BUILDERFLOW PRICING PAGE (raw, see frontmatter for url) ===
{builderflow_pricing}

=== BUILDERFLOW HOMEPAGE (raw, see frontmatter for url) ===
{builderflow_homepage}

=== BUILDERFLOW APP SUMMARY (background context only -- cite the pages above, not this) ===
{app_summary}
"""


def build_messaging(app_summary: str) -> MessagingResult:
    prompt = MESSAGING_PROMPT.format(
        builderflow_pricing=BUILDERFLOW_PRICING_PATH.read_text(),
        builderflow_homepage=BUILDERFLOW_HOMEPAGE_PATH.read_text(),
        app_summary=app_summary,
    )
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=MessagingResult,
        )
        return resp.output_parsed.model_dump()

    return MessagingResult(**cached("analyze_messaging", key, _call))


def select_top_pain_points(pain_points: list[PainPoint]) -> list[PainPoint]:
    """Plain Python selection -- named-competitor complaints first, capped per theme for
    diversity, so one noisy theme (e.g. data_integrity x4) doesn't crowd out the rest."""
    named = [p for p in pain_points if p.affected_companies]
    general = [p for p in pain_points if not p.affected_companies]

    selected = []
    per_theme = Counter()
    for p in named + general:
        if per_theme[p.theme] >= MAX_PER_THEME:
            continue
        selected.append(p)
        per_theme[p.theme] += 1
        if len(selected) >= TOP_PAIN_POINTS_CAP:
            break
    return selected


def run() -> AnalysisResult:
    app_summary = APP_SUMMARY_PATH.read_text()
    screen_digest = _screen_digest_with_paths()
    profiles = _competitor_profiles()
    market = run_market()
    manual_pricing = _load_manual_pricing()

    print("  building gap matrix...")
    gap_matrix = build_gap_matrix(profiles, market.trends, app_summary, screen_digest)
    gap_matrix.entries.append(_pricing_model_gap_row(profiles, manual_pricing))
    print("  building pricing comparison (manual data, no LLM call)...")
    pricing_comparison = _build_pricing_comparison(profiles, manual_pricing)
    print("  building messaging inconsistencies...")
    messaging = build_messaging(app_summary)
    top_pain_points = select_top_pain_points(market.pain_points)

    result = AnalysisResult(
        gap_matrix=gap_matrix.entries,
        pricing_comparison=pricing_comparison,
        top_pain_points=top_pain_points,
        messaging_inconsistencies=messaging.messaging_inconsistencies,
    )
    OUT_PATH.parent.mkdir(exist_ok=True)
    OUT_PATH.write_text(result.model_dump_json(indent=2))
    return result


if __name__ == "__main__":
    result = run()
    print(f"\n{len(result.gap_matrix)} gap matrix rows, "
          f"{len(result.pricing_comparison)} pricing entries, "
          f"{len(result.top_pain_points)} top pain points, "
          f"{len(result.messaging_inconsistencies)} messaging inconsistencies")
    print(result.model_dump_json(indent=2))
