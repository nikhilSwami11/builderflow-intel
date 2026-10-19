"""Market node: industry trends, contractor pain points, competitor review snippets.

Two steps, both cached: (1) Tavily search gathers raw snippets per query, (2) one mini-model
call extracts structured MarketInsights grounded only in those snippets. Every trend, pain
point, and review snippet keeps source="search" and ref=the exact URL it came from.
"""
import hashlib
import json
from pathlib import Path

import yaml
from tavily import TavilyClient

from intel.cache import cached
from intel.config import MINI_MODEL, client
from intel.schemas import MarketInsights

OUT_PATH = Path("data/cache/market_insights.json")

INDUSTRY_QUERIES = [
    "contractor CRM software industry trends 2025 2026",
    "remodeling construction software market trends",
    "field service management software trends contractors",
]

PAIN_POINT_QUERIES = [
    "contractor CRM software complaints problems",
    "remodeling contractor software frustrations reddit",
    "construction lead management software pain points",
]

REVIEW_QUERY_TEMPLATES = [
    "{company} reviews reddit",
    "{company} reviews g2",
    "{company} reviews capterra",
]


def _gather_one(query: str) -> list[dict]:
    def _call():
        tv = TavilyClient()
        resp = tv.search(query, max_results=5, search_depth="basic")
        return [
            {"title": r.get("title", ""), "url": r["url"], "content": r.get("content", "")}
            for r in resp.get("results", [])
        ]

    return cached("market_search", query, _call)


def gather_all(companies: list[str]) -> dict[str, list[dict]]:
    queries = list(INDUSTRY_QUERIES) + list(PAIN_POINT_QUERIES)
    for company in companies:
        queries += [t.format(company=company) for t in REVIEW_QUERY_TEMPLATES]

    results = {}
    for q in queries:
        print(f"  searching: {q}")
        results[q] = _gather_one(q)
    return results


def _format_context(results: dict[str, list[dict]]) -> str:
    chunks = []
    for query, hits in results.items():
        for h in hits:
            if not h["content"]:
                continue
            chunks.append(f"-- query: {query} | url: {h['url']} --\n{h['content'][:1500]}")
    return "\n\n".join(chunks)


PROMPT_TEMPLATE = """You are researching the market around contractor/remodeler lead
management and CRM software (competitors include CompanyCam, JobNimbus, Buildertrend, and
similar tools) for Builderflow, a smaller player in this space. Below are raw search result
snippets grouped by the query that found them.

Extract, using ONLY what's stated in these snippets -- don't invent trends, pain points, or
reviews that aren't evidenced here:
- trends: industry/market trends relevant to contractor CRM / lead management / field service
  software.
- pain_points: concrete complaints or frustrations contractors have with these tools (set
  affected_companies to the specific competitor(s) a complaint names, or leave empty if it's
  about the industry/category in general).
- review_snippets: citations (source="search", ref=the exact URL, note=a short quote or
  paraphrase of what the review said) pointing at specific Reddit/G2/Capterra review content.

For every trend and pain_point, set citation.source="search" and citation.ref to the exact URL
the claim came from.

=== SEARCH RESULTS ===
{context}
"""


def extract_market_insights(context: str) -> MarketInsights:
    prompt = PROMPT_TEMPLATE.format(context=context)
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=MarketInsights,
        )
        return resp.output_parsed.model_dump()

    data = cached("market_extract", key, _call)
    return MarketInsights(**data)


def run() -> MarketInsights:
    competitors = yaml.safe_load(open("data/competitors.yaml"))
    companies = [c["name"] for c in competitors]

    results = gather_all(companies)
    context = _format_context(results)
    insights = extract_market_insights(context)

    OUT_PATH.parent.mkdir(exist_ok=True)
    OUT_PATH.write_text(insights.model_dump_json(indent=2))
    return insights


if __name__ == "__main__":
    insights = run()
    print(f"\n{len(insights.trends)} trends, {len(insights.pain_points)} pain points, "
          f"{len(insights.review_snippets)} review snippets")
    print(insights.model_dump_json(indent=2))
