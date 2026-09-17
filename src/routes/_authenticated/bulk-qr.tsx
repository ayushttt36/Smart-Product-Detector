import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileDown, Loader2, QrCode, Sparkles } from "lucide-react";
import { bulkCreateProducts, PRODUCT_CATEGORIES, type BulkDraft, type Product } from "@/lib/products";
import { buildQrSheetPdf, qrDataUrl, randomCode, verifyUrl } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/bulk-qr")({
  head: () => ({
    meta: [
      { title: "Bulk QR Generator — Smart Product Detector" },
      {
        name: "description",
        content:
          "Create many product QR codes at once and download them as a printable PDF label sheet.",
      },
      { property: "og:title", content: "Bulk QR Generator — Smart Product Detector" },
      { property: "og:description", content: "Generate and print product QR codes in batches." },
    ],
  }),
  component: BulkQr,
});

function BulkQr() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    product_name: "",
    brand: "",
    category: "",
    prefix: "SPD",
    quantity: 10,
    manufacturing_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Product[]>([]);
  const [previews, setPreviews] = useState<{ code: string; png: string }[]>([]);

  function set(key: keyof typeof form, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const generate = useMutation({
    mutationFn: async () => {
      const quantity = Math.min(Math.max(Number(form.quantity) || 0, 1), 200);
      const used = new Set<string>();
      const drafts: BulkDraft[] = [];
      while (drafts.length < quantity) {
        const code = randomCode(form.prefix.trim().toUpperCase() || "SPD");
        if (used.has(code)) continue;
        used.add(code);
        drafts.push({
          product_name: form.product_name.trim(),
          brand: form.brand.trim(),
          category: form.category || null,
          product_code: code,
          unique_code: code,
          manufacturing_date: form.manufacturing_date || null,
        });
      }
      const rows = await bulkCreateProducts(drafts);
      const pngs = await Promise.all(
        rows.slice(0, 24).map(async (r) => ({
          code: r.unique_code,
          png: await qrDataUrl(verifyUrl(r.unique_code), 240),
        })),
      );
      return { rows, pngs };
    },
    onSuccess: async ({ rows, pngs }) => {
      setCreated(rows);
      setPreviews(pngs);
      await queryClient.invalidateQueries({ queryKey: ["my-products"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const download = useMutation({
    mutationFn: async () => {
      const doc = await buildQrSheetPdf(
        created.map((p) => ({
          code: p.unique_code,
          title: p.product_name,
          subtitle: p.brand,
        })),
        `${created[0]?.product_name ?? "Products"} — QR label sheet`,
      );
      doc.save(`qr-labels-${Date.now()}.pdf`);
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.product_name.trim() || !form.brand.trim()) {
      setError("Product name and brand are required.");
      return;
    }
    generate.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Bulk QR Generator</h1>
        <p className="mt-2 text-muted-foreground">
          Register a whole batch in one go. Each item gets its own unique code and QR label you can
          print and stick on the packaging.
        </p>
      </header>

      <form className="panel space-y-4 p-6 sm:p-8" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="bulk_name">
              Product Name
            </label>
            <input
              id="bulk_name"
              className="field-input"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              placeholder="Wireless Earbuds Pro"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="bulk_brand">
              Brand
            </label>
            <input
              id="bulk_brand"
              className="field-input"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Acme Audio"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="bulk_category">
              Category
            </label>
            <select
              id="bulk_category"
              className="field-input"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">No category</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="bulk_prefix">
              Code prefix
            </label>
            <input
              id="bulk_prefix"
              className="field-input font-mono"
              value={form.prefix}
              onChange={(e) => set("prefix", e.target.value)}
              placeholder="SPD"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="bulk_qty">
              How many (1–200)
            </label>
            <input
              id="bulk_qty"
              type="number"
              min={1}
              max={200}
              className="field-input"
              value={form.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="sm:w-1/2">
          <label className="field-label" htmlFor="bulk_mfg">
            Manufacturing Date
          </label>
          <input
            id="bulk_mfg"
            type="date"
            className="field-input"
            value={form.manufacturing_date}
            onChange={(e) => set("manufacturing_date", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button className="btn btn-primary w-full" disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate batch
        </button>
      </form>

      {created.length > 0 && (
        <section className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <QrCode className="size-4 text-primary" /> {created.length} codes created
            </div>
            <button
              className="btn btn-primary"
              onClick={() => download.mutate()}
              disabled={download.isPending}
            >
              {download.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              Download printable PDF
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {previews.map((p) => (
              <div key={p.code} className="rounded-xl border border-border bg-card p-3 text-center">
                <img src={p.png} alt={`QR code ${p.code}`} className="mx-auto w-full rounded-lg" />
                <p className="mt-2 font-mono text-[10px] break-all text-muted-foreground">
                  {p.code}
                </p>
              </div>
            ))}
          </div>
          {created.length > previews.length && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing the first {previews.length} — all {created.length} are in the PDF.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
