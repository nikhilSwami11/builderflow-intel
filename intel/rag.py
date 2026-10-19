"""Chroma ingest + retrieval over everything the pipeline has produced -- guide, website,
screenshots, market insights, gap matrix / pricing / messaging, growth advice -- plus a
chat answer() with citation-by-id resolution and a live-search fallback when retrieval is
weak.

Ingest reads already-computed JSON (data/cache/{market,analysis,growth_advice}.json), not
live pipeline calls -- this file never triggers new LLM work for anything upstream of chat
itself. Chunk ids are a stable hash of (kind, text) so re-running ingest() is an idempotent
upsert: no duplicates, no need to wipe the collection first, and unchanged chunks cost
nothing to re-embed since Chroma's upsert on an identical id+document is a no-op write.
"""
import hashlib
import json
import os
import re
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

from intel.cache import cached
from intel.citations import CitationIndex
from intel.config import EMBEDDING_MODEL, MINI_MODEL, client
from intel.schemas import AnalysisResult, ChatAnswer, ChatAnswerDraft, Citation, GrowthAdvice, MarketInsights

CHROMA_DIR = "data/cache/chroma"
COLLECTION_NAME = "builderflow_intel"

GUIDE_PATH = Path("data/builderflow_guide.md")
WEBSITE_DIR = Path("data/builderflow_site")
SCREEN_ANALYSES_PATH = Path("data/cache/screen_analyses.json")
MARKET_PATH = Path("data/cache/market_insights.json")
ANALYSIS_PATH = Path("data/cache/analysis_result.json")
GROWTH_PATH = Path("data/cache/growth_advice.json")
APP_SUMMARY_PATH = Path("data/app_summary.md")

TOP_K = 8
# Cosine distance above this means the best retrieved chunk is too weak to trust alone --
# fall back to a live search rather than let the model answer from a poor match. Calibrated
# against real queries in this repo (on-topic questions land <0.4, off-topic >0.5).
FALLBACK_DISTANCE = 0.45

_HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")
_HTML_COMMENT_SRC_RE = re.compile(r"<!--\s*source:\s*(\S+)")
_YAML_URL_RE = re.compile(r"^url:\s*(\S+)", re.MULTILINE)


def _collection():
    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=os.environ["OPENAI_API_KEY"], model_name=EMBEDDING_MODEL
    )
    c = chromadb.PersistentClient(path=CHROMA_DIR)
    return c.get_or_create_collection(
        COLLECTION_NAME, embedding_function=ef, metadata={"hnsw:space": "cosine"}
    )


def _mk_chunk(kind: str, text: str, citations: list[Citation], **extra) -> tuple[str, str, dict]:
    ident = hashlib.sha256(f"{kind}:{text}".encode()).hexdigest()
    meta = {"kind": kind, "citations_json": json.dumps([c.model_dump() for c in citations])}
    meta.update({k: str(v) for k, v in extra.items() if v is not None})
    return ident, text, meta


def _chunk_by_headings(text: str) -> list[tuple[str, str]]:
    """One chunk per heading's direct body text (up to the next heading, any level) --
    headings that only contain subheadings (no direct body) contribute no chunk."""
    stack: list[tuple[int, str]] = []
    current_path = ""
    buf: list[str] = []
    chunks: list[tuple[str, str]] = []

    def flush():
        body = "\n".join(buf).strip()
        if current_path and body:
            chunks.append((current_path, body))

    for line in text.splitlines():
        m = _HEADING_RE.match(line)
        if m:
            flush()
            buf = []
            level = len(m.group(1))
            title = m.group(2).strip()
            stack = stack[: level - 1] + [(level, title)]
            current_path = " > ".join(t for _, t in stack)
        else:
            buf.append(line)
    flush()
    return chunks


def _chunk_by_words(text: str, size: int = 900, overlap: int = 150) -> list[str]:
    words = text.split()
    if len(words) <= size:
        return [text] if words else []
    out, i = [], 0
    while i < len(words):
        out.append(" ".join(words[i : i + size]))
        i += size - overlap
    return out


