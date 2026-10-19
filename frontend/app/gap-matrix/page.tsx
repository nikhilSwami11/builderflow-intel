import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-02"
        title="Gap Matrix"
        purpose="Features competitors ship, and whether Builderflow has them."
        stat={{ label: "Features", value: String(bundle.gapMatrix.length) }}
      />
      <p className="text-[14px] text-text-2">This sheet is drawn in the next phase.</p>
    </div>
  );
}
