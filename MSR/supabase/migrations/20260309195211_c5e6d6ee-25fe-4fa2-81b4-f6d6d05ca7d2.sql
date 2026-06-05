
-- Add digital product columns to listings
ALTER TABLE public.listings ADD COLUMN is_digital boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN digital_file_url text;

-- Create private storage bucket for digital products
INSERT INTO storage.buckets (id, name, public) VALUES ('digital-products', 'digital-products', false);

-- RLS: Sellers can upload their own digital files
CREATE POLICY "Sellers can upload digital files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'digital-products' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Sellers can update/delete their own digital files
CREATE POLICY "Sellers can manage their digital files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'digital-products' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Authenticated users can download digital files
CREATE POLICY "Authenticated users can download digital files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'digital-products');
