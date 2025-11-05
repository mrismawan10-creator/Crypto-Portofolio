"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseDecimal(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").replace(/,/g, ".").trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function addAsset(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const code = String(formData.get("code") ?? "").toUpperCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseDecimal(formData.get("amount"));
  const avg_price_usd = parseDecimal(formData.get("avg_price_usd"));
  const color_hex = (String(formData.get("color_hex") ?? "").trim() || null) as string | null;

  const supabase = await createSupabaseServerClient();
  // Attempt insert with color; if the column doesn't exist yet, retry without it
  const payload: Record<string, unknown> = {
    user_id: userId,
    code,
    name,
    amount,
    avg_price_usd,
    color_hex,
  };
  const { error } = await supabase.from("crypto_portfolio").insert(payload);
  if (error && /color_hex/i.test(error.message)) {
    // Fallback when migration 005_add_color_hex.sql hasn't been applied
    delete payload.color_hex;
    const retry = await supabase.from("crypto_portfolio").insert(payload);
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateAsset(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const code = String(formData.get("code") ?? "").toUpperCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseDecimal(formData.get("amount"));
  const avg_price_usd = parseDecimal(formData.get("avg_price_usd"));

  const supabase = await createSupabaseServerClient();
  // Build update object and gracefully handle missing color_hex column
  const update: Record<string, unknown> = {
    code,
    name,
    amount,
    avg_price_usd,
  };
  const color = String(formData.get("color_hex") ?? "").trim();
  update.color_hex = color || null;

  const { error } = await supabase
    .from("crypto_portfolio")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error && /color_hex/i.test(error.message)) {
    // Retry without color if the column doesn't exist yet on the database
    delete update.color_hex;
    const retry = await supabase
      .from("crypto_portfolio")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId);
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
  redirect("/dashboard");
}





