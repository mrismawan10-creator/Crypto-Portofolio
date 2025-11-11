"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Message = {
  id: string;
  text: string;
  ts: number;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = text.trim().length > 0;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // simulate submit from input
      if (canSend) {
        const fakeEvent = { preventDefault: () => {} } as unknown as React.FormEvent;
        handleSubmit(fakeEvent);
      }
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chat</h2>
        <Button variant="secondary" size="sm" onClick={clearChat} disabled={messages.length === 0}>
          Clear
        </Button>
      </div>

      <Card ref={listRef} className="p-4 mb-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground select-none">
            Belum ada pesan. Ketik pesan di bawah lalu tekan Enter.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3 py-2 shadow">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                  <div className="mt-1 text-[10px] opacity-80 text-right">
                    {timeFormatter.format(m.ts)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan..."
          className="flex-1"
        />
        <Button type="submit" disabled={!canSend}>
          Kirim
        </Button>
      </form>
    </div>
  );
}
