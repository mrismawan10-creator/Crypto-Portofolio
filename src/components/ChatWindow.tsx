"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";

export default function ChatWindow() {
  const { messages, isTyping } = useChatStore();
  const { ensureSession } = useSessionStore();

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  return (
    <div className="w-full space-y-3 sm:space-y-4 px-1 sm:px-0">
      <ChatHeader />
      <Card className="w-full p-3 sm:p-4 min-h-[50vh] sm:min-h-[60vh] max-h-[55vh] sm:max-h-[65vh] overflow-y-auto space-y-3 bg-white/60 dark:bg-gray-900/40 backdrop-blur border-white/20">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground select-none">
            Mulai percakapan — tulis pesan di bawah.
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {isTyping && (
          <div className="flex justify-start"><TypingIndicator /></div>
        )}
      </Card>
      <ChatInput />
    </div>
  );
}
