"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function addAsset(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const code = String(formData.get("code") || "").toUpperCase().trim();
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const avg_price_usd = Number(formData.get("avg_price_usd") || 0);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("crypto_portfolio").insert({
    user_id: userId,
    code,
    name,
    amount,
    avg_price_usd,
  });
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function updateAsset(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const code = String(formData.get("code") || "").toUpperCase().trim();
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const avg_price_usd = Number(formData.get("avg_price_usd") || 0);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("crypto_portfolio")
    .update({ code, name, amount, avg_price_usd })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

export async function deleteAsset(id: string) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("crypto_portfolio")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  redirect("/dashboard");
}

