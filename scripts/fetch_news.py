"""Collect dated news for the frontend's news section. Separate from the pipeline (intel/ is
untouched): Tavily news search -> one mini-model call per feed to pick the best items and write a
one-line summary (plus, for the AI feed, how Builderflow could use it).

Two feeds: "industry" (contractor CRM / remodeling / field-service software) and "ai" (AI news
that could be applied to Builderflow's field). Search results are cached per query per day, the
model call by prompt hash, so a same-day re-run costs nothing.

Run: python scripts/fetch_news.py     -> data/cache/news.json (read by export_frontend.py)
"""
import hashlib
import json
import sys
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pydantic import BaseModel  # noqa: E402
from tavily import TavilyClient  # noqa: E402

from intel.cache import cached  # noqa: E402
from intel.config import MINI_MODEL, client  # noqa: E402

OUT = ROOT / "data" / "cache" / "news.json"
WINDOW_DAYS = 365

FEEDS = {
    "industry": {
        "keep": 10,
        "queries": [
            "contractor CRM software news",
            "remodeling contractors software industry",
            "field service management software news contractors",
            "construction technology lead management",
            "home services software funding acquisition",
            "CompanyCam JobNimbus Buildertrend news",
        ],
    },
    "ai": {
        "keep": 10,
        "queries": [
            "AI tools for contractors construction",
            "generative AI CRM sales automation",
            "AI estimating takeoff construction software",
            "AI agents field service scheduling",
            "AI lead qualification home services",
            "AI photo documentation inspection property damage",
            "AI voice assistant customer calls small business",
            "new AI model release agents business automation",
        ],
    },
}


class Pick(BaseModel):
    id: int
    summary: str  # one plain sentence: what happened
    builderflow_use: str  # AI feed: a concrete way Builderflow could use it; industry feed: ""


class Picks(BaseModel):
    items: list[Pick]


def search(query: str, days: int = WINDOW_DAYS) -> list[dict]:
    def _call():
        resp = TavilyClient().search(query, topic="news", days=days, max_results=10)
        return [
            {"title": r.get("title", ""), "url": r["url"], "content": r.get("content", ""), "date": r.get("published_date")}
            for r in resp.get("results", [])
        ]

    return cached("news_search", f"{query}|{days}|{date.today().isoformat()}", _call)


def iso(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat(timespec="seconds")
    except (TypeError, ValueError):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat(timespec="seconds")
        except ValueError:
            return None


PROMPT = {
    "industry": """Builderflow is a small CRM / lead-management product for remodelers and contractors.
Below are news candidates. Pick the {keep} most relevant to the contractor-software market
(competitors, pricing, funding, product launches, adoption, regulation). Skip duplicates, ads and
generic listicles. Candidates are listed newest first; when two are about equally relevant prefer the newer.
Spread the picks across time: include some from the last week, the last month and older, so
every date filter has stories (but never pick an irrelevant story just to fill a period). For each pick: summary = one plain sentence on what happened, from the snippet
only. builderflow_use = a concrete idea for Builderflow ONLY if the story clearly suggests one,
otherwise "".""",
    "ai": """Builderflow is a small CRM / lead-management product for remodelers and contractors
(lead intake, estimates, inspections/claim scope, scheduling, field technicians, finance).
Below are AI news candidates. Pick the {keep} that Builderflow could actually use or must respond
to. Skip duplicates, ads, generic listicles and hype with no usable angle. Candidates are listed newest first; when two are about equally relevant prefer the newer.
Spread the picks across time: include some from the last week, the last month and older, so every date filter has
stories (but never pick an irrelevant story just to fill a period). For each pick:
summary = one plain sentence on what happened, from the snippet only. builderflow_use = one
concrete sentence on how Builderflow could apply it (a feature, a workflow, a positioning move).
Do not claim Builderflow lacks anything; suggest.""",
}


def build_feed(name: str) -> list[dict]:
    cfg = FEEDS[name]
    seen: dict[str, dict] = {}
    # A year-wide search ranks old articles high, so short windows get their own searches to keep
    # the "last 24 hours / 7 days / month" filters populated.
    jobs = [(q, WINDOW_DAYS) for q in cfg["queries"]] + [(q, d) for q in cfg["queries"][:4] for d in (1, 7, 31)]
    for q, days in jobs:
        print(f"  [{name}] {q} ({days}d)")
        for r in search(q, days):
            if r["url"] not in seen and r["content"]:
                seen[r["url"]] = r
    cands = sorted(seen.values(), key=lambda c: iso(c["date"]) or "", reverse=True)  # newest first
    listing = "\n\n".join(f"[{i}] {c['title']} ({c['date'] or 'no date'})\n{c['content'][:500]}" for i, c in enumerate(cands))
    prompt = PROMPT[name].format(keep=cfg["keep"]) + "\n\n=== CANDIDATES ===\n" + listing

    def _call():
        resp = client().responses.parse(model=MINI_MODEL, input=[{"role": "user", "content": prompt}], text_format=Picks)
        return resp.output_parsed.model_dump()

    picks = Picks(**cached("news_pick", hashlib.sha256(prompt.encode()).hexdigest(), _call))

    items = []
    for p in picks.items:
        if not 0 <= p.id < len(cands):
            continue
        c = cands[p.id]
        items.append(
            {
                "id": f"news-{name}-{len(items)}",
                "feed": name,
                "title": c["title"],
                "url": c["url"],
                "host": urlparse(c["url"]).netloc.removeprefix("www."),
                "published": iso(c["date"]),
                "summary": p.summary,
                "builderflowUse": p.builderflow_use or None,
            }
        )
    items.sort(key=lambda i: i["published"] or "", reverse=True)
    return items


def main() -> None:
    news = [item for name in FEEDS for item in build_feed(name)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "items": news}, indent=2))
    for name in FEEDS:
        sub = [n for n in news if n["feed"] == name]
        dated = sum(1 for n in sub if n["published"])
        print(f"{name}: {len(sub)} items, {dated} dated, newest {sub[0]['published'] if sub else '-'}")


if __name__ == "__main__":
    main()
