ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neighborhood_verification_note text,
  ADD COLUMN IF NOT EXISTS neighborhood_verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS invited_reason text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    zip_code,
    neighborhood_verification_note,
    neighborhood_verification_status,
    invited_reason
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'zip_code', ''),
    NULLIF(NEW.raw_user_meta_data->>'neighborhood_verification_note', ''),
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'neighborhood_verification_note', '') IS NOT NULL THEN 'pending'
      ELSE 'unverified'
    END,
    NULLIF(NEW.raw_user_meta_data->>'invited_reason', '')
  );
  
  INSERT INTO public.seller_tiers (user_id, tier)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$function$;
