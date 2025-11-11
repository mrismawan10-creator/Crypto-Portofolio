"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from "@/store/useChatStore";
import { useMethodStore } from "@/store/useMethodStore";
import { useSessionStore } from "@/store/useSessionStore";
import { toast } from "sonner";

const CHAT_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;

export function ChatInput() {
  const [value, setValue] = useState("");
  const { addMessage, setTyping } = useChatStore();
  const { method } = useMethodStore();
  const { ensureSession } = useSessionStore();

  async function sendMessage(text: string) {
    const userId = ensureSession();
    const userMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: "user" as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    addMessage(userMsg);
    if (!CHAT_URL) {
      toast.error("Konfigurasi webhook belum diatur");
      return;
    }
    try {
      setTyping(true);
      const payload = { message: text, user_id: userId, method };
      let res: Response;
      try {
        res = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // Fallback via server-side proxy to avoid CORS or TLS issues
        res = await fetch("/api/proxy/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error(`Chat error (${res.status})`);
      const ctype = res.headers.get("content-type") || "";
      const raw = await res.text();

      function extractReplies(input: unknown): string[] {
        const tryFields = (obj: Record<string, any>): string[] => {
          const fields = [
            "output", // prefer explicit output if provided by webhook
            "message",
            "text",
            "reply",
            "response",
            "url",
            "link",
          ] as const;
          for (const f of fields) {
            if (typeof obj[f] === "string" && obj[f].trim()) return [obj[f] as string];
          }
          // nested common containers
          if (obj.data && typeof obj.data === "object") {
            const fromData = tryFields(obj.data as Record<string, any>);
            if (fromData.length) return fromData;
          }
          if (Array.isArray(obj.results)) {
            const fromResults = (obj.results as any[])
              .map((it) => (typeof it === "string" ? it : tryFields(it)))
              .flat()
              .filter(Boolean) as string[];
            if (fromResults.length) return fromResults;
          }
          return [];
        };

        if (typeof input === "string") return input.trim() ? [input] : [];
        if (Array.isArray(input)) {
          const arr = input
            .map((it) => (typeof it === "string" ? it : tryFields(it as Record<string, any>)))
            .flat()
            .filter(Boolean) as string[];
          return arr;
        }
        if (input && typeof input === "object") {
          return tryFields(input as Record<string, any>);
        }
        return [];
      }

      let replies: string[] = [];
      if (ctype.includes("application/json")) {
        try {
          const json = JSON.parse(raw);
          replies = extractReplies(json);
        } catch {
          replies = extractReplies(raw);
        }
      } else {
        replies = extractReplies(raw);
      }

      // Helpers to present JSON nicely as plain text
      const isJsonLike = (s: string) => {
        const t = s.trim();
        return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
      };

      function prettyPlain(value: unknown, indent = 0): string {
        const pad = (n: number) => " ".repeat(n);
        const nl = "\n";
        const isPrim = (v: unknown) =>
          v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

        if (isPrim(value)) return String(value ?? "");

        if (Array.isArray(value)) {
          if (value.every(isPrim)) {
            return value.map((v) => `- ${String(v ?? "")}`).join(nl);
          }
          return value
            .map((v, i) => `${pad(indent)}- Item ${i + 1}${isPrim(v) ? `: ${String(v)}` : `\n${prettyPlain(v, indent + 2)}`}`)
            .join(nl);
        }

        if (typeof value === "object" && value) {
          // If webhook returns an object with a primary output field, return it directly
          const vObj = value as Record<string, unknown>;
          if (typeof vObj.output === "string" && vObj.output.trim()) return vObj.output;
          const entries = Object.entries(value as Record<string, unknown>);
          return entries
            .map(([k, v]) =>
              isPrim(v)
                ? `${pad(indent)}• ${k}: ${String(v ?? "")}`
                : `${pad(indent)}• ${k}:${nl}${prettyPlain(v, indent + 2)}`
            )
            .join(nl);
        }

        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value ?? "");
        }
      }

      if (replies.length === 0) {
        replies = [raw && raw.trim() ? raw : `Respons kosong (status ${res.status})`];
      }

      const displayReplies = replies.map((r) => {
        if (ctype.includes("application/json") || isJsonLike(r)) {
          try {
            const obj = typeof r === "string" ? JSON.parse(r) : r;
            return prettyPlain(obj);
          } catch {
            return r;
          }
        }
        return r;
      });

      for (const r of displayReplies) {
        addMessage({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender: "agent",
          text: r,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengirim pesan";
      toast.error(msg);
    } finally {
      setTyping(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue("");
    void sendMessage(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = value.trim();
      if (!text) return;
      setValue("");
      void sendMessage(text);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Tulis pesan... (Enter untuk kirim)"
        className="flex-1 resize-y min-h-[3rem] max-h-[50vh]"
      />
      <Button type="submit" disabled={!value.trim()}>
        Kirim
      </Button>
    </form>
  );
}
