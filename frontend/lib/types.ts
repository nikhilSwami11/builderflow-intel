// Mirrors the bundle written by scripts/export_frontend.py. Keep the two in step.

export type CitationSource = "guide" | "website" | "screenshot" | "search" | "manual";

export type Citation = {
  source: CitationSource;
  ref: string;
  note: string | null;
  /** screenshots only: public URL of the copied image (null if the file is gone) */
  image?: string | null;
  /** screenshots only: the Builderflow flow folder the image came from */
  flow?: string | null;
};

export type Tier = "table_stakes" | "differentiator" | "emerging";
export type Has = "yes" | "partial" | "no" | "unverified";

export type GapRow = {
  id: string;
  feature: string;
  tier: Tier;
  builderflowHas: Has;
  competitors: string[];
  citations: Citation[];
};

export type PainTheme =
  | "pricing_transparency"
  | "support"
  | "mobile_reliability"
  | "data_integrity"
  | "onboarding"
  | "integrations"
  | "automation_rigidity"
  | "feature_depth"
  | "tool_fragmentation"
  | "adoption"
  | "other";

export type PainPoint = {
  id: string;
  description: string;
  theme: PainTheme;
  companies: string[];
  citation: Citation;
};

export type Trend = {
  id: string;
  description: string;
  citation: Citation;
  /** article headline (og:title) and a locally saved preview image, when the site allows it */
  title: string | null;
  image: string | null;
};

export type NewsItem = {
  id: string;
  feed: "industry" | "ai";
  title: string;
  url: string;
  host: string;
  /** ISO date, null when the source gave none */
  published: string | null;
  summary: string;
  /** AI feed only: a concrete way Builderflow could apply the story */
  builderflowUse: string | null;
  image: string | null;
};

export type Messaging = {
  id: string;
  topic: string;
  websiteSays: string | null;
  portalSays: string | null;
  guideSays: string | null;
  citations: Citation[];
};

export type PricingCompany = {
  id: string;
  key: string;
  name: string;
  plans: { label: string; price: string; users: string | null }[];
  notes: string | null;
  bestFeature: string | null;
  flatUnlimited: boolean;
  /** cheapest and dearest public $/month, parsed from the plan prices (null = none published) */
  priceRange: { min: number; max: number; plus: boolean } | null;
  citation: Citation;
};

export type Category = "build" | "double_down" | "positioning" | "pricing" | "quick_win";

export type EvidenceLink =
  | { kind: "gap" | "pain" | "pricing" | "messaging"; id: string; label: string }
  | { kind: "note"; id: null; label: string };

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  category: Category;
  citations: Citation[];
  evidence: EvidenceLink[];
};

export type Bundle = {
  generatedAt: string;
  appSummary: string;
  /** competitors the pipeline analysed, in data/competitors.yaml order */
  competitors: string[];
  gapMatrix: GapRow[];
  painPoints: PainPoint[];
  trends: Trend[];
  reviewSnippets: Citation[];
  news: NewsItem[];
  messaging: Messaging[];
  pricing: PricingCompany[];
  recommendations: Recommendation[];
};
