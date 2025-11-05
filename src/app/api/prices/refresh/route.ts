import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchUsdPricesForSymbols, symbolToCoinId } from "@/lib/coins";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("crypto_portfolio")
      .select("id,code,amount")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const symbols = Array.from(new Set(rows.map((r) => r.code)));
    const priceMap = await fetchUsdPricesForSymbols(symbols);

    // Update each row with the latest price/value
    for (const row of rows) {
      const coinId = symbolToCoinId(row.code);
      const price = coinId ? priceMap[coinId]?.usd : undefined;
      if (typeof price === "number") {
        const current_value_usd = price * Number(row.amount ?? 0);
        const { error: upErr } = await supabase
          .from("crypto_portfolio")
          .update({ current_price_usd: price, current_value_usd })
          .eq("id", row.id)
          .eq("user_id", userId);
        if (upErr) throw new Error(upErr.message);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to refresh prices";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
