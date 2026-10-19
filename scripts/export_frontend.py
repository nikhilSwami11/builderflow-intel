"""Bundle cached pipeline output into one JSON for the Next.js frontend.

Read-only over data/cache/*.json and data/manual/competitor_pricing.yaml -- no LLM calls, no
changes to intel/. Writes frontend/data/bundle.json and copies cited screenshots to
frontend/public/screens/ (both gitignored: they derive from private/cached material).

Run: python scripts/export_frontend.py
"""
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "cache"
OUT = ROOT / "frontend" / "data" / "bundle.json"
SCREENS_OUT = ROOT / "frontend" / "public" / "screens"
PRICING_ORDER = ["builderflow", "companycam", "jobnimbus", "buildertrend", "roofr", "jobtread"]

_screen_cache: dict[str, str | None] = {}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def resolve_screen(ref: str) -> str | None:
    """Cached screenshot refs look like 'path: data/.../Screenshot ... 8.13.14\\x00AM.png'; the
    null byte stands in for macOS's narrow no-break space. Match it as 'any one char', copy the
    file under a clean name and return its public URL (None if the file is gone)."""
    if ref in _screen_cache:
        return _screen_cache[ref]
    rel = ref.removeprefix("path:").strip()
    parts = rel.split("/")
    result = None
    if len(parts) >= 2:
        folder = ROOT.joinpath(*parts[:-1])
        pattern = re.compile("^" + "".join("." if ch == "\x00" else re.escape(ch) for ch in parts[-1]) + "$")
        if folder.is_dir():
            for f in folder.iterdir():
                if pattern.match(f.name):
                    dest_name = f"{slug(folder.name)}/{slug(f.stem)}{f.suffix.lower()}"
                    dest = SCREENS_OUT / dest_name
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(f, dest)
                    result = f"/screens/{dest_name}"
                    break
    _screen_cache[ref] = result
    return result


def norm_citation(c: dict) -> dict:
    out = {"source": c["source"], "ref": c["ref"], "note": c.get("note")}
    if c["source"] == "screenshot":
        out["ref"] = c["ref"].removeprefix("path:").strip().replace("\x00", " ")
        out["image"] = resolve_screen(c["ref"])
        out["flow"] = out["ref"].split("/")[-2] if "/" in out["ref"] else None
    return out


def norm_citations(cs: list[dict]) -> list[dict]:
    return [norm_citation(c) for c in cs]


def price_range(plans: list[dict]) -> dict | None:
    """Cheapest and dearest public $/month across a company's plans, parsed from the
    hand-verified price strings. Text after a "+" ("+ $20/mo per extra user") or "(" is a
    per-seat add-on, not the plan price, so it is dropped. Custom/contact-sales plans have no
    number and are skipped; None when nothing is published."""
    lows, highs, plus = [], [], False
    for p in plans:
        head = re.split(r"\s\+\s|\(", p["price"])[0]
        nums = [int(n.replace(",", "")) for n in re.findall(r"\$([\d,]+)", head)]
        if not nums:
            continue
        lows.append(min(nums))
        highs.append(max(nums))
        plus = plus or bool(re.search(r"\$[\d,]+\+", head))
    return {"min": min(lows), "max": max(highs), "plus": plus} if lows else None


def load_pricing() -> list[dict]:
    raw = yaml.safe_load((ROOT / "data" / "manual" / "competitor_pricing.yaml").read_text())
    out = []
    for key in PRICING_ORDER:
        if key not in raw:
            continue
        co = raw[key]
        out.append(
            {
                "id": f"price-{key}",
                "key": key,
                "name": co["name"],
                "plans": [{"label": p["label"], "price": p["price"], "users": p.get("users")} for p in co["plans"]],
                "notes": co.get("notes"),
                "bestFeature": co.get("best_feature"),
                "flatUnlimited": bool(co.get("flat_unlimited_pricing")),
                "priceRange": price_range(co["plans"]),
                "citation": norm_citation(co["citation"]),
            }
        )
    return out


