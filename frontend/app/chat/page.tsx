import { TitleBlock } from "@/components/title-block";
import { bundle } from "@/lib/data";

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TitleBlock
        sheet="A-06"
        title="Chat"
        purpose="Ask a growth question; answers cite the guide, site, screenshots and market data."
        stat={{ label: "Sources", value: String(5) }}
      />
      <p className="text-[14px] text-text-2">This sheet is drawn in the next phase.</p>
    </div>
  );
}
