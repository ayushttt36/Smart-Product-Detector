import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeCheck, CircleSlash, PieChart, QrCode } from "lucide-react";
import { fetchRecentTests, fetchStats, formatDateTime } from "@/lib/products";
import { StatCard } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Verification Dashboard — Smart Product Detector" },
      {
        name: "description",
        content:
          "Live product-testing analytics: total scans, verified vs not-verified distribution and recent verification history.",
      },
      { property: "og:title", content: "Verification Dashboard — Smart Product Detector" },
      {
        property: "og:description",
        content: "Live analytics for every product verification attempt on the platform.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const history = useQuery({ queryKey: ["recent-tests"], queryFn: () => fetchRecentTests(15) });

  const total = stats.data?.total ?? 0;
  const verified = stats.data?.verified ?? 0;
  const notVerified = stats.data?.notVerified ?? 0;
  const verifiedPct = total ? Math.round((verified / total) * 100) : 0;

  return (
    <div className="space-y-10 py-4">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Verification Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overall product-testing activity recorded across the platform.
        </p>
      </header>

      <section className="grid gap-5 sm:grid-cols-3">
        <StatCard
          icon={<QrCode className="size-5 text-primary" />}
          label="Total Product Tests"
          value={stats.data?.total}
        />
        <StatCard
          icon={<BadgeCheck className="size-5 text-success" />}
          label="Verified Products"
          value={stats.data?.verified}
        />
        <StatCard
          icon={<CircleSlash className="size-5 text-destructive" />}
          label="Not Verified Products"
          value={stats.data?.notVerified}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <PieChart className="size-4 text-primary" /> Verified vs Not Verified
          </div>
          <Bar label="Verified" value={verified} total={total} tone="success" />
          <Bar label="Not Verified" value={notVerified} total={total} tone="destructive" />
          <p className="mt-6 text-sm text-muted-foreground">
            {total === 0
              ? "No verification attempts have been recorded yet."
              : `${verifiedPct}% of all scanned products were found in the registered product database.`}
          </p>
        </div>

        <div className="panel flex flex-col items-center justify-center p-6 text-center">
          <p className="field-label">Verification rate</p>
          <div
            className="relative mt-3 flex size-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-success) ${verifiedPct * 3.6}deg, var(--color-destructive) 0)`,
            }}
          >
            <div className="flex size-28 flex-col items-center justify-center rounded-full bg-card">
              <span className="font-display text-3xl font-bold">{verifiedPct}%</span>
              <span className="text-xs text-muted-foreground">verified</span>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {total} total test{total === 1 ? "" : "s"} recorded
          </p>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-6 py-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <Activity className="size-4 text-primary" /> Recent verification history
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Status</th>
                <th>Tested At</th>
              </tr>
            </thead>
            <tbody>
              {history.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    No products have been tested yet.
                  </td>
                </tr>
              )}
              {history.data?.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs">{row.scanned_code}</td>
                  <td>{row.product_name ?? "Unknown Product"}</td>
                  <td>
                    <span
                      className={
                        row.verification_status === "VERIFIED"
                          ? "badge badge-verified"
                          : "badge badge-unverified"
                      }
                    >
                      {row.verification_status === "VERIFIED" ? "Verified" : "Not Verified"}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{formatDateTime(row.tested_at)}</td>
                </tr>
              ))}
              {history.isLoading && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Loading activity…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "success" | "destructive";
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            tone === "success" ? "bg-success" : "bg-destructive"
          }`}
          style={{ width: `${Math.max(pct, total ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}
