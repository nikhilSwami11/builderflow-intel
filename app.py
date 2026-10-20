"""Streamlit entry point.

Reads only cached, already-structured pipeline output (data/cache/*.json) -- no LLM calls
happen from the UI. Every insight keeps its citations; this file's only job is to render them
legibly, grouped the way CLAUDE.md's tab list implies (tier, theme, category) rather than as
flat lists.
"""
import json
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
import streamlit as st
import yaml

ANALYSIS_PATH = Path("data/cache/analysis_result.json")
GROWTH_PATH = Path("data/cache/growth_advice.json")
MARKET_PATH = Path("data/cache/market_insights.json")
APP_SUMMARY_PATH = Path("data/app_summary.md")
MANUAL_PRICING_PATH = Path("data/manual/competitor_pricing.yaml")
# Builderflow first (house brand, shown as the reference column), then the 3 competitors the
# rest of the pipeline analyzes (CLAUDE.md's default scope), then the 2 extras.
PRICING_ORDER = ["builderflow", "companycam", "jobnimbus", "buildertrend", "roofr", "jobtread"]

TIER_ORDER = ["table_stakes", "differentiator", "emerging"]
TIER_LABEL = {
    "table_stakes": "Table stakes",
    "differentiator": "Differentiator",
    "emerging": "Emerging",
}
HAS_LABEL = {
    "yes": "✅ Have it",
    "partial": "🟡 Partial / rolling out",
    "no": "❌ Don't have it",
    "claimed": "🔵 Claimed on website",
    "unverified": "⚪ Unverified",
}
THEME_LABEL = {
    "pricing_transparency": "Pricing transparency",
    "support": "Support",
    "mobile_reliability": "Mobile reliability",
    "data_integrity": "Data integrity",
    "onboarding": "Onboarding",
    "integrations": "Integrations",
    "automation_rigidity": "Automation rigidity",
    "feature_depth": "Feature depth",
    "tool_fragmentation": "Tool fragmentation",
    "adoption": "Adoption",
    "other": "Other",
}
CATEGORY_ORDER = ["quick_win", "build", "double_down", "positioning", "pricing"]
CATEGORY_LABEL = {
    "quick_win": "⚡ Quick wins",
    "build": "🛠️ Build",
    "double_down": "💪 Double down",
    "positioning": "🎯 Positioning",
    "pricing": "💲 Pricing",
}


@st.cache_data
def load_json(path: str) -> dict:
    return json.loads(Path(path).read_text())


@st.cache_data
def load_text(path: str) -> str:
    return Path(path).read_text()


@st.cache_data
def load_yaml(path: str) -> dict:
    return yaml.safe_load(Path(path).read_text())


def esc(text: str) -> str:
    """Streamlit's markdown renderer treats $...$ as inline LaTeX (KaTeX) -- any text with two
    dollar amounts in it (e.g. "$63/mo, Crew $119/mo") otherwise renders as mangled math
    instead of plain text. Escape every "$" before handing free-form text to st.markdown/write."""
    return (text or "").replace("$", "\\$")


def render_citations(citations: list[dict], key_prefix: str) -> None:
    """Links for website/search citations inline; screenshot citations get a toggle-able
    thumbnail instead of a bare unopenable file path."""
    if not citations:
        return
    links, shots, other = [], [], []
    for c in citations:
        if c["source"] in ("website", "search"):
            links.append(c)
        elif c["source"] == "screenshot":
            shots.append(c)
        else:
            other.append(c)

    if links:
        st.caption(" · ".join(f"[{c['source']}]({c['ref']})" for c in links))
    if other:
        st.caption(" · ".join(f"{c['source']}: {c['ref']}" + (f" — {c['note']}" if c.get("note") else "") for c in other))
    if shots:
        with st.expander(f"📷 {len(shots)} screenshot{'s' if len(shots) != 1 else ''}"):
            cols = st.columns(min(len(shots), 3))
            for i, c in enumerate(shots):
                with cols[i % len(cols)]:
                    p = Path(c["ref"])
                    if p.exists():
                        st.image(str(p), caption=c.get("note") or p.name, use_container_width=True)
                    else:
                        st.caption(f"(missing: {c['ref']})")


