import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { addAsset } from "../actions";

export default function AddAssetPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-6 bg-gradient-to-br from-white/60 to-white/20 dark:from-gray-900/60 dark:to-gray-800/30 backdrop-blur-xl">
      <div className="mx-auto max-w-xl">
        <Card className="p-6 space-y-4 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl border-white/50 dark:border-gray-800/50">
          <div>
            <h1 className="text-xl font-semibold">Add Asset</h1>
            <p className="text-sm text-muted-foreground">Add a crypto asset to your portfolio.</p>
          </div>

          <form action={addAsset} className="space-y-4">
            <div>
              <Label htmlFor="code">Code (e.g. BTC, HYPE)</Label>
              <Input id="code" name="code" placeholder="BTC" required />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Bitcoin" required />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="any" defaultValue="0" />
            </div>
            <div>
              <Label htmlFor="avg_price_usd">Average Buy Price (USD)</Label>
              <Input id="avg_price_usd" name="avg_price_usd" type="number" step="any" defaultValue="0" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">Save</Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
