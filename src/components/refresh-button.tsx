"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clicking, setClicking] = useState(false);
  const loading = pending || clicking;

  return (
    <Button
      variant="outline"
      onClick={() => {
        setClicking(true);
        startTransition(() => {
          fetch("/api/prices/refresh", { method: "POST" })
            .catch(() => {})
            .finally(() => {
              router.refresh();
              setTimeout(() => setClicking(false), 300);
            });
        });
      }}
      disabled={loading}
    >
      <RefreshCcw className="w-4 h-4 mr-1" /> {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );
}



