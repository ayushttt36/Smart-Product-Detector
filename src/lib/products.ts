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
  category: string | null;
  image_url: string | null;
};

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Fashion & Apparel",
  "Food & Beverage",
  "Cosmetics",
  "Pharmaceuticals",
  "Automotive Parts",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Other",
] as const;

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
      "id, dealer_id, product_name, product_code, unique_code, brand, manufacturing_date, registration_date, category, image_url, dealers(company_name)",
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

/* ---------------------------------------------------------------- images */

/** Uploads a product photo into the signed-in dealer's own folder. */
export async function uploadProductImage(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Please sign in again to upload a photo.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error("The photo could not be uploaded. Please try a smaller image.");
  return path;
}

/** Turns a stored photo path into a temporary viewable link. */
export async function productImageUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

/* ------------------------------------------------------------ public page */

export async function fetchPublicProduct(rawCode: string) {
  const code = extractCode(rawCode);
  return verifyCode(code);
}

/* --------------------------------------------------------------- bulk QR */

export type BulkDraft = {
  product_name: string;
  product_code: string;
  unique_code: string;
  brand: string;
  category: string | null;
  manufacturing_date: string | null;
};

export async function bulkCreateProducts(drafts: BulkDraft[]): Promise<Product[]> {
  const dealer = await ensureMyDealer();
  const { data, error } = await supabase
    .from("products")
    .insert(drafts.map((d) => ({ ...d, dealer_id: dealer.id })))
    .select("*");
  if (error) {
    if (error.code === "23505") throw new Error("One of the generated codes already exists. Try again.");
    throw new Error("The batch could not be saved. Please try again.");
  }
  return (data ?? []) as Product[];
}

/* -------------------------------------------------------------- analytics */

export type DealerAnalytics = {
  totalScans: number;
  verifiedScans: number;
  failedScans: number;
  perDay: { date: string; verified: number; failed: number }[];
  perProduct: { id: string; name: string; scans: number }[];
  alerts: { id: string; name: string; scans: number; reason: string }[];
};

export async function fetchDealerAnalytics(days = 14): Promise<DealerAnalytics> {
  const products = await fetchMyProducts();
  const ids = products.map((p) => p.id);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const mine = ids.length
    ? await supabase
        .from("verification_history")
        .select("id, product_id, verification_status, tested_at")
        .in("product_id", ids)
        .gte("tested_at", since)
    : { data: [], error: null };

  const codes = new Set(products.flatMap((p) => [p.unique_code, p.product_code]));
  const failed = await supabase
    .from("verification_history")
    .select("id, scanned_code, verification_status, tested_at")
    .eq("verification_status", "NOT_VERIFIED")
    .gte("tested_at", since);

  const mineRows = (mine.data ?? []) as {
    product_id: string | null;
    verification_status: string;
    tested_at: string;
  }[];
  const failedRows = ((failed.data ?? []) as { scanned_code: string; tested_at: string }[]).filter(
    (r) => codes.has(r.scanned_code),
  );

  const perDayMap = new Map<string, { verified: number; failed: number }>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    perDayMap.set(d, { verified: 0, failed: 0 });
  }
  for (const row of mineRows) {
    const key = row.tested_at.slice(0, 10);
    const entry = perDayMap.get(key);
    if (entry) entry.verified += 1;
  }
  for (const row of failedRows) {
    const key = row.tested_at.slice(0, 10);
    const entry = perDayMap.get(key);
    if (entry) entry.failed += 1;
  }

  const counts = new Map<string, number>();
  for (const row of mineRows) {
    if (!row.product_id) continue;
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }

  const perProduct = products
    .map((p) => ({ id: p.id, name: p.product_name, scans: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 8);

  const alerts = perProduct
    .filter((p) => p.scans >= 5)
    .map((p) => ({
      ...p,
      reason: `Scanned ${p.scans} times in the last ${days} days — the QR code may have been copied.`,
    }));

  return {
    totalScans: mineRows.length + failedRows.length,
    verifiedScans: mineRows.length,
    failedScans: failedRows.length,
    perDay: [...perDayMap.entries()].map(([date, v]) => ({ date, ...v })),
    perProduct,
    alerts,
  };
}
