import { Suspense } from "react";
import { Chat } from "@/components/chat";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-[24rem] flex-col lg:h-[calc(100dvh-4rem)]">
      <h1 className="sr-only">Chat</h1>
      <Suspense fallback={null}>
        <Chat />
      </Suspense>
    </div>
  );
}
