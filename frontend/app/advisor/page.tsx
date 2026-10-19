import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-05"
        title="Growth Advisor"
        purpose="What to build, double down on and change, each tied to its evidence."
        stat={{ label: "Recommendations", value: String(bundle.recommendations.length) }}
      />
      <p className="text-[14px] text-text-2">This sheet is drawn in the next phase.</p>
    </div>
  );
}
