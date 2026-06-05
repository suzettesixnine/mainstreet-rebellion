
CREATE TYPE public.seller_tier AS ENUM ('free', 'seller', 'pro');

CREATE TABLE public.seller_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier seller_tier NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  featured_slots_used integer NOT NULL DEFAULT 0,
  featured_slots_reset_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tiers are viewable by everyone"
  ON public.seller_tiers FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can update their own tier"
  ON public.seller_tiers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tier"
  ON public.seller_tiers FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

-- Auto-create seller_tiers row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.seller_tiers (user_id, tier)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$;

-- Backfill existing users who don't have a seller_tiers row
INSERT INTO public.seller_tiers (user_id, tier)
SELECT p.user_id, 'free'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.seller_tiers st WHERE st.user_id = p.user_id
);
