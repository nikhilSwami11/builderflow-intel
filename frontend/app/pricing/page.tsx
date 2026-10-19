import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-03"
        title="Pricing"
        purpose="Public plans, hand-verified from each company's pricing page."
        stat={{ label: "Companies", value: String(bundle.pricing.length) }}
      />
      <p className="text-[14px] text-text-2">This sheet is drawn in the next phase.</p>
    </div>
  );
}
