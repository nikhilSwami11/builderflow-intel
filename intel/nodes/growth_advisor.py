"""Growth advisor node: what to build, what to double down on, positioning/pricing ideas,
quick wins.

One cached call on GROWTH_MODEL ("gpt-5", per CLAUDE.md -- the only node that doesn't use the
mini model). Grounded entirely in analyze.py's output (gap matrix with tiers, pricing
comparison, themed pain points, messaging inconsistencies) plus app_summary.

Citations are resolved by id, not retyped by the model: every Citation already attached to
analyze.py's findings gets a short id (C1, C2, ...), the model only has to point to ids it
used, and Python resolves those back to the real Citation objects. Asking a model to retype a
citation's exact ref (e.g. a screenshot path with spaces) verbatim is unreliable -- the earlier
version of this node had the model copy citation JSON by hand and ~40% of screenshot refs came
back as paraphrased labels instead of real paths.
"""
import hashlib
from collections import Counter
from pathlib import Path

from intel.cache import cached
from intel.citations import CitationIndex
from intel.config import GROWTH_MODEL, client
from intel.nodes.analyze import run as run_analyze
from intel.schemas import AnalysisResult, GrowthAdvice, GrowthAdviceDraft, GrowthRecommendation

APP_SUMMARY_PATH = Path("data/app_summary.md")
OUT_PATH = Path("data/cache/growth_advice.json")

PROMPT_TEMPLATE = """You are Builderflow's growth advisor. Builderflow is a smaller
lead-management/CRM tool for remodelers and contractors, competing against CompanyCam,
JobNimbus and Buildertrend. Below is already-structured, already-cited competitive analysis
-- reason over it, don't re-derive it. Every fact below carries a [Cn] citation id; when a
recommendation relies on a fact, put that id in citation_ids. Do not invent ids and do not
write out URLs or paths yourself -- just reference the [Cn] ids.

Produce a set of recommendations across all five categories:
- "build": gaps worth closing. Prioritize table_stakes rows where builderflow_has is "no" or
  "partial" (the guide itself says coming soon / limited -- a real risk, not optional) over
  "emerging" rows (speculative, lower urgency). A row marked "unverified" is shown on the website or
  in screenshots but is NOT explained in the user guide: treat it as "document it in the guide and
  confirm it is available", not as a confirmed strength or a confirmed gap.
- "double_down": things Builderflow already does well (builderflow_has="yes" -- explained in
  the guide -- on a
  differentiator row, or a module competitors' pain points suggest they struggle with and
  Builderflow doesn't).
- "positioning": messaging moves -- especially where a competitor's named, themed pain point
  (e.g. a support or data_integrity complaint specific to one competitor) is a wedge, or where
  Builderflow's own messaging_inconsistencies need resolving before they become a liability.
- "pricing": informed by the pricing_comparison entries -- is Builderflow's tiering/opacity
  working for or against it.
- "quick_win": low-effort, near-term moves (don't require new engineering, e.g. closing a
  messaging inconsistency or publishing list prices).

=== GAP MATRIX (feature, tier, builderflow_has, competitors_with_it, citation ids) ===
{gap_matrix}

=== PRICING COMPARISON ===
{pricing_comparison}

=== TOP PAIN POINTS (theme, description, affected_companies, citation id) ===
{pain_points}

=== MESSAGING INCONSISTENCIES ===
{messaging_inconsistencies}

=== BUILDERFLOW APP SUMMARY (for context on what it already does -- not citable, no id) ===
{app_summary}
"""


def _record_evidence(evidence_by_cid: dict, idx: CitationIndex, citations, desc: str) -> str:
    """Tag citations and remember which plain-English fact each resulting id traces back to,
    so a recommendation's citation_ids can later be turned back into "backed by: ..." lines
    instead of just raw source links."""
    ids = [idx.add(c) for c in citations]
    for cid in ids:
        evidence_by_cid.setdefault(cid, []).append(desc)
    return " ".join(f"[{i}]" for i in ids)


def _format_gap_matrix(analysis: AnalysisResult, idx: CitationIndex, evidence_by_cid: dict) -> str:
    lines = []
    for g in analysis.gap_matrix:
        desc = (
            f"Gap matrix: \"{g.feature}\" ({g.tier}) -- Builderflow has={g.builderflow_has}, "
            f"competitors with it: {', '.join(g.competitors_with_it) or 'none'}"
        )
        tag = _record_evidence(evidence_by_cid, idx, g.citations, desc)
        lines.append(
            f"- [{g.tier}] {g.feature} -- builderflow_has={g.builderflow_has}, "
            f"competitors_with_it={g.competitors_with_it} {tag}"
        )
    return "\n".join(lines)


def _format_pricing(analysis: AnalysisResult, idx: CitationIndex, evidence_by_cid: dict) -> str:
    lines = []
    for p in analysis.pricing_comparison:
        desc = f"Pricing -- {p.company}: {p.summary}"
        tag = _record_evidence(evidence_by_cid, idx, [p.citation], desc)
        lines.append(f"- {p.company}: {p.summary} {tag}")
    return "\n".join(lines)


def _format_pain_points(analysis: AnalysisResult, idx: CitationIndex, evidence_by_cid: dict) -> str:
    lines = []
    for p in analysis.top_pain_points:
        who = ", ".join(p.affected_companies) if p.affected_companies else "industry-wide"
        desc = f"Pain point ({p.theme}, {who}): {p.description}"
        tag = _record_evidence(evidence_by_cid, idx, [p.citation], desc)
        lines.append(f"- [{p.theme}] {p.description} -- affected={p.affected_companies} {tag}")
    return "\n".join(lines)


def _format_messaging(analysis: AnalysisResult, idx: CitationIndex, evidence_by_cid: dict) -> str:
    lines = []
    for m in analysis.messaging_inconsistencies:
        desc = (
            f"Messaging inconsistency -- {m.topic}: website says {m.website_says!r}, "
            f"portal says {m.portal_says!r}, guide says {m.guide_says!r}"
        )
        tag = _record_evidence(evidence_by_cid, idx, m.citations, desc)
        lines.append(
            f"- {m.topic}: website_says={m.website_says!r}, portal_says={m.portal_says!r}, "
            f"guide_says={m.guide_says!r} {tag}"
        )
    return "\n".join(lines)


def build_growth_advice(analysis: AnalysisResult, app_summary: str) -> GrowthAdvice:
    idx = CitationIndex()
    evidence_by_cid: dict[str, list[str]] = {}
    # Build every tag (and therefore every id) up front, in a fixed order, so the prompt --
    # and the cache key -- are deterministic regardless of dict/set iteration order.
    gap_matrix = _format_gap_matrix(analysis, idx, evidence_by_cid)
    pricing_comparison = _format_pricing(analysis, idx, evidence_by_cid)
    pain_points = _format_pain_points(analysis, idx, evidence_by_cid)
    messaging_inconsistencies = _format_messaging(analysis, idx, evidence_by_cid)

    prompt = PROMPT_TEMPLATE.format(
        gap_matrix=gap_matrix,
        pricing_comparison=pricing_comparison,
        pain_points=pain_points,
        messaging_inconsistencies=messaging_inconsistencies,
        app_summary=app_summary,
    )
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=GROWTH_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=GrowthAdviceDraft,
        )
        return resp.output_parsed.model_dump()

    draft = GrowthAdviceDraft(**cached("growth_advisor", key, _call))

    recommendations = []
    for r in draft.recommendations:
        seen, evidence = set(), []
        for cid in r.citation_ids:
            for desc in evidence_by_cid.get(cid, []):
                if desc not in seen:
                    seen.add(desc)
                    evidence.append(desc)
        recommendations.append(
            GrowthRecommendation(
                title=r.title,
                detail=r.detail,
                category=r.category,
                citations=idx.resolve(r.citation_ids),
                evidence=evidence,
            )
        )
    return GrowthAdvice(recommendations=recommendations)


def run() -> GrowthAdvice:
    analysis = run_analyze()
    app_summary = APP_SUMMARY_PATH.read_text()
    advice = build_growth_advice(analysis, app_summary)
    OUT_PATH.parent.mkdir(exist_ok=True)
    OUT_PATH.write_text(advice.model_dump_json(indent=2))
    return advice


if __name__ == "__main__":
    advice = run()
    print(f"{len(advice.recommendations)} recommendations: "
          f"{Counter(r.category for r in advice.recommendations)}")
    print(advice.model_dump_json(indent=2))
