import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyDealer } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/register-product")({
  head: () => ({
    meta: [
      { title: "Register a Product — Smart Product Detector" },
      {
        name: "description",
        content:
          "Add a product with its unique QR code so buyers can verify its authenticity instantly.",
      },
      { property: "og:title", content: "Register a Product — Smart Product Detector" },
      { property: "og:description", content: "Make your product verifiable in seconds." },
    ],
  }),
  component: RegisterProduct,
});

function RegisterProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dealer = useQuery({ queryKey: ["dealer"], queryFn: ensureMyDealer, retry: false });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_name: "",
    product_code: "",
    unique_code: "",
    brand: "",
    manufacturing_date: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const dealerRow = dealer.data ?? (await ensureMyDealer());
      const { error: insertError } = await supabase.from("products").insert({
        dealer_id: dealerRow.id,
        product_name: form.product_name.trim(),
        product_code: form.product_code.trim(),
        unique_code: form.unique_code.trim(),
        brand: form.brand.trim(),
        manufacturing_date: form.manufacturing_date || null,
      });
      if (insertError) {
        if (insertError.code === "23505" || insertError.message.includes("duplicate")) {
          throw new Error("A product with this QR / unique code is already registered.");
        }
        throw new Error("The product could not be saved. Please try again.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-products"] });
      navigate({ to: "/my-products" });
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (
      !form.product_name.trim() ||
      !form.product_code.trim() ||
      !form.unique_code.trim() ||
      !form.brand.trim()
    ) {
      setError("Product name, product ID, QR / unique code and brand are all required.");
      return;
    }
    save.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Register Product</h1>
        <p className="mt-2 text-muted-foreground">
          The product is linked to your dealer account automatically, and the registration date is
          recorded by the system.
        </p>
      </header>

      <form className="panel space-y-4 p-6 sm:p-8" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="product_name">
            Product Name
          </label>
          <input
            id="product_name"
            className="field-input"
            value={form.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            placeholder="Wireless Earbuds Pro"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="product_code">
              Product ID
            </label>
            <input
              id="product_code"
              className="field-input font-mono"
              value={form.product_code}
              onChange={(e) => set("product_code", e.target.value)}
              placeholder="SKU-10293"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="brand">
              Brand
            </label>
            <input
              id="brand"
              className="field-input"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Acme Audio"
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="unique_code">
            QR / Unique Code
          </label>
          <input
            id="unique_code"
            className="field-input font-mono"
            value={form.unique_code}
            onChange={(e) => set("unique_code", e.target.value)}
            placeholder="The exact value encoded in the product QR code"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="manufacturing_date">
              Manufacturing Date
            </label>
            <input
              id="manufacturing_date"
              type="date"
              className="field-input"
              value={form.manufacturing_date}
              onChange={(e) => set("manufacturing_date", e.target.value)}
            />
          </div>
          <div>
            <span className="field-label">Dealer</span>
            <p className="field-input !bg-secondary text-muted-foreground">
              {dealer.data?.company_name ?? "Your dealer account"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button className="btn btn-primary w-full" disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PackagePlus className="size-4" />
          )}
          Save product
        </button>
      </form>
    </div>
  );
}
