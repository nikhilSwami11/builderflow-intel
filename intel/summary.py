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
tool. HARD LIMIT: 2200 tokens (~1600 words) -- stop well short of that, do not pad to fill it.
Base it ONLY on the guide, website, and screenshot analyses below -- do not invent features
or modules not evidenced in this material.

Source of truth: the USER GUIDE below decides what Builderflow offers and how it works. The
screenshots are only references that illustrate guide features. They were captured from a brand-new
account with no data, so an empty screen or an "add" button is normal and says NOTHING about whether
a feature is complete -- if the guide explains a feature, it is a working feature. The website and any
portal note are marketing/status text: report them, flag where they disagree with the guide, but never
let them override the guide. Mark a feature as not yet available ONLY if the guide itself says so
("coming soon", pilot-only, cannot be created yet).

Include a section "Guide coverage": a compact list of every module/feature the guide explains
(with the guide chapter or step), a list of what the guide itself says is coming soon or limited,
and a list of features the website or screenshots show that the guide does NOT cover.

Output only the summary itself: no preamble, and no closing offers or questions to the reader.

Cover, briefly: what Builderflow is, its modules/features (what's live vs what's rolling out
next, per the portal vs the guide vs the website -- flag any mismatch rather than picking one),
who it's for, and its core workflow as a compact numbered list (not one paragraph per step).
Be dense and specific, not marketing copy. Cut anything not load-bearing for an LLM reasoning
about gaps and positioning -- no security/compliance boilerplate, no restated role lists.

=== USER GUIDE (data/builderflow_guide.md, complete) ===
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
    guide = GUIDE_PATH.read_text()
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
