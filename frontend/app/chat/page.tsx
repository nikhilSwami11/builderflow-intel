import { Suspense } from "react";
import { Chat } from "@/components/chat";
import { PageTitle } from "@/components/page-title";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[24rem] max-w-4xl flex-col gap-4 lg:h-[calc(100dvh-4rem)]">
      <PageTitle title="Chat" />
      <Suspense fallback={null}>
        <Chat />
      </Suspense>
    </div>
  );
}
