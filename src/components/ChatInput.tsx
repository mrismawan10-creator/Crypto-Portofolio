"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from "@/store/useChatStore";
import { useMethodStore } from "@/store/useMethodStore";
import { useSessionStore } from "@/store/useSessionStore";
import { toast } from "sonner";

const CHAT_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;
const STT_WS_URL = process.env.NEXT_PUBLIC_STT_WS_URL;
const STT_API_KEY = process.env.NEXT_PUBLIC_STT_API_KEY;

export function ChatInput() {
  const [value, setValue] = useState("");
  const [sttOpen, setSttOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sttPartial, setSttPartial] = useState("");
  const [sttFinal, setSttFinal] = useState("");
  const [sttStatus, setSttStatus] = useState<"idle" | "connecting" | "recording" | "error">("idle");
  const [sttError, setSttError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { addMessage, setTyping } = useChatStore();
  const { method } = useMethodStore();
  const { ensureSession } = useSessionStore();

  useEffect(() => {
    return () => {
      void stopPushToTalk();
    };
  }, []);

  useEffect(() => {
    if (!sttOpen) {
      void stopPushToTalk();
    }
  }, [sttOpen]);

  const buildWsUrl = () => {
    const isBrowser = typeof window !== "undefined";
    const securePreferred = isBrowser && window.location.protocol === "https:";
    const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1";
    const proto = securePreferred ? "wss" : "ws";

    // allow user to set NEXT_PUBLIC_STT_WS_URL as host or full ws/wss url; honor explicit scheme
    if (STT_WS_URL) {
      const hasScheme = STT_WS_URL.startsWith("ws://") || STT_WS_URL.startsWith("wss://");
      const url = new URL(hasScheme ? STT_WS_URL : `${proto}://${STT_WS_URL}`);
      if (securePreferred && isLocalHost(url.hostname)) {
        throw new Error(
          "STT belum dikonfigurasi untuk produksi. Set NEXT_PUBLIC_STT_WS_URL ke host wss publik (bukan localhost)."
        );
      }
      // if the page is https but user gave a ws:// host, upgrade to wss to avoid mixed-content blocks
      if (securePreferred && url.protocol === "ws:") {
        url.protocol = "wss:";
      }
      if (STT_API_KEY) url.searchParams.set("key", STT_API_KEY);
      return url.toString();
    }

    // No explicit URL:
    // - In browser + non-localhost (e.g., Vercel), block and ask for config instead of pointing to localhost.
    // - In local dev, fall back to localhost:8080 for the bundled STT server.
    if (isBrowser) {
      const host = window.location.hostname;
      const isLocal = isLocalHost(host);
      if (!isLocal) {
        throw new Error(
          "NEXT_PUBLIC_STT_WS_URL belum diisi untuk lingkungan produksi. Set ke wss://your-stt-host/path"
        );
      }
      const url = new URL(`${proto}://${host}:8080`);
      if (STT_API_KEY) url.searchParams.set("key", STT_API_KEY);
      return url.toString();
    }

    // SSR fallback: assume local
    const url = new URL(`${proto}://localhost:8080`);
    if (STT_API_KEY) url.searchParams.set("key", STT_API_KEY);
    return url.toString();
  };

  async function setupAudioChain() {
    const ctx = audioRef.current ?? new AudioContext({ sampleRate: 16000 });
    if (!audioRef.current) {
      await ctx.audioWorklet.addModule("/pcm-worklet.js");
      audioRef.current = ctx;
    } else if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, noiseSuppression: true, echoCancellation: true },
      });
    }

    const source = ctx.createMediaStreamSource(streamRef.current);
    const worklet = new AudioWorkletNode(ctx, "pcm-writer");
    worklet.port.onmessage = (event) => {
      if (event.data?.type === "chunk" && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data.buffer);
      }
    };
    source.connect(worklet);
    worklet.connect(ctx.destination);
    workletRef.current = worklet;
  }

  const handleIncomingTranscript = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const data = payload as Record<string, unknown>;
    const text = typeof data.text === "string" ? data.text : "";
    if (!text) return;

    if (data.type === "partial") {
      setSttPartial(text);
    } else if (data.type === "final") {
      setSttPartial("");
      setSttFinal((prev) => (prev ? `${prev}\n${text}` : text));
    }
  };

  const connectSttSocket = async () => {
    let targetUrl: string;
    try {
      targetUrl = buildWsUrl();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Koneksi STT belum dikonfigurasi.";
      setSttError(msg);
      setSttStatus("error");
      toast.error(msg);
      throw err;
    }
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        const ws = new WebSocket(targetUrl);
        ws.binaryType = "arraybuffer";
        ws.onmessage = async (event: MessageEvent) => {
          try {
            let raw = "";
            if (typeof event.data === "string") {
              raw = event.data;
            } else if (event.data instanceof ArrayBuffer) {
              raw = new TextDecoder().decode(event.data);
            } else if (event.data instanceof Blob) {
              raw = await event.data.text();
            }
            if (!raw) return;
            handleIncomingTranscript(JSON.parse(raw));
          } catch {
            // ignore malformed payloads
          }
        };
        ws.onopen = () => resolve(ws);
        ws.onerror = (err) => {
          console.error("STT websocket error", err);
          const message =
            err instanceof ErrorEvent && err.message
              ? err.message
              : `Gagal membuka koneksi STT ke ${targetUrl}. Pastikan server STT berjalan (port 8080) dan kunci cocok.`;
          reject(new Error(message));
        };
        ws.onclose = (event) => {
          if (!isRecording) {
            // if it closed before we marked recording, treat as failure
            const reason = event.reason || (event.code ? `code ${event.code}` : "tanpa kode");
            reject(new Error(`Koneksi STT tertutup (${reason}). Pastikan server STT aktif.`));
          }
          setIsRecording(false);
          setSttStatus("idle");
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const startPushToTalk = async () => {
    if (isRecording) return;
    setSttError(null);
    setSttPartial("");
    setSttFinal("");
    setSttStatus("connecting");
    try {
      wsRef.current = await connectSttSocket();
      await setupAudioChain();
      setIsRecording(true);
      setSttStatus("recording");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Push-to-talk gagal dimulai";
      setSttError(message);
      setSttStatus("error");
      toast.error(message);
      await stopPushToTalk();
    }
  };

  const stopPushToTalk = async () => {
    setIsRecording(false);
    setSttStatus("idle");
    setSttPartial("");
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error("Error closing STT ws", err);
      }
      wsRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (audioRef.current?.state === "running") {
      await audioRef.current.suspend().catch(() => undefined);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

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
          const fields = ["output", "message", "text", "reply", "response", "url", "link"] as const;
          for (const f of fields) {
            if (typeof obj[f] === "string" && obj[f].trim()) return [obj[f] as string];
          }
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
          const vObj = value as Record<string, unknown>;
          if (typeof vObj.output === "string" && vObj.output.trim()) return vObj.output;
          const entries = Object.entries(value as Record<string, unknown>);
          return entries
            .map(([k, v]) =>
              isPrim(v)
                ? `${pad(indent)}-> ${k}: ${String(v ?? "")}`
                : `${pad(indent)}-> ${k}:${nl}${prettyPlain(v, indent + 2)}`
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

  const submitMessage = () => {
    const text = value.trim();
    if (!text) return;
    setValue("");
    void sendMessage(text);
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage();
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.altKey) {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart ?? value.length;
      const end = target.selectionEnd ?? value.length;
      const nextValue = value.slice(0, start) + "\n" + value.slice(end);
      setValue(nextValue);
      requestAnimationFrame(() => {
        const cursor = start + 1;
        target.selectionStart = cursor;
        target.selectionEnd = cursor;
      });
      return;
    }
    event.preventDefault();
    submitMessage();
  };

  const sttDisplay = sttFinal || sttPartial;

  return (
    <>
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="self-stretch"
          onClick={() => setSttOpen(true)}
          title="Push to talk"
        >
          <Mic className="size-5" />
        </Button>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan..."
          className="flex-1 resize-y min-h-[3rem] max-h-[50vh]"
        />
        <Button type="submit" disabled={!value.trim()}>
          Kirim
        </Button>
      </form>

      <Dialog open={sttOpen} onOpenChange={setSttOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Push to Talk</DialogTitle>
            <DialogDescription>Tekan dan tahan tombol mic untuk mulai merekam, lepaskan untuk berhenti.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant={isRecording ? "default" : "secondary"}
                className={`h-24 w-24 rounded-full shadow-lg transition-all ${isRecording ? "scale-105 ring-4 ring-primary/40" : ""}`}
                onMouseDown={() => void startPushToTalk()}
                onMouseUp={() => void stopPushToTalk()}
                onMouseLeave={() => isRecording && void stopPushToTalk()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  void startPushToTalk();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  void stopPushToTalk();
                }}
              >
                {sttStatus === "connecting" ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : isRecording ? (
                  <Mic className="size-8" />
                ) : (
                  <MicOff className="size-8" />
                )}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 min-h-[140px]">
              <div className="text-xs font-medium text-muted-foreground mb-1">Hasil STT</div>
              <div className="whitespace-pre-wrap text-sm text-foreground">
                {sttDisplay ? (
                  <>
                    {sttFinal}
                    {sttPartial && <span className="opacity-60">{(sttFinal ? "\n" : "") + sttPartial}</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground">Belum ada transkripsi.</span>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {sttError
                ? sttError
                : isRecording
                ? "Rekaman aktif, lepaskan tombol untuk berhenti."
                : "Siap merekam. Pastikan izin mikrofon diberikan."}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
