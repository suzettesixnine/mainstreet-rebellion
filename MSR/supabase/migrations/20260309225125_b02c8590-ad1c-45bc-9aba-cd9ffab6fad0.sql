
CREATE TABLE public.event_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event comments are viewable by everyone"
  ON public.event_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.event_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON public.event_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
