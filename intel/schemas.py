"""Pydantic models for every structured LLM output in the pipeline.

Every insight-bearing model carries its own source(s) so UI and chat can cite them.
"""
from typing import Literal

from pydantic import BaseModel, Field

Source = Literal["guide", "website", "screenshot", "search", "manual"]


class Citation(BaseModel):
    source: Source
    ref: str  # URL, chunk id, or image path
    note: str | None = None


# ---- collect ----

class CollectedPage(BaseModel):
    company: str  # "builderflow" or competitor name
    url: str
    fetched_at: str
    raw_text: str
    blocked: bool = False


# ---- extract ----

class PricingTier(BaseModel):
    name: str
    price: str | None = None  # keep as string, pricing pages are inconsistent
    billing_period: str | None = None
    included_features: list[str] = Field(default_factory=list)
    citation: Citation


class CompetitorProfile(BaseModel):
    company: str
    features: list[str] = Field(default_factory=list)
    pricing_tiers: list[PricingTier] = Field(default_factory=list)
    target_customer: str | None = None
    positioning: str | None = None
    citations: list[Citation] = Field(default_factory=list)


# ---- market ----

PainPointTheme = Literal[
    "pricing_transparency",
    "support",
    "mobile_reliability",
    "data_integrity",  # data loss, merge bugs, export problems
    "onboarding",  # setup, training, learning curve
    "integrations",
    "automation_rigidity",
    "feature_depth",  # missing/shallow features (estimating, reporting, profit tracking, etc.)
    "tool_fragmentation",  # need multiple stitched-together tools
    "adoption",  # low adoption / unclear ROI
    "other",
]


class PainPoint(BaseModel):
    description: str
    theme: PainPointTheme
    affected_companies: list[str] = Field(default_factory=list)
    citation: Citation


class MarketTrend(BaseModel):
    description: str
    citation: Citation


class MarketInsights(BaseModel):
    trends: list[MarketTrend] = Field(default_factory=list)
    pain_points: list[PainPoint] = Field(default_factory=list)
    review_snippets: list[Citation] = Field(default_factory=list)


# ---- analyze ----

class GapMatrixEntry(BaseModel):
    feature: str
    tier: Literal["table_stakes", "differentiator", "emerging"]
    builderflow_has: Literal["yes", "no", "partial", "unverified"]
    competitors_with_it: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)


class PricingComparisonEntry(BaseModel):
    company: str
    summary: str
    citation: Citation


class MessagingInconsistency(BaseModel):
    topic: str
    website_says: str | None = None
    portal_says: str | None = None
    guide_says: str | None = None
    citations: list[Citation] = Field(default_factory=list)


class GapMatrixResult(BaseModel):
    """Call-shaped wrapper for the dedicated gap-matrix extraction call."""

    entries: list[GapMatrixEntry] = Field(default_factory=list)


class MessagingResult(BaseModel):
    """Call-shaped wrapper for the messaging-inconsistency call. Pricing comparison isn't an
    LLM call at all anymore -- see analyze.py -- so this only wraps messaging_inconsistencies."""

    messaging_inconsistencies: list[MessagingInconsistency] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    gap_matrix: list[GapMatrixEntry] = Field(default_factory=list)
    pricing_comparison: list[PricingComparisonEntry] = Field(default_factory=list)
    top_pain_points: list[PainPoint] = Field(default_factory=list)
    messaging_inconsistencies: list[MessagingInconsistency] = Field(default_factory=list)


# ---- growth_advisor ----

class GrowthRecommendation(BaseModel):
    title: str
    detail: str
    category: Literal["build", "double_down", "positioning", "pricing", "quick_win"]
    citations: list[Citation] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)  # plain-English facts this traces back to


class GrowthAdvice(BaseModel):
    recommendations: list[GrowthRecommendation] = Field(default_factory=list)


class GrowthRecommendationDraft(BaseModel):
    """Call-shaped draft: cites by short id into a pre-built index instead of retyping a
    Citation's exact ref (e.g. an image path) -- models reliably point to an id, not retype
    a long/unusual string verbatim."""

    title: str
    detail: str
    category: Literal["build", "double_down", "positioning", "pricing", "quick_win"]
    citation_ids: list[str] = Field(default_factory=list)


class GrowthAdviceDraft(BaseModel):
    recommendations: list[GrowthRecommendationDraft] = Field(default_factory=list)


# ---- chat (RAG) ----

class ChatAnswerDraft(BaseModel):
    """Call-shaped draft: cites by short id into a retrieval-built index, same reasoning as
    GrowthRecommendationDraft."""

    answer: str
    citation_ids: list[str] = Field(default_factory=list)


class ChatAnswer(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    used_live_search: bool = False


# ---- screenshots (vision pass) ----

class ScreenVisionOutput(BaseModel):
    """What the LLM fills in from pixels alone; image_path/flow/module/step are added after."""

    screen: str
    purpose: str
    navigation: str | None = None
    components: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    data_fields: list[str] = Field(default_factory=list)
    status: Literal["observed", "inferred", "unverified"]
    ux_notes: str | None = None


class ScreenAnalysis(BaseModel):
    image_path: str
    flow: str  # folder name
    module: str | None = None
    step: int | None = None
    screen: str
    purpose: str
    navigation: str | None = None
    components: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    data_fields: list[str] = Field(default_factory=list)
    status: Literal["observed", "inferred", "unverified"]
    ux_notes: str | None = None


# ---- flow map (optional extra) ----

class FlowMapEntry(BaseModel):
    module: str
    flow: str
    purpose: str
    screens: list[str] = Field(default_factory=list)
    steps: list[str] | None = None
    order_inferred: bool = False
    gaps_or_dead_ends: str | None = None
