
CREATE TABLE public.storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  banner_url TEXT,
  operating_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON public.storefronts FOR SELECT USING (true);

CREATE POLICY "Owner manage" ON public.storefronts FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