def tab_overview(analysis: dict, growth: dict, market: dict):
    st.subheader("Where Builderflow stands, in one screen")
    gap_matrix = analysis["gap_matrix"]
    risks = [g for g in gap_matrix if g["tier"] == "table_stakes" and g["builderflow_has"] in ("no", "partial", "claimed")]
    strengths = [g for g in gap_matrix if g["tier"] == "differentiator" and g["builderflow_has"] == "yes"]
    by_cat = defaultdict(list)
    for r in growth["recommendations"]:
        by_cat[r["category"]].append(r)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Table-stakes gaps", len(risks))
    c2.metric("Clear differentiators", len(strengths))
    c3.metric("Themed pain points", len(market["pain_points"]))
    c4.metric("Growth recommendations", len(growth["recommendations"]))

    col_risk, col_strength = st.columns(2)
    with col_risk:
        st.markdown("**Biggest risks** (table-stakes, missing or partial)")
        if not risks:
            st.caption("None -- Builderflow covers every table-stakes row.")
        for g in risks[:5]:
            st.markdown(f"- {HAS_LABEL[g['builderflow_has']]} — **{g['feature']}**")
    with col_strength:
        st.markdown("**Strengths to double down on** (differentiator, already have)")
        if not strengths:
            st.caption("None found.")
        for g in strengths[:5]:
            st.markdown(f"- **{g['feature']}** — competitors with it: {', '.join(g['competitors_with_it']) or 'none'}")

    st.markdown("**Quick wins**")
    for r in by_cat.get("quick_win", [])[:3]:
        st.markdown(f"- **{r['title']}** — {r['detail']}")

    with st.expander("About Builderflow (app_summary.md, grounds every tab)"):
        st.markdown(load_text(str(APP_SUMMARY_PATH)))


def tab_gap_matrix(analysis: dict):
    st.subheader("Feature gap matrix")
    st.caption("Tier is computed from how many of the 3 competitors have each feature -- not left to per-row judgment.")
    gap_matrix = analysis["gap_matrix"]
    for tier in TIER_ORDER:
        rows = [g for g in gap_matrix if g["tier"] == tier]
        if not rows:
            continue
        risk_first = sorted(rows, key=lambda g: {"no": 0, "partial": 1, "claimed": 2, "unverified": 3, "yes": 4}[g["builderflow_has"]])
        st.markdown(f"### {TIER_LABEL[tier]} ({len(rows)})")
        for g in risk_first:
            with st.expander(f"{HAS_LABEL[g['builderflow_has']]} — {g['feature']}"):
                st.markdown(f"Competitors with it: {', '.join(g['competitors_with_it']) or '_none_'}")
                render_citations(g["citations"], key_prefix=g["feature"])


def _pricing_table(company: dict) -> pd.DataFrame:
    rows = [{"Plan": p["label"], "Price": p["price"], "Users": p.get("users", "--")} for p in company["plans"]]
    return pd.DataFrame(rows).set_index("Plan")


def tab_pricing(analysis: dict, pricing: dict):
    st.subheader("Pricing comparison")
    st.caption(
        "Hand-verified from each company's public pricing page, not LLM-extracted -- dollar "
        "figures need to be exact. AI is still used for features, positioning and messaging below."
    )

    companies = [pricing[k] for k in PRICING_ORDER if k in pricing]
    for row_start in range(0, len(companies), 2):
        cols = st.columns(2)
        for col, company in zip(cols, companies[row_start : row_start + 2]):
            with col:
                st.markdown(f"#### {company['name']}")
                st.table(_pricing_table(company))
                if company.get("notes"):
                    st.caption(esc(company["notes"]))
                if company.get("best_feature"):
                    st.markdown(f"**Best at:** {esc(company['best_feature'])}")
                render_citations([company["citation"]], key_prefix=company["name"])

    st.divider()
    st.subheader("Messaging inconsistencies")
    st.caption("Where Builderflow's own website, portal and guide disagree -- flagged, not resolved for you.")
    for m in analysis["messaging_inconsistencies"]:
        with st.expander(m["topic"]):
            if m.get("website_says"):
                st.markdown(f"**Website says:** {esc(m['website_says'])}")
            if m.get("portal_says"):
                st.markdown(f"**Portal says:** {esc(m['portal_says'])}")
            if m.get("guide_says"):
                st.markdown(f"**Guide says:** {esc(m['guide_says'])}")
            render_citations(m["citations"], key_prefix=m["topic"])


def tab_pain_points(market: dict):
    st.subheader("Market trends")
    for t in market["trends"]:
        st.markdown(f"- {t['description']}")
        render_citations([t["citation"]], key_prefix=t["description"][:40])

    st.divider()
    st.subheader("Contractor pain points, grouped by theme")
    by_theme = defaultdict(list)
    for p in market["pain_points"]:
        by_theme[p["theme"]].append(p)
    for theme, pts in sorted(by_theme.items(), key=lambda kv: -len(kv[1])):
        st.markdown(f"### {THEME_LABEL.get(theme, theme)} ({len(pts)})")
        for p in pts:
            who = ", ".join(p["affected_companies"]) if p["affected_companies"] else "industry-wide"
            with st.expander(f"({who}) {p['description'][:90]}"):
                st.write(p["description"])
                render_citations([p["citation"]], key_prefix=p["description"][:40])

    if market.get("review_snippets"):
        st.divider()
        st.subheader("Review snippets")
        for r in market["review_snippets"]:
            st.markdown(f"- [{r['ref']}]({r['ref']})" + (f" — {r['note']}" if r.get("note") else ""))


