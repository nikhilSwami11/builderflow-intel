import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-04"
        title="Pain Points & Market"
        purpose="What contractors complain about, and where the market is heading."
        stat={{ label: "Pain points", value: String(bundle.painPoints.length) }}
      />
      <p className="text-[14px] text-text-2">This sheet is drawn in the next phase.</p>
    </div>
  );
}
