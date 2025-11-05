"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RealtimeRefresher() {
  const router = useRouter();
  useEffect(() => {
    const channel = supabase
      .channel("portfolio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crypto_portfolio" },
        () => {
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
