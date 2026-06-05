
-- Create neighborhood_suggestions table
CREATE TABLE public.neighborhood_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code text NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  upvote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create suggestion_upvotes table
CREATE TABLE public.suggestion_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.neighborhood_suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

-- RLS on neighborhood_suggestions
ALTER TABLE public.neighborhood_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suggestions are viewable by everyone"
  ON public.neighborhood_suggestions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create suggestions"
  ON public.neighborhood_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own suggestions"
  ON public.neighborhood_suggestions FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS on suggestion_upvotes
ALTER TABLE public.suggestion_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are viewable by everyone"
  ON public.suggestion_upvotes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can upvote"
  ON public.suggestion_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own upvote"
  ON public.suggestion_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to sync upvote_count
CREATE OR REPLACE FUNCTION public.update_suggestion_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.neighborhood_suggestions
      SET upvote_count = upvote_count + 1
      WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.neighborhood_suggestions
      SET upvote_count = upvote_count - 1
      WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER suggestion_upvote_count_trigger
  AFTER INSERT OR DELETE ON public.suggestion_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suggestion_upvote_count();
