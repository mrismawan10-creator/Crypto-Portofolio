"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/useSessionStore";
import { useMethodStore } from "@/store/useMethodStore";
import { useChatStore, Message } from "@/store/useChatStore";
import { toast } from "sonner";
import { Copy as CopyIcon } from "lucide-react";

const TTS_URL = process.env.NEXT_PUBLIC_TTS_URL!;

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  const { updateMessage, addMessage } = useChatStore();
  const { userId } = useSessionStore();
  const { method } = useMethodStore();
  const [loadingTTS, setLoadingTTS] = useState(false);

  async function handleVoiceNote() {
    if (!TTS_URL) return toast.error("Konfigurasi TTS belum diatur");
    try {
      setLoadingTTS(true);
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.text, user_id: userId, method }),
      });
      if (!res.ok) throw new Error(`TTS error (${res.status})`);
      const txt = await res.text();
      let url = "";
      try {
        const data = JSON.parse(txt);
        if (Array.isArray(data)) {
          for (const it of data) {
            if (it && typeof it === "object") {
              const cand = (it as any).url || (it as any).audio || (it as any).link;
              if (typeof cand === "string" && cand) {
                url = cand;
                break;
              }
            } else if (typeof it === "string" && it.startsWith("http")) {
              url = it;
              break;
            }
          }
        } else if (data && typeof data === "object") {
          url = (data as any).url || (data as any).audio || (data as any).link || "";
        }
      } catch {
        // try to find URL from plain text
        const m = txt.match(/https?:\/\/\S+/);
        url = m ? m[0] : "";
      }
      if (!url) throw new Error("URL audio tidak ditemukan");
      // Tampilkan hasil TTS sebagai bubble chat baru dengan audio
      addMessage({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: "agent",
        text: message.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        voiceUrl: url,
      });
      toast.success("Voice note siap diputar");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal membuat voice note";
      toast.error(msg);
    } finally {
      setLoadingTTS(false);
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-2 shadow",
          "backdrop-blur bg-white/70 dark:bg-gray-900/50 border border-white/20",
          isUser ? "bg-primary text-primary-foreground dark:text-foreground border-transparent" : "",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</div>
        <div className="mt-1 text-[10px] opacity-70 flex items-center gap-2">
          <span>{message.timestamp}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleVoiceNote}
            disabled={loadingTTS}
          >
            {loadingTTS ? "Membuat..." : "TTS"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.text);
                toast.success("Teks disalin ke clipboard");
              } catch (e) {
                toast.error("Gagal menyalin teks");
              }
            }}
            title="Copy text"
          >
            <CopyIcon className="w-4 h-4" />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
        {message.voiceUrl && (
          <div className="mt-2">
            <audio controls src={message.voiceUrl} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
