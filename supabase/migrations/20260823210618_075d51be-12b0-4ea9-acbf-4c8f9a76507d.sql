CREATE TABLE public.dealers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  dealer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX dealers_email_key ON public.dealers (lower(email));

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  manufacturing_date DATE,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_dealer_id_idx ON public.products (dealer_id);

CREATE TABLE public.verification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_code TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('VERIFIED','NOT_VERIFIED')),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX verification_history_tested_at_idx ON public.verification_history (tested_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealers TO authenticated;
GRANT ALL ON public.dealers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
GRANT SELECT, INSERT ON public.verification_history TO authenticated;
GRANT SELECT, INSERT ON public.verification_history TO anon;
GRANT ALL ON public.verification_history TO service_role;

ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers manage own profile" ON public.dealers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dealers manage own products" ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = products.dealer_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = products.dealer_id AND d.user_id = auth.uid()));

CREATE POLICY "Anyone can look up products" ON public.products FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can read verification history" ON public.verification_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can record a scan" ON public.verification_history FOR INSERT TO anon, authenticated WITH CHECK (true);