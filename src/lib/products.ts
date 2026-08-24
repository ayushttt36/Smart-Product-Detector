import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  dealer_id: string;
  product_name: string;
  product_code: string;
  unique_code: string;
  brand: string;
  manufacturing_date: string | null;
  registration_date: string;
};

export type Dealer = {
  id: string;
  user_id: string;
  dealer_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  address: string | null;
  created_at: string;
};

export type VerificationRow = {
  id: string;
  scanned_code: string;
  product_id: string | null;
  product_name: string | null;
  verification_status: "VERIFIED" | "NOT_VERIFIED";
  tested_at: string;
};

export type VerificationResult =
  | { status: "VERIFIED"; code: string; product: Product & { company_name: string } }
  | { status: "NOT_VERIFIED"; code: string };

/** Extracts a product code from a raw QR payload (plain code, URL or JSON). */
export function extractCode(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const candidate =
      parsed["unique_code"] ?? parsed["code"] ?? parsed["product_id"] ?? parsed["id"];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  } catch {
    /* not JSON — continue */
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const fromQuery = url.searchParams.get("code") ?? url.searchParams.get("id");
      if (fromQuery) return fromQuery.trim();
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length) return decodeURIComponent(segments[segments.length - 1]!);
    } catch {
      /* fall through */
    }
  }
  return value;
}

/** Looks the code up in the database and records the attempt in the history table. */
export async function verifyCode(rawCode: string): Promise<VerificationResult> {
  const code = extractCode(rawCode);
  if (!code) throw new Error("The scanned QR code did not contain a readable product code.");

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, dealer_id, product_name, product_code, unique_code, brand, manufacturing_date, registration_date, dealers(company_name)",
    )
    .or(`unique_code.eq.${code},product_code.eq.${code}`)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("We could not reach the verification service. Please try again.");

  const found = data as (Product & { dealers: { company_name: string } | null }) | null;

  await supabase.from("verification_history").insert({
    scanned_code: code,
    product_id: found?.id ?? null,
    product_name: found?.product_name ?? null,
    verification_status: found ? "VERIFIED" : "NOT_VERIFIED",
  });

  if (!found) return { status: "NOT_VERIFIED", code };

  const { dealers, ...product } = found;
  return {
    status: "VERIFIED",
    code,
    product: { ...product, company_name: dealers?.company_name ?? "Registered dealer" },
  };
}

export type Stats = { total: number; verified: number; notVerified: number };

export async function fetchStats(): Promise<Stats> {
  const [total, verified] = await Promise.all([
    supabase.from("verification_history").select("id", { count: "exact", head: true }),
    supabase
      .from("verification_history")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "VERIFIED"),
  ]);
  const totalCount = total.count ?? 0;
  const verifiedCount = verified.count ?? 0;
  return {
    total: totalCount,
    verified: verifiedCount,
    notVerified: totalCount - verifiedCount,
  };
}

export async function fetchRecentTests(limit = 12): Promise<VerificationRow[]> {
  const { data, error } = await supabase
    .from("verification_history")
    .select("id, scanned_code, product_id, product_name, verification_status, tested_at")
    .order("tested_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load recent verification activity.");
  return (data ?? []) as VerificationRow[];
}

export async function fetchMyDealer(): Promise<Dealer | null> {
  const { data, error } = await supabase.from("dealers").select("*").limit(1).maybeSingle();
  if (error) throw new Error("Could not load your dealer profile.");
  return (data as Dealer) ?? null;
}

/**
 * Returns the signed-in user's dealer profile, creating a minimal one on the fly
 * when they signed up without filling in company details.
 */
export async function ensureMyDealer(): Promise<Dealer> {
  const existing = await fetchMyDealer();
  if (existing) return existing;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) throw new Error("Please sign in again to register products.");

  const email = user.email ?? `${user.id}@dealer.local`;
  const fallbackName =
    (user.user_metadata?.["full_name"] as string | undefined)?.trim() || email.split("@")[0]!;

  const { data, error } = await supabase
    .from("dealers")
    .insert({
      user_id: user.id,
      dealer_name: fallbackName,
      email,
      company_name: fallbackName,
    })
    .select("*")
    .single();

  if (error) {
    const retry = await fetchMyDealer();
    if (retry) return retry;
    throw new Error("Could not set up your dealer profile. Please try again.");
  }
  return data as Dealer;
}

export async function fetchMyProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("registration_date", { ascending: false });
  if (error) throw new Error("Could not load your products.");
  return (data ?? []) as Product[];
}

export async function fetchMyProduct(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, dealers(company_name, dealer_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load this product.");
  return data as
    | (Product & { dealers: { company_name: string; dealer_name: string } | null })
    | null;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
