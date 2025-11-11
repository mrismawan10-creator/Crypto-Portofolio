"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useMethodStore, METHOD_OPTIONS } from "@/store/useMethodStore";
import { useChatStore } from "@/store/useChatStore";
import { useSessionStore } from "@/store/useSessionStore";
import { toast } from "sonner";

const SUMMARY_URL = process.env.NEXT_PUBLIC_SUMMARY_URL;

export function ChatHeader() {
  const { method, setMethod } = useMethodStore();
  const { clearMessages, addMessage } = useChatStore();
  const { resetSession, ensureSession } = useSessionStore();
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function createSummary() {
    const userId = ensureSession();
    if (!SUMMARY_URL) return toast.error("Konfigurasi summary belum diatur");
    try {
      setSummaryLoading(true);
      const res = await fetch(SUMMARY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "oke", user_id: userId, method }),
      });
      if (!res.ok) throw new Error(`Summary error (${res.status})`);
      const raw = await res.text();

      // Extract display message and URL if present
      let display = "";
      let link = "";
      try {
        const data = JSON.parse(raw);
        const msg = (data.message || data.text || data.reply || data.response || "") as string;
        const url = (data.url || data.link || "") as string;
        display = msg || (url ? `Ringkasan dibuat: ${url}` : "Ringkasan berhasil dibuat");
        link = url;
      } catch {
        // raw could be plain text including a URL
        const m = raw.match(/https?:\/\/\S+/);
        link = m ? m[0] : "";
        display = raw || (link ? `Ringkasan dibuat: ${link}` : "Ringkasan berhasil dibuat");
      }

      // Add as chat bubble reply so user sees it in context
      addMessage({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: "agent",
        text: display,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      toast.success(display);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Gagal membuat ringkasan";
      toast.error(m);
    } finally {
      setSummaryLoading(false);
    }
  }

  function onResetSession() {
    resetSession();
    clearMessages();
    toast.success("Session telah direset");
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-white/60 dark:bg-gray-900/40 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Method</span>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Pilih metode" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem disabled={summaryLoading} onSelect={() => createSummary()}>
              {summaryLoading ? "Membuat Summary..." : "Create Summary"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onResetSession()}>
              Reset Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
