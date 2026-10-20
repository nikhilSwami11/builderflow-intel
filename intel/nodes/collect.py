"""Collect node: competitor homepage, features, pricing, changelog pages.

Raw text + URL + timestamp saved via CollectedPage, cached by URL so re-runs cost
nothing. If a site blocks scraping after 2 attempts, log it and fall back to
data/manual/<name>.md (CLAUDE.md convention).
"""
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright
from tavily import TavilyClient

from intel.cache import cached
from intel.schemas import CollectedPage

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
PAGE_KINDS = ["pricing", "features", "changelog"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _manual_fallback(company: str, url: str) -> CollectedPage | None:
    import re

    slug = re.sub(r"[^a-z0-9]+", "-", company.lower()).strip("-")
    path = f"data/manual/{slug}.md"
    try:
        text = open(path).read()
    except FileNotFoundError:
        print(f"  BLOCKED, no manual fallback at {path} -- skipping {url}")
        return None
    print(f"  BLOCKED, using manual fallback {path}")
    return CollectedPage(company=company, url=url, fetched_at=_now(), raw_text=text, blocked=True)


def _fetch_with_retry(browser, company: str, url: str) -> CollectedPage:
    for attempt in range(1, 3):
        try:
            page = browser.new_page(user_agent=UA)
            page.goto(url, timeout=20000, wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            text = page.inner_text("body")
            page.close()
            return CollectedPage(company=company, url=url, fetched_at=_now(), raw_text=text)
        except Exception as e:
            print(f"  attempt {attempt}/2 failed for {url}: {e}")
    fallback = _manual_fallback(company, url)
    if fallback:
        return fallback
    return CollectedPage(company=company, url=url, fetched_at=_now(), raw_text="", blocked=True)


def fetch_page(browser, company: str, url: str) -> CollectedPage:
    def _call():
        return _fetch_with_retry(browser, company, url).model_dump()

    data = cached("collect", url, _call)
    return CollectedPage(**data)


QUERY_VARIANTS = {
    "pricing": ["{company} pricing"],
    "features": ["{company} features"],
    "changelog": [
        "{company} changelog",
        "{company} what's new release notes",
        "{company} product updates",
    ],
}


def discover_urls(company: str, homepage: str) -> dict[str, str]:
    """Tavily search to find each competitor's pricing/features/changelog page."""

    def _call():
        tv = TavilyClient()
        domain = _domain(homepage)
        found = {}
        for kind in PAGE_KINDS:
            url = None
            for query in QUERY_VARIANTS[kind]:
                resp = tv.search(
                    query.format(company=company), max_results=5, include_domains=[domain]
                )
                results = resp.get("results", [])
                if results:
                    url = results[0]["url"]
                    break
            found[kind] = url
        return found

    key = f"{company}:{homepage}:v2"
    return cached("discover_urls", key, _call)


def _domain(url: str) -> str:
    host = url.split("//", 1)[-1].split("/", 1)[0]
    return host[4:] if host.startswith("www.") else host


def collect_competitor(company: str, homepage: str) -> list[CollectedPage]:
    urls = {"homepage": homepage, **discover_urls(company, homepage)}
    pages = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for kind, url in urls.items():
            if not url:
                print(f"  no {kind} URL found for {company}, skipping")
                continue
            print(f"  fetching {company} {kind}: {url}")
            pages.append(fetch_page(browser, company, url))
        browser.close()
    pages.extend(_research_notes(company))
    return pages


def _research_notes(company: str) -> list[CollectedPage]:
    """Hand-collected research (data/manual/<slug>.md, split out of data/competition.txt) is
    always added alongside the scraped pages, not only when a site blocks us."""
    import re

    path = f"data/manual/{re.sub(r'[^a-z0-9]+', '-', company.lower()).strip('-')}.md"
    try:
        text = open(path).read()
    except FileNotFoundError:
        return []
    return [CollectedPage(company=company, url=path, fetched_at=_now(), raw_text=text)]


BUILDERFLOW_PAGES = [
    "https://builderflow.app/pricing/",
    "https://builderflow.app/who-we-serve/",
    "https://builderflow.app/lead-intake-automation/",
    "https://builderflow.app/our-solutions/builder-claim-scope/",
    "https://builderflow.app/our-solutions/builder-estimate-pro/",
    "https://builderflow.app/our-solutions/builder-finance/",
    "https://builderflow.app/our-solutions/builder-fsm/",
    "https://builderflow.app/our-solutions/technician-mobile-app/",
    "https://builderflow.app/our-solutions/work-orders-management/",
]


def _slug(url: str) -> str:
    path = url.rstrip("/").split("/")[-1]
    return path or "homepage"


def collect_builderflow_site() -> None:
    import re

    out_dir = __import__("pathlib").Path("data/builderflow_site")
    out_dir.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url in BUILDERFLOW_PAGES:
            print(f"  fetching {url}")
            pg = fetch_page(browser, "Builderflow", url)
            slug = _slug(url)
            dest = out_dir / f"{slug}.md"
            dest.write_text(f"<!-- source: {url} fetched_at: {pg.fetched_at} -->\n\n{pg.raw_text}")
            print(f"    [{'BLOCKED' if pg.blocked else 'ok'}] -> {dest} ({len(pg.raw_text)} chars)")
        browser.close()


if __name__ == "__main__":
    import sys

    import yaml

    if sys.argv[1:2] == ["builderflow"]:
        collect_builderflow_site()
        sys.exit(0)

    competitors = yaml.safe_load(open("data/competitors.yaml"))
    names = sys.argv[1:] or [c["name"] for c in competitors]
    for c in competitors:
        if c["name"] not in names:
            continue
        print(f"\n{c['name']}")
        pages = collect_competitor(c["name"], c["homepage"])
        for pg in pages:
            print(f"  [{'BLOCKED' if pg.blocked else 'ok'}] {pg.url} ({len(pg.raw_text)} chars)")