def _guide_chunks() -> list[tuple]:
    out = []
    for path, body in _chunk_by_headings(GUIDE_PATH.read_text()):
        segs = path.split(" > ")
        citation = Citation(source="guide", ref=path)
        out.append(
            _mk_chunk(
                "guide", f"{path}\n\n{body}", [citation],
                module=segs[0] if segs else None,
                feature=segs[1] if len(segs) > 1 else None,
                section=segs[-1],
            )
        )
    return out


def _website_url(raw: str) -> str:
    m = _HTML_COMMENT_SRC_RE.search(raw)
    if m:
        return m.group(1)
    m = _YAML_URL_RE.search(raw)
    if m:
        return m.group(1)
    return "https://builderflow.app/"


def _strip_frontmatter(raw: str) -> str:
    lines = raw.splitlines()
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                return "\n".join(lines[i + 1 :]).lstrip()
        return raw
    if lines and lines[0].strip().startswith("<!--"):
        return "\n".join(lines[1:]).lstrip()
    return raw


def _website_chunks() -> list[tuple]:
    out = []
    for f in sorted(WEBSITE_DIR.glob("*.md")):
        raw = f.read_text()
        url = _website_url(raw)
        body = _strip_frontmatter(raw)
        heading_chunks = _chunk_by_headings(body)
        if heading_chunks:
            for path, chunk_body in heading_chunks:
                citation = Citation(source="website", ref=url, note=path)
                out.append(_mk_chunk("website", f"{path}\n\n{chunk_body}", [citation], page=f.stem))
        else:
            for chunk_text in _chunk_by_words(body):
                citation = Citation(source="website", ref=url)
                out.append(_mk_chunk("website", chunk_text, [citation], page=f.stem))
    return out


def _screenshot_chunks() -> list[tuple]:
    if not SCREEN_ANALYSES_PATH.exists():
        return []
    out = []
    for a in json.loads(SCREEN_ANALYSES_PATH.read_text()):
        text = (
            f"[{a.get('module')}] {a['screen']}: {a['purpose']}\n"
            f"Navigation: {a.get('navigation') or 'n/a'}\n"
            f"Components: {', '.join(a.get('components') or [])}\n"
            f"Actions: {', '.join(a.get('actions') or [])}\n"
            f"Data fields: {', '.join(a.get('data_fields') or [])}\n"
            f"UX notes: {a.get('ux_notes') or 'n/a'}\n"
            f"Status: {a['status']}"
        )
        citation = Citation(source="screenshot", ref=a["image_path"], note=a["screen"])
        out.append(_mk_chunk("screenshot", text, [citation], module=a.get("module"), flow=a.get("flow")))
    return out


def _market_chunks(market: MarketInsights) -> list[tuple]:
    out = []
    for t in market.trends:
        out.append(_mk_chunk("market_trend", f"Market trend: {t.description}", [t.citation]))
    for p in market.pain_points:
        who = ", ".join(p.affected_companies) if p.affected_companies else "industry-wide"
        out.append(
            _mk_chunk(
                "market_pain_point", f"Contractor pain point ({p.theme}, {who}): {p.description}",
                [p.citation], theme=p.theme,
            )
        )
    for r in market.review_snippets:
        out.append(_mk_chunk("review_snippet", f"Review snippet: {r.note or r.ref}", [r]))
    return out


def _analysis_chunks(analysis: AnalysisResult) -> list[tuple]:
    out = []
    for g in analysis.gap_matrix:
        text = (
            f"Gap matrix -- {g.feature} ({g.tier}): Builderflow has={g.builderflow_has}. "
            f"Competitors with it: {', '.join(g.competitors_with_it) or 'none'}."
        )
        out.append(_mk_chunk("gap_matrix", text, g.citations, feature=g.feature, tier=g.tier))
    for p in analysis.pricing_comparison:
        out.append(_mk_chunk("pricing_comparison", f"Pricing -- {p.company}: {p.summary}", [p.citation], company=p.company))
    for m in analysis.messaging_inconsistencies:
        text = (
            f"Messaging inconsistency -- {m.topic}. Website says: {m.website_says or 'n/a'}. "
            f"Portal says: {m.portal_says or 'n/a'}. Guide says: {m.guide_says or 'n/a'}."
        )
        out.append(_mk_chunk("messaging_inconsistency", text, m.citations, topic=m.topic))
    return out


