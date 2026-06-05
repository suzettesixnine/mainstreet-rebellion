
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

CREATE POLICY "Anyone can view event images" ON storage.objects FOR SELECT USING (bucket_id = 'events');
CREATE POLICY "Authenticated users can upload event images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'events' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own event images" ON storage.objects FOR DELETE USING (bucket_id = 'events' AND auth.uid()::text = (storage.foldername(name))[1]);
