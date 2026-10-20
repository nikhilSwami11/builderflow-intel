"""Extract node: features, pricing tiers, target customer, positioning -> CompetitorProfile.

One cached mini-model call per competitor, grounded in its collected pages. Every claim
carries a citation back to the page URL it came from.
"""
import hashlib

from intel.cache import cached
from intel.config import MINI_MODEL, client
from intel.schemas import CollectedPage, CompetitorProfile

MAX_CHARS_PER_PAGE = 6000

PROMPT_TEMPLATE = """Extract a structured competitor profile for {company} from the pages
below. Only use what's stated on these pages -- don't invent features, prices, or
positioning that aren't evidenced here.

For every feature, pricing tier, and the positioning/target_customer fields, set the
citation's source to "website" and ref to the exact URL of the page it came from. If the page
"URL" is a local path starting with data/ (hand-collected research notes), use source "manual"
and that path as ref instead.

=== PAGES ===
{pages}
"""


def _format_pages(pages: list[CollectedPage]) -> str:
    chunks = []
    for pg in pages:
        if pg.blocked and not pg.raw_text:
            continue
        chunks.append(f"-- {pg.url} --\n{pg.raw_text[:MAX_CHARS_PER_PAGE]}")
    return "\n\n".join(chunks)


def extract_competitor(company: str, pages: list[CollectedPage]) -> CompetitorProfile:
    prompt = PROMPT_TEMPLATE.format(company=company, pages=_format_pages(pages))
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=CompetitorProfile,
        )
        return resp.output_parsed.model_dump()

    data = cached("extract", key, _call)
    return CompetitorProfile(**data)


if __name__ == "__main__":
    import sys

    import yaml

    from intel.nodes.collect import collect_competitor

    competitors = yaml.safe_load(open("data/competitors.yaml"))
    names = sys.argv[1:] or [c["name"] for c in competitors]
    for c in competitors:
        if c["name"] not in names:
            continue
        print(f"\n{c['name']}")
        pages = collect_competitor(c["name"], c["homepage"])
        profile = extract_competitor(c["name"], pages)
        print(profile.model_dump_json(indent=2))
