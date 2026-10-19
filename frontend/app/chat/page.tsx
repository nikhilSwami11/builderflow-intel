import { Chat } from "@/components/chat";
import { TitleBlock } from "@/components/title-block";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[24rem] max-w-4xl flex-col gap-4 lg:h-[calc(100dvh-4rem)]">
      <TitleBlock
        sheet="A-06"
        title="Chat"
        purpose="Ask a growth question; answers cite the guide, site, screenshots and market data."
        stat={{ label: "Source types", value: "5" }}
      />
      <Chat />
    </div>
  );
}
