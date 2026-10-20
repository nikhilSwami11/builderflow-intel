import bundleJson from "@/data/bundle.json";
import type { Bundle, Category, Has, PainTheme, Tier } from "./types";

// bundle.json is produced by `python scripts/export_frontend.py` and is gitignored.
export const bundle = bundleJson as unknown as Bundle;

export const TIER_LABEL: Record<Tier, string> = {
  table_stakes: "Table stakes",
  differentiator: "Differentiator",
  emerging: "Emerging",
};

export const HAS_LABEL: Record<Has, string> = {
  yes: "Have it",
  partial: "Partial",
  no: "Not found in our data",
  unverified: "Not in guide",
};

export const THEME_LABEL: Record<PainTheme, string> = {
  pricing_transparency: "Pricing transparency",
  support: "Support",
  mobile_reliability: "Mobile reliability",
  data_integrity: "Data integrity",
  onboarding: "Onboarding",
  integrations: "Integrations",
  automation_rigidity: "Automation rigidity",
  feature_depth: "Feature depth",
  tool_fragmentation: "Tool fragmentation",
  adoption: "Adoption",
  other: "Other",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  quick_win: "Quick wins",
  build: "Build",
  double_down: "Double down",
  positioning: "Positioning",
  pricing: "Pricing",
};

export const CATEGORY_ORDER: Category[] = ["quick_win", "build", "double_down", "positioning", "pricing"];
export const TIER_ORDER: Tier[] = ["table_stakes", "differentiator", "emerging"];

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
