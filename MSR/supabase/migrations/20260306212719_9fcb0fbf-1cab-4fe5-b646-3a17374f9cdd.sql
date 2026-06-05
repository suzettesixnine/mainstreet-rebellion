
-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  zip_code text NOT NULL,
  event_date timestamp with time zone NOT NULL,
  event_end_date timestamp with time zone,
  category text NOT NULL DEFAULT 'general',
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discussions table
CREATE TABLE public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  zip_code text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discussions are viewable by everyone" ON public.discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discussion replies table
CREATE TABLE public.discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable by everyone" ON public.discussion_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON public.discussion_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their own replies" ON public.discussion_replies FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Event RSVPs table
CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSVPs are viewable by everyone" ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can RSVP" ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own RSVP" ON public.event_rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);
