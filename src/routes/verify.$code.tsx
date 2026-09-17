import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CircleSlash, Loader2, ShieldCheck } from "lucide-react";
import { formatDate, productImageUrl, verifyCode } from "@/lib/products";

export const Route = createFileRoute("/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.code} — Smart Product Detector` },
      {
        name: "description",
        content:
          "Open this link to instantly check whether this product is registered by a verified dealer.",
      },
      { property: "og:title", content: "Product authenticity check" },
      {
        property: "og:description",
        content: "Instant verification of a registered product code.",
      },
    ],
  }),
  component: PublicVerify,
});

function PublicVerify() {
  const { code } = Route.useParams();
  const result = useQuery({
    queryKey: ["public-verify", code],
    queryFn: () => verifyCode(code),
    retry: false,
  });

  const photo = useQuery({
    queryKey: ["public-verify-photo", code, result.data],
    enabled: result.data?.status === "VERIFIED",
    queryFn: () =>
      productImageUrl(
        result.data?.status === "VERIFIED" ? result.data.product.image_url : null,
      ),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <header className="text-center">
        <span className="badge border-border bg-secondary text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Authenticity check
        </span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Product Verification</h1>
        <p className="mt-2 font-mono text-sm break-all text-muted-foreground">{code}</p>
      </header>

      {result.isLoading && (
        <div className="panel flex items-center justify-center gap-3 p-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Checking the registry…
        </div>
      )}

      {result.isError && (
        <div className="panel p-10 text-center text-sm text-destructive">
          {(result.error as Error).message}
        </div>
      )}

      {result.data?.status === "NOT_VERIFIED" && (
        <div className="panel border-destructive/40 p-10 text-center">
          <CircleSlash className="mx-auto size-12 text-destructive" />
          <h2 className="mt-4 text-2xl font-bold">Not Verified</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            This code is not in our registered product database. Treat this item as unverified and
            contact the seller before purchasing.
          </p>
        </div>
      )}

      {result.data?.status === "VERIFIED" && (
        <div className="panel overflow-hidden">
          <div className="border-b border-border p-8 text-center">
            <BadgeCheck className="mx-auto size-12 text-success" />
            <h2 className="mt-4 text-2xl font-bold">Verified Product</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Registered by {result.data.product.company_name}
            </p>
          </div>

          {photo.data && (
            <img
              src={photo.data}
              alt={`Photo of ${result.data.product.product_name}`}
              className="max-h-72 w-full object-cover"
              loading="lazy"
            />
          )}

          <dl className="grid gap-x-8 gap-y-5 p-8 sm:grid-cols-2">
            <Detail label="Product" value={result.data.product.product_name} />
            <Detail label="Brand" value={result.data.product.brand} />
            <Detail label="Category" value={result.data.product.category ?? "—"} />
            <Detail label="Product ID" value={result.data.product.product_code} mono />
            <Detail
              label="Manufactured"
              value={formatDate(result.data.product.manufacturing_date)}
            />
            <Detail label="Registered" value={formatDate(result.data.product.registration_date)} />
          </dl>
        </div>
      )}

      <div className="text-center">
        <Link to="/" className="btn btn-ghost">
          Check another product
        </Link>
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