def _growth_chunks(growth: GrowthAdvice) -> list[tuple]:
    return [
        _mk_chunk("growth_recommendation", f"[{r.category}] {r.title}: {r.detail}", r.citations, category=r.category)
        for r in growth.recommendations
    ]


def ingest() -> int:
    analysis = AnalysisResult(**json.loads(ANALYSIS_PATH.read_text()))
    market = MarketInsights(**json.loads(MARKET_PATH.read_text()))
    growth = GrowthAdvice(**json.loads(GROWTH_PATH.read_text()))

    chunks = (
        _guide_chunks() + _website_chunks() + _screenshot_chunks()
        + _market_chunks(market) + _analysis_chunks(analysis) + _growth_chunks(growth)
    )
    col = _collection()
    ids = [c[0] for c in chunks]
    docs = [c[1] for c in chunks]
    metas = [c[2] for c in chunks]
    BATCH = 100
    for i in range(0, len(ids), BATCH):
        col.upsert(ids=ids[i : i + BATCH], documents=docs[i : i + BATCH], metadatas=metas[i : i + BATCH])
    return len(chunks)


def retrieve(query: str, k: int = TOP_K) -> list[dict]:
    col = _collection()
    res = col.query(query_texts=[query], n_results=k)
    hits = []
    if not res["documents"] or not res["documents"][0]:
        return hits
    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        citations = [Citation(**c) for c in json.loads(meta["citations_json"])]
        hits.append({"text": doc, "citations": citations, "distance": dist, "kind": meta.get("kind")})
    return hits


def _live_search(query: str) -> list[dict]:
    def _call():
        from tavily import TavilyClient

        tv = TavilyClient()
        resp = tv.search(query, max_results=5, search_depth="basic")
        return [
            {"title": r.get("title", ""), "url": r["url"], "content": r.get("content", "")[:1200]}
            for r in resp.get("results", [])
        ]

    return cached("chat_live_search", query, _call)


PROMPT_TEMPLATE = """You are Builderflow's growth-intelligence chat assistant. Builderflow is
a smaller lead-management/CRM tool for remodelers and contractors, competing against
CompanyCam, JobNimbus and Buildertrend. Answer the question using ONLY the retrieved context
below -- don't invent facts beyond it. Every context line carries a [Cn] citation id; cite
every claim you make by including its id(s) in citation_ids. Do not invent ids. If the
context doesn't actually answer the question, say so plainly ("not found in our data")
rather than guessing.

=== BUILDERFLOW APP SUMMARY (background context only -- cite the retrieved lines below, not this) ===
{app_summary}

=== RETRIEVED CONTEXT ===
{context}

=== QUESTION ===
{question}
"""


def answer(question: str) -> ChatAnswer:
    hits = retrieve(question)
    used_live_search = not hits or hits[0]["distance"] > FALLBACK_DISTANCE
    if used_live_search:
        for r in _live_search(question):
            hits.append(
                {
                    "text": f"{r['title']}\n{r['content']}",
                    "citations": [Citation(source="search", ref=r["url"], note=r["title"])],
                    "distance": 0.0,
                    "kind": "live_search",
                }
            )

    idx = CitationIndex()
    context = "\n\n".join(f"- ({h['kind']}) {h['text'][:800]} {idx.tag(h['citations'])}" for h in hits)
    app_summary = APP_SUMMARY_PATH.read_text()
    prompt = PROMPT_TEMPLATE.format(app_summary=app_summary, context=context, question=question)
    key = hashlib.sha256(prompt.encode()).hexdigest()

    def _call():
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=ChatAnswerDraft,
        )
        return resp.output_parsed.model_dump()

    draft = ChatAnswerDraft(**cached("chat_answer", key, _call))
    return ChatAnswer(answer=draft.answer, citations=idx.resolve(draft.citation_ids), used_live_search=used_live_search)


if __name__ == "__main__":
    n = ingest()
    print(f"Indexed {n} chunks into Chroma at {CHROMA_DIR}")
