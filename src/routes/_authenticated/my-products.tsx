import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackagePlus, Package } from "lucide-react";
import { fetchMyProducts, formatDate } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/my-products")({
  head: () => ({
    meta: [
      { title: "My Products — Smart Product Detector" },
      {
        name: "description",
        content: "Every product you have registered, with its unique verification code.",
      },
      { property: "og:title", content: "My Products — Smart Product Detector" },
      { property: "og:description", content: "Your registered product catalogue." },
    ],
  }),
  component: MyProducts,
});

function MyProducts() {
  const products = useQuery({ queryKey: ["my-products"], queryFn: fetchMyProducts });

  return (
    <div className="space-y-8 py-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">My Products</h1>
          <p className="mt-2 text-muted-foreground">
            Products registered under your dealer account.
          </p>
        </div>
        <Link to="/register-product" className="btn btn-primary">
          <PackagePlus className="size-4" /> Register Product
        </Link>
      </header>

      {products.isError && (
        <p className="text-sm text-destructive">{(products.error as Error).message}</p>
      )}

      {products.data?.length === 0 && (
        <div className="panel flex flex-col items-center p-12 text-center">
          <Package className="size-10 text-muted-foreground/70" />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            No products yet. Register your first product to make it verifiable by buyers.
          </p>
        </div>
      )}

      {!!products.data?.length && (
        <>
          <div className="panel hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Product ID</th>
                    <th>QR / Unique Code</th>
                    <th>Brand</th>
                    <th>Mfg. Date</th>
                    <th>Registered</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.data.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.product_name}</td>
                      <td className="font-mono text-xs">{p.product_code}</td>
                      <td className="font-mono text-xs">{p.unique_code}</td>
                      <td className="text-muted-foreground">{p.brand}</td>
                      <td className="text-muted-foreground">{formatDate(p.manufacturing_date)}</td>
                      <td className="text-muted-foreground">{formatDate(p.registration_date)}</td>
                      <td>
                        <Link
                          to="/product/$id"
                          params={{ id: p.id }}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:hidden">
            {products.data.map((p) => (
              <div key={p.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{p.product_name}</h2>
                  <span className="badge border-border bg-secondary text-muted-foreground">
                    {p.brand}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs break-all text-muted-foreground">
                  {p.unique_code}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Registered {formatDate(p.registration_date)}
                </p>
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="btn btn-ghost mt-4 w-full"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
