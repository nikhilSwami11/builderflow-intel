import { CATEGORY_LABEL } from "@/lib/data";
import type { Category } from "@/lib/types";

const TONE: Record<Category, string> = {
  quick_win: "bg-accent-wash text-accent border-accent/30",
  build: "bg-ink text-white border-ink",
  double_down: "bg-green-wash text-green border-green/30",
  positioning: "bg-stone-wash text-text border-rule-strong",
  pricing: "bg-amber-wash text-amber border-amber/30",
};

export function CategoryChip({ category }: { category: Category }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${TONE[category]}`}>{CATEGORY_LABEL[category]}</span>;
}
