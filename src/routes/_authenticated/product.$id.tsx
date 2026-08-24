import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CircleSlash, Package, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProduct, formatDate, formatDateTime } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/product/$id")({
  head: () => ({
    meta: [
      { title: "Product Details — Smart Product Detector" },
      {
        name: "description",
        content: "Full registration details and verification activity for one registered product.",
      },
      { property: "og:title", content: "Product Details — Smart Product Detector" },
      { property: "og:description", content: "Registration and verification record for a product." },
    ],
  }),
  component: ProductDetails,
});

function ProductDetails() {
  const { id } = Route.useParams();

  const product = useQuery({ queryKey: ["product", id], queryFn: () => fetchMyProduct(id) });

  const checks = useQuery({
    queryKey: ["product-checks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_history")
        .select("id, verification_status, tested_at")
        .eq("product_id", id)
        .order("tested_at", { ascending: false })
        .limit(20);
      if (error) throw new Error("Could not load verification activity for this product.");
      return data as { id: string; verification_status: string; tested_at: string }[];
    },
  });

  if (product.isLoading) {
    return <p className="py-16 text-center text-muted-foreground">Loading product…</p>;
  }

  if (!product.data) {
    return (
      <div className="panel mx-auto max-w-md p-10 text-center">
        <Package className="mx-auto size-10 text-muted-foreground/70" />
        <h1 className="mt-4 text-xl font-semibold">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This product does not exist, or it belongs to another dealer.
        </p>
        <Link to="/my-products" className="btn btn-primary mt-6">
          Back to My Products
        </Link>
      </div>
    );
  }

  const p = product.data;
  const total = checks.data?.length ?? 0;
  const verified = checks.data?.filter((c) => c.verification_status === "VERIFIED").length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link
        to="/my-products"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to My Products
      </Link>

      <div className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{p.product_name}</h1>
            <p className="mt-1 text-muted-foreground">{p.brand}</p>
          </div>
          <span className="badge badge-verified">
            <ShieldCheck className="size-3.5" /> Registered
          </span>
        </div>

        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Product ID" value={p.product_code} mono />
          <Detail label="QR / Unique Code" value={p.unique_code} mono />
          <Detail label="Brand" value={p.brand} />
          <Detail label="Dealer / Company" value={p.dealers?.company_name ?? "—"} />
          <Detail label="Manufacturing Date" value={formatDate(p.manufacturing_date)} />
          <Detail label="Registration Date" value={formatDateTime(p.registration_date)} />
        </dl>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="stat-card">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <BadgeCheck className="size-5 text-success" />
          </div>
          <p className="mt-4 font-display text-3xl font-bold">{verified}</p>
          <p className="mt-1 text-sm text-muted-foreground">Successful verifications</p>
        </div>
        <div className="stat-card">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <CircleSlash className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-display text-3xl font-bold">{total}</p>
          <p className="mt-1 text-sm text-muted-foreground">Total scans of this product</p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-border px-6 py-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Verification activity
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Tested At</th>
              </tr>
            </thead>
            <tbody>
              {total === 0 && (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-muted-foreground">
                    This product has not been scanned yet.
                  </td>
                </tr>
              )}
              {checks.data?.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="badge badge-verified">Verified</span>
                  </td>
                  <td className="text-muted-foreground">{formatDateTime(c.tested_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className={`text-sm font-medium ${mono ? "font-mono break-all" : ""}`}>{value}</dd>
    </div>
  );
}
