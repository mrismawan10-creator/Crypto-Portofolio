import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const target = process.env.NEXT_PUBLIC_WEBHOOK_URL;
    if (!target) {
      return new Response("Webhook URL is not configured", { status: 500 });
    }
    const body = await req.text();
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // Optional: you can add a timeout via AbortController if desired
    });
    const text = await res.text();
    const ctype = res.headers.get("content-type") || "text/plain; charset=utf-8";
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": ctype },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return new Response(`Proxy chat error: ${msg}`, { status: 502 });
  }
}

