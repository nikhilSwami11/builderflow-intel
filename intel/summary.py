"""Builds the ~1500-token app_summary from guide + website + screens.

This always goes in the chat system prompt; everything else is retrieved via RAG.
Cached since it's one LLM call over a large context.
"""
import hashlib
import json
from pathlib import Path

from intel.cache import cached
from intel.config import MINI_MODEL, client

GUIDE_PATH = Path("data/builderflow_guide.md")
WEBSITE_DIR = Path("data/builderflow_site")
SCREEN_ANALYSES_PATH = Path("data/cache/screen_analyses.json")
OUT_PATH = Path("data/app_summary.md")

PROMPT_TEMPLATE = """Write a factual summary of Builderflow, a lead management and CRM web
app for remodelers/contractors, for use as a system prompt grounding an AI growth-advisor
tool. HARD LIMIT: 1500 tokens (~1100 words) -- stop well short of that, do not pad to fill it.
Base it ONLY on the guide, website, and screenshot analyses below -- do not invent features
or modules not evidenced in this material.

Evidence rules (important):
- The screenshots were captured from a brand-new account with no data, so empty states ("No
  projects yet", empty lists) are normal and say NOTHING about whether a feature is live, partial
  or in pilot. Never infer availability from an empty screen, and never treat a feature that
  is missing from the screenshots as missing from the product.
- For what is actually available today, trust the guide and the portal note above the website.
  Where the guide or portal says a module is "coming soon", "rolling out" or pilot-only, record it
  as NOT generally available. Where only the website's marketing claims a module and the guide
  does not describe it, record it as "claimed on the website, not confirmed by the guide".

Cover, briefly: what Builderflow is, its modules/features (what's live vs what's rolling out
next, per the portal vs the guide vs the website -- flag any mismatch rather than picking one),
who it's for, and its core workflow as a compact numbered list (not one paragraph per step).
Be dense and specific, not marketing copy. Cut anything not load-bearing for an LLM reasoning
about gaps and positioning -- no security/compliance boilerplate, no restated role lists.

=== GUIDE (data/builderflow_guide.md, first 6000 chars) ===
{guide}

=== WEBSITE ===
{website}

=== SCREEN ANALYSES (purpose + module only, deduped) ===
{screens}
"""


def _website_text() -> str:
    parts = []
    for f in sorted(WEBSITE_DIR.glob("*.md")):
        parts.append(f"-- {f.name} --\n{f.read_text()}")
    return "\n\n".join(parts)


def _screen_digest() -> str:
    analyses = json.loads(SCREEN_ANALYSES_PATH.read_text())
    seen = set()
    lines = []
    for a in analyses:
        key = (a["module"], a["purpose"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"- [{a['module']}] {a['screen']}: {a['purpose']}")
    return "\n".join(lines)


def build() -> str:
    guide = GUIDE_PATH.read_text()[:6000]
    website = _website_text()
    screens = _screen_digest()
    prompt = PROMPT_TEMPLATE.format(guide=guide, website=website, screens=screens)

    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.create(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
        )
        return {"text": resp.output_text}

    result = cached("app_summary", key, _call)
    return result["text"]


if __name__ == "__main__":
    summary = build()
    OUT_PATH.write_text(summary)
    approx_tokens = len(summary.split()) * 4 // 3
    print(f"Wrote {OUT_PATH} (~{approx_tokens} tokens)\n")
    print(summary)