def link_evidence(evidence: list[str], gap, pains, messaging, pricing) -> list[dict]:
    """Evidence strings are written in four fixed shapes by growth_advisor; match each back to
    the row it came from by exact feature / description / topic / company. Unmatched strings are
    kept as plain-text evidence (kind 'note') rather than dropped."""
    gap_by_feature = {g["feature"]: g for g in gap}
    pain_by_desc = {p["description"]: p for p in pains}
    msg_by_topic = {m["topic"]: m for m in messaging}
    price_by_name = {p["name"].lower(): p for p in pricing}
    links, seen = [], set()
    for e in evidence:
        link = None
        if m := re.match(r'Gap matrix: "(.+)" \(', e):
            if row := gap_by_feature.get(m.group(1)):
                link = {"kind": "gap", "id": row["id"], "label": row["feature"]}
        elif m := re.match(r"Messaging inconsistency -- (.+?):", e):
            if row := msg_by_topic.get(m.group(1)):
                link = {"kind": "messaging", "id": row["id"], "label": row["topic"]}
        elif m := re.match(r"Pricing -- (.+?):", e):
            if row := price_by_name.get(m.group(1).lower()):
                link = {"kind": "pricing", "id": row["id"], "label": row["name"]}
        elif m := re.match(r"Pain point \([^)]*\): (.+)", e):
            if row := pain_by_desc.get(m.group(1).strip()):
                link = {"kind": "pain", "id": row["id"], "label": row["description"]}
        link = link or {"kind": "note", "id": None, "label": e}
        key = (link["kind"], link["id"] or link["label"])
        if key not in seen:
            seen.add(key)
            links.append(link)
    return links


def main() -> None:
    analysis = json.loads((CACHE / "analysis_result.json").read_text())
    growth = json.loads((CACHE / "growth_advice.json").read_text())
    market = json.loads((CACHE / "market_insights.json").read_text())

    gap = [
        {
            "id": f"gap-{i}",
            "feature": g["feature"],
            "tier": g["tier"],
            "builderflowHas": g["builderflow_has"],
            "competitors": g["competitors_with_it"],
            "citations": norm_citations(g["citations"]),
        }
        for i, g in enumerate(analysis["gap_matrix"])
    ]
    pains = [
        {
            "id": f"pain-{i}",
            "description": p["description"],
            "theme": p["theme"],
            "companies": p["affected_companies"],
            "citation": norm_citation(p["citation"]),
        }
        for i, p in enumerate(market["pain_points"])
    ]
    messaging = [
        {
            "id": f"msg-{i}",
            "topic": m["topic"],
            "websiteSays": m.get("website_says"),
            "portalSays": m.get("portal_says"),
            "guideSays": m.get("guide_says"),
            "citations": norm_citations(m["citations"]),
        }
        for i, m in enumerate(analysis["messaging_inconsistencies"])
    ]
    pricing = load_pricing()
    recs = [
        {
            "id": f"rec-{i}",
            "title": r["title"],
            "detail": r["detail"],
            "category": r["category"],
            "citations": norm_citations(r["citations"]),
            "evidence": link_evidence(r["evidence"], gap, pains, messaging, pricing),
        }
        for i, r in enumerate(growth["recommendations"])
    ]

    bundle = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "appSummary": (ROOT / "data" / "app_summary.md").read_text(),
        "gapMatrix": gap,
        "painPoints": pains,
        "trends": [{"description": t["description"], "citation": norm_citation(t["citation"])} for t in market["trends"]],
        "reviewSnippets": norm_citations(market["review_snippets"]),
        "messaging": messaging,
        "pricing": pricing,
        "recommendations": recs,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, indent=2, ensure_ascii=False))

    linked = sum(1 for r in recs for e in r["evidence"] if e["kind"] != "note")
    notes = sum(1 for r in recs for e in r["evidence"] if e["kind"] == "note")
    shots = [v for v in _screen_cache.values()]
    print(f"wrote {OUT.relative_to(ROOT)}: {len(gap)} gap rows, {len(pains)} pain points, "
          f"{len(recs)} recommendations")
    print(f"evidence links: {linked} matched, {notes} unmatched (kept as notes)")
    print(f"screenshots: {sum(1 for v in shots if v)} copied, {sum(1 for v in shots if not v)} missing")


if __name__ == "__main__":
    main()
