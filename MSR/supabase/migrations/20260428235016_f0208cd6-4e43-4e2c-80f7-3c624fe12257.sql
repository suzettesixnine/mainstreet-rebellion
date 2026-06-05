ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neighborhood_area text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  invite_token text;
  invite_reason text;
  invite_zip text;
BEGIN
  invite_token := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');

  IF invite_token IS NOT NULL THEN
    SELECT ti.invited_reason, ti.zip_code
    INTO invite_reason, invite_zip
    FROM public.tester_invites ti
    WHERE ti.token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
      AND ti.status = 'pending'
      AND ti.expires_at > now()
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    display_name,
    zip_code,
    neighborhood_area,
    neighborhood_verification_note,
    neighborhood_verification_status,
    invited_reason
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'zip_code', ''), invite_zip),
    NULLIF(NEW.raw_user_meta_data->>'neighborhood_area', ''),
    NULLIF(NEW.raw_user_meta_data->>'neighborhood_verification_note', ''),
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'neighborhood_verification_note', '') IS NOT NULL THEN 'pending'
      ELSE 'unverified'
    END,
    COALESCE(invite_reason, NULLIF(NEW.raw_user_meta_data->>'invited_reason', ''))
  );
  
  INSERT INTO public.seller_tiers (user_id, tier)
  VALUES (NEW.id, 'free');

  IF invite_token IS NOT NULL THEN
    UPDATE public.tester_invites
    SET status = 'accepted', accepted_by = NEW.id, accepted_at = now()
    WHERE token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
      AND status = 'pending'
      AND expires_at > now();
  END IF;
  
  RETURN NEW;
END;
$function$;