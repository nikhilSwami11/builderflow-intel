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

class PainPoint(BaseModel):
    description: str
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
    builderflow_has: bool | Literal["unverified"]
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


class GrowthAdvice(BaseModel):
    recommendations: list[GrowthRecommendation] = Field(default_factory=list)


# ---- screenshots (vision pass) ----

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
