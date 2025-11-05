import Chat from "@/components/chat";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { auth } from "@clerk/nextjs/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchUsdPricesForSymbols, symbolToCoinId } from "@/lib/coins";
import { PortfolioWithComputed } from "@/types/portfolio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import RefreshButton from "@/components/refresh-button";
import RealtimeRefresher from "@/components/realtime-refresher";
import PieChart from "@/components/pie-chart";

async function getData() {
  const { userId } = await auth();
  if (!userId) return { items: [] as PortfolioWithComputed[] };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("crypto_portfolio")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const rows = (data || []) as PortfolioWithComputed[];
  const symbols = Array.from(new Set(rows.map((r) => r.code)));
  let priceData: Record<string, { usd: number }> = {};
  try {
    priceData = await fetchUsdPricesForSymbols(symbols);
  } catch {
    priceData = {};
  }

  for (const r of rows) {
  const coinId = symbolToCoinId(r.code);
  const fetchedPrice = coinId ? priceData[coinId]?.usd : undefined;

  const price = typeof r.current_price_usd === "number" ? r.current_price_usd : fetchedPrice;
  if (typeof price === "number") {
    r.current_price_usd = price;
    r.current_value_usd = price * Number(r.amount);
  }

  if (typeof r.current_value_usd === "number") {
    const cost = Number(r.amount) * Number(r.avg_price_usd);
    const pl = (r.current_value_usd ?? 0) - cost;
    r.pl_usd = pl;
    const denom = cost === 0 ? 0 : pl / cost;
    r.pl_percent = Number.isFinite(denom) ? denom * 100 : undefined;
  }
}

  return { items: rows };
}

export default async function DashboardPage() {
  const { items } = await getData();

  return (
    <div className="min-h-[calc(100vh-4rem)] px-2 sm:px-4 py-4 sm:py-6 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] bg-gradient-to-br from-white/60 to-white/20 dark:from-gray-900/60 dark:to-gray-800/30 backdrop-blur-xl">
        <RealtimeRefresher />
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Portfolio</h1>
            <p className="text-muted-foreground text-sm">Track your crypto assets in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <Button asChild>
              <Link href="/dashboard/add">
                <Plus className="w-4 h-4 mr-1" /> Add Asset
              </Link>
            </Button>
          </div>
        </div>

        <Card className="p-3 sm:p-4 shadow-lg/50 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl border-white/50 dark:border-gray-800/50">
          <div className="mb-3">
            <div className="font-semibold">Allocation by Asset</div>
            <div className="text-sm text-muted-foreground">Persentase nilai tiap aset terhadap total portofolio</div>
          </div>
          {(() => {
            const chartData = items
              .map((r) => {
                const value = (typeof r.current_value_usd === "number" && r.current_value_usd > 0)
                  ? r.current_value_usd
                  : Number(r.amount) * Number(r.avg_price_usd);
                return { label: `${r.code}`, value, color: (r as any).color_hex ?? undefined };
              })
              .filter((d) => Number.isFinite(d.value) && d.value > 0);
            return <PieChart data={chartData} />;
          })()}
        </Card>
        <Card className="p-3 sm:p-4 shadow-lg/50 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl border-white/50 dark:border-gray-800/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Avg Price (USD)</TableHead>
                  <TableHead className="text-right">Current Price (USD)</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No assets yet. Add your first asset.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => {
                    const pl = r.pl_usd ?? 0;
                    const positive = pl >= 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.code}</div>
                        </TableCell>
                        <TableCell className="text-right">{Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}</TableCell>
                        <TableCell className="text-right">{Number(r.avg_price_usd).toLocaleString(undefined, { style: "currency", currency: "USD" })}</TableCell>
                        <TableCell className="text-right">{r.current_price_usd ? r.current_price_usd.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "-"}</TableCell>
                        <TableCell className="text-right">{r.current_value_usd ? r.current_value_usd.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className={positive ? "text-emerald-600" : "text-red-600"}>
                            <div className="inline-flex items-center gap-1">
                              {positive ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {r.pl_usd !== undefined
                                ? r.pl_usd.toLocaleString(undefined, { style: "currency", currency: "USD" })
                                : "-"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.pl_percent !== undefined ? `${r.pl_percent.toFixed(2)}%` : "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/${r.id}/edit`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl border-white/50 dark:border-gray-800/50">
  <div className="mb-4">
    <div className="font-semibold">AI Portfolio Insight</div>
    <div className="text-sm text-muted-foreground">Tanyakan hal seputar portofolio Anda langsung di sini.</div>
  </div>
  <Chat />
</Card>
      </div>
    </div>
  );
}