def tab_growth_advisor(growth: dict, analysis: dict, market: dict):
    st.subheader("Growth advisor recommendations")
    st.caption("Every recommendation below is grounded in the signals summarized here first.")

    snap1, snap2 = st.columns(2)
    with snap1:
        st.markdown("**Gap matrix, by tier**")
        tier_counts = Counter(g["tier"] for g in analysis["gap_matrix"])
        st.bar_chart(
            pd.DataFrame(
                {"features": [tier_counts.get(t, 0) for t in TIER_ORDER]},
                index=[TIER_LABEL[t] for t in TIER_ORDER],
            )
        )
    with snap2:
        st.markdown("**Contractor pain points, by theme**")
        theme_counts = Counter(p["theme"] for p in market["pain_points"])
        ordered = sorted(theme_counts.items(), key=lambda kv: -kv[1])
        st.bar_chart(
            pd.DataFrame(
                {"mentions": [c for _, c in ordered]},
                index=[THEME_LABEL.get(t, t) for t, _ in ordered],
            )
        )

    st.divider()
    by_cat = defaultdict(list)
    for r in growth["recommendations"]:
        by_cat[r["category"]].append(r)
    for cat in CATEGORY_ORDER:
        recs = by_cat.get(cat, [])
        if not recs:
            continue
        st.markdown(f"### {CATEGORY_LABEL[cat]} ({len(recs)})")
        for r in recs:
            with st.expander(r["title"]):
                st.write(r["detail"])
                if r.get("evidence"):
                    st.markdown("**Backed by:**")
                    for e in r["evidence"]:
                        st.markdown(f"- {e}")
                render_citations(r["citations"], key_prefix=r["title"][:40])


def tab_chat():
    from intel.rag import answer as rag_answer

    st.subheader("Chat")
    st.caption("RAG over the guide, website, screenshots, market insights and every analysis/growth finding -- with a live search fallback when retrieval is weak.")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    for turn in st.session_state.chat_history:
        with st.chat_message(turn["role"]):
            st.write(turn["content"])
            if turn.get("used_live_search"):
                st.caption("🔎 Augmented with a live web search (retrieval alone wasn't a strong match)")
            if turn.get("citations"):
                render_citations(turn["citations"], key_prefix=f"chat-{len(st.session_state.chat_history)}")

    question = st.chat_input("Ask a growth question")
    if question:
        st.session_state.chat_history.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.write(question)
        with st.chat_message("assistant"):
            with st.spinner("Retrieving and reasoning..."):
                result = rag_answer(question)
            st.write(result.answer)
            if result.used_live_search:
                st.caption("🔎 Augmented with a live web search (retrieval alone wasn't a strong match)")
            citations = [c.model_dump() for c in result.citations]
            render_citations(citations, key_prefix=f"chat-live-{len(st.session_state.chat_history)}")
        st.session_state.chat_history.append(
            {
                "role": "assistant",
                "content": result.answer,
                "used_live_search": result.used_live_search,
                "citations": citations,
            }
        )


def main():
    st.set_page_config(page_title="Builderflow Growth Intelligence", layout="wide")
    st.title("Builderflow Growth Intelligence")

    missing = [p for p in (ANALYSIS_PATH, GROWTH_PATH, MARKET_PATH) if not p.exists()]
    if missing:
        st.error(
            "Missing cached pipeline output: " + ", ".join(str(m) for m in missing)
            + ". Run `python -m intel.graph` (or the individual node modules) first."
        )
        st.stop()
    if not Path("data/cache/chroma").exists():
        st.warning("Chat index not built yet -- run `python -m intel.rag` to enable the Chat tab.")

    analysis = load_json(str(ANALYSIS_PATH))
    growth = load_json(str(GROWTH_PATH))
    market = load_json(str(MARKET_PATH))
    pricing_data = load_yaml(str(MANUAL_PRICING_PATH))

    overview, gap, pricing, pain, advisor, chat = st.tabs(
        ["Overview", "Gap Matrix", "Pricing", "Pain Points & Market", "Growth Advisor", "Chat"]
    )
    with overview:
        tab_overview(analysis, growth, market)
    with gap:
        tab_gap_matrix(analysis)
    with pricing:
        tab_pricing(analysis, pricing_data)
    with pain:
        tab_pain_points(market)
    with advisor:
        tab_growth_advisor(growth, analysis, market)
    with chat:
        tab_chat()


if __name__ == "__main__":
    main()
