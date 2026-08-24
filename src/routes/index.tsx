import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleSlash,
  QrCode,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Activity,
} from "lucide-react";
import { QrScanner } from "@/components/QrScanner";
import {
  fetchStats,
  formatDate,
  formatDateTime,
  verifyCode,
  type VerificationResult,
} from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Product Detector — Scan. Verify. Trust." },
      {
        name: "description",
        content:
          "Scan a product QR code to instantly confirm whether it is registered by a verified dealer in our product database.",
      },
      { property: "og:title", content: "Smart Product Detector — Scan. Verify. Trust." },
      {
        property: "og:description",
        content: "Instant QR-based product authenticity verification for buyers and dealers.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["stats"], queryFn: fetchStats });

  const verify = useMutation({
    mutationFn: (code: string) => verifyCode(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stats"] }),
  });

  const result = verify.data as VerificationResult | undefined;

  return (
    <div className="space-y-16">
      <section className="pt-8 text-center sm:pt-16">
        <span className="badge border-border bg-secondary text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Product authenticity platform
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Smart Product <span className="gradient-text">Detector</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Scan. Verify. Trust. Every genuine item is registered by its dealer with a unique QR
          code — scan it and we confirm in seconds whether the product exists in the registered
          product database.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#verify" className="btn btn-primary">
            <QrCode className="size-4" /> Verify a product
          </a>
          <Link to="/auth" className="btn btn-ghost">
            Dealer access
          </Link>
        </div>
      </section>

      <section id="verify" className="grid gap-6 lg:grid-cols-2">
        <QrScanner
          onCode={(code) => verify.mutate(code)}
          busy={verify.isPending}
          statusText={
            verify.isPending
              ? "Checking the code against the registered product database…"
              : undefined
          }
        />

        <div className="panel flex flex-col p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <Activity className="size-4 text-primary" /> Verification result
          </div>

          {verify.isError && (
            <p className="text-sm text-destructive">{(verify.error as Error).message}</p>
          )}

          {!result && !verify.isError && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <QrCode className="size-12 text-muted-foreground/60" />
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                Your verification result will appear here once a QR code has been scanned.
              </p>
            </div>
          )}

          {result?.status === "VERIFIED" && (
            <div className="result-verified flex-1 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-8 text-success" />
                <div>
                  <p className="font-display text-xl font-bold text-success">✓ VERIFIED PRODUCT</p>
                  <p className="text-xs text-muted-foreground">
                    Found in the registered product database.
                  </p>
                </div>
              </div>
              <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Product Name" value={result.product.product_name} />
                <Detail label="Product ID" value={result.product.product_code} mono />
                <Detail label="QR / Unique Code" value={result.product.unique_code} mono />
                <Detail label="Brand" value={result.product.brand} />
                <Detail label="Dealer / Company" value={result.product.company_name} />
                <Detail
                  label="Manufacturing Date"
                  value={formatDate(result.product.manufacturing_date)}
                />
                <Detail
                  label="Registration Date"
                  value={formatDateTime(result.product.registration_date)}
                />
              </dl>
            </div>
          )}

          {result?.status === "NOT_VERIFIED" && (
            <div className="result-unverified flex-1 p-5">
              <div className="flex items-center gap-3">
                <ShieldX className="size-8 text-destructive" />
                <div>
                  <p className="font-display text-xl font-bold text-destructive">
                    ✕ PRODUCT NOT VERIFIED
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The scanned product could not be found in the registered product database.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Detail label="Scanned Code" value={result.code} mono />
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Treat this item with caution. Ask the seller for a registered product code, or
                contact the brand before purchasing.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <StatCard
          icon={<QrCode className="size-5 text-primary" />}
          label="Total Products Tested"
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

export function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | undefined;
}) {
  return (
    <div className="stat-card">
      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
        {icon}
      </div>
      <p className="mt-4 font-display text-4xl font-bold">{value ?? "—"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
