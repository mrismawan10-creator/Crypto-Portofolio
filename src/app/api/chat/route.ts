import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY is missing. Set it in your environment and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
    type ChatRequestBody = { messages?: ChatMessage[] };

    const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    const supabase = await createSupabaseServerClient();

    // Fetch current user's assets so the model has context and doesn't ask for IDs
    const { data: assets } = await supabase
      .from("crypto_portfolio")
      .select("id,code,name,amount,avg_price_usd")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    const assetSummary = JSON.stringify(
      (assets || []).map((a) => ({ id: a.id, code: a.code, name: a.name, amount: a.amount, avg_price_usd: a.avg_price_usd })),
    );

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system:
        `You are a crypto portfolio assistant. Use tools for any data changes. Identify assets by code or name using the provided list; do not ask for row IDs.
Current user assets (JSON): ${assetSummary}`,
      messages,
      tools: {
        add_asset: tool({
          description: "Add a new crypto asset to the user's portfolio",
          parameters: z.object({
            code: z.string().describe("Asset code, e.g. BTC, HYPE"),
            name: z.string().describe("Human-readable asset name"),
            amount: z.number().describe("Quantity of the asset (can be fractional)"),
            avg_price_usd: z.number().describe("Average buy price in USD"),
          }),
          execute: async ({ code, name, amount, avg_price_usd }) => {
            const { error } = await supabase
              .from("crypto_portfolio")
              .insert({ user_id: userId, code: String(code).toUpperCase(), name, amount, avg_price_usd });
            if (error) throw new Error(error.message);
            return { status: "ok" } as const;
          },
        }),
        update_asset: tool({
          description: "Update an existing asset (select by id, code, or name)",
          parameters: z.object({
            id: z.string().optional(),
            lookup_code: z.string().optional(),
            lookup_name: z.string().optional(),
            code: z.string().optional(),
            name: z.string().optional(),
            amount: z.number().optional(),
            avg_price_usd: z.number().optional(),
          }),
          execute: async ({ id, lookup_code, lookup_name, code, name, amount, avg_price_usd }) => {
            let targetId: string | null = id ?? null;
            if (!targetId) {
              if (lookup_code) {
                const { data } = await supabase
                  .from("crypto_portfolio")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("code", String(lookup_code).toUpperCase())
                  .maybeSingle();
                targetId = data?.id ?? null;
              } else if (lookup_name) {
                const { data } = await supabase
                  .from("crypto_portfolio")
                  .select("id")
                  .eq("user_id", userId)
                  .ilike("name", lookup_name)
                  .maybeSingle();
                targetId = data?.id ?? null;
              }
            }

            if (!targetId) {
              return { status: "not_found" as const, reason: "Asset not found for given selector" };
            }

            const update: Record<string, unknown> = {};
            if (code !== undefined) update.code = String(code).toUpperCase();
            if (name !== undefined) update.name = name;
            if (amount !== undefined) update.amount = amount;
            if (avg_price_usd !== undefined) update.avg_price_usd = avg_price_usd;

            if (Object.keys(update).length === 0) {
              return { status: "noop" as const };
            }

            const { error } = await supabase
              .from("crypto_portfolio")
              .update(update)
              .eq("id", targetId)
              .eq("user_id", userId);
            if (error) throw new Error(error.message);
            return { status: "ok" } as const;
          },
        }),
        upsert_asset: tool({
          description: "Insert or update an asset by code",
          parameters: z.object({
            code: z.string().describe("Asset code, e.g. BTC, HYPE"),
            name: z.string().optional().describe("Required if inserting new asset"),
            amount: z.number().optional(),
            avg_price_usd: z.number().optional(),
          }),
          execute: async ({ code, name, amount, avg_price_usd }) => {
            const upper = String(code).toUpperCase();
            const { data } = await supabase
              .from("crypto_portfolio")
              .select("id")
              .eq("user_id", userId)
              .eq("code", upper)
              .maybeSingle();

            if (data?.id) {
              const update: Record<string, unknown> = {};
              if (name !== undefined) update.name = name;
              if (amount !== undefined) update.amount = amount;
              if (avg_price_usd !== undefined) update.avg_price_usd = avg_price_usd;
              if (Object.keys(update).length === 0) return { status: "noop" as const };
              const { error } = await supabase
                .from("crypto_portfolio")
                .update(update)
                .eq("id", data.id)
                .eq("user_id", userId);
              if (error) throw new Error(error.message);
              return { status: "ok", mode: "updated" } as const;
            } else {
              if (!name) throw new Error("Missing name for new asset insert");
              const { error } = await supabase
                .from("crypto_portfolio")
                .insert({ user_id: userId, code: upper, name, amount: amount ?? 0, avg_price_usd: avg_price_usd ?? 0 });
              if (error) throw new Error(error.message);
              return { status: "ok", mode: "inserted" } as const;
            }
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request. Check API key and network.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
