import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Building2, PackagePlus, ScanLine } from "lucide-react";
import { fetchMyDealer, fetchMyProducts, formatDate } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/dealer")({
  head: () => ({
    meta: [
      { title: "Dealer Dashboard — Smart Product Detector" },
      {
        name: "description",
        content: "Your dealer workspace: registered product count, profile details and quick actions.",
      },
      { property: "og:title", content: "Dealer Dashboard — Smart Product Detector" },
      { property: "og:description", content: "Manage your registered products in one place." },
    ],
  }),
  component: DealerDashboard,
});

function DealerDashboard() {
  const dealer = useQuery({ queryKey: ["dealer"], queryFn: fetchMyDealer });
  const products = useQuery({ queryKey: ["my-products"], queryFn: fetchMyProducts });

  const latest = products.data?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8 py-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Dealer Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back{dealer.data ? `, ${dealer.data.dealer_name}` : ""}. Manage the products
            you have registered for verification.
          </p>
        </div>
        <Link to="/register-product" className="btn btn-primary">
          <PackagePlus className="size-4" /> Register Product
        </Link>
      </header>

      {!dealer.isLoading && !dealer.data && (
        <div className="panel border-warning/40 p-5 text-sm text-muted-foreground">
          You can register products right away — your dealer profile is created automatically from
          your account, and company details can be added later.
        </div>
      )}

      <section className="grid gap-5 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <Boxes className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-display text-4xl font-bold">{products.data?.length ?? "—"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Registered Products</p>
        </div>
        <div className="stat-card sm:col-span-2">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <Building2 className="size-5 text-accent" />
          </div>
          <p className="mt-4 font-display text-xl font-bold">
            {dealer.data?.company_name ?? "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dealer.data?.email ?? ""}
            {dealer.data?.phone ? ` · ${dealer.data.phone}` : ""}
          </p>
          {dealer.data?.address && (
            <p className="mt-1 text-sm text-muted-foreground">{dealer.data.address}</p>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <ScanLine className="size-4 text-primary" /> Latest registrations
          </span>
          <Link to="/my-products" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Product ID</th>
                <th>Brand</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {latest.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    You have not registered any products yet.
                  </td>
                </tr>
              )}
              {latest.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.product_name}</td>
                  <td className="font-mono text-xs">{p.product_code}</td>
                  <td className="text-muted-foreground">{p.brand}</td>
                  <td className="text-muted-foreground">{formatDate(p.registration_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
