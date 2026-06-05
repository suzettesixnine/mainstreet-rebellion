CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.tester_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid,
  invited_by_label text,
  invited_reason text NOT NULL DEFAULT 'You were invited to help test Mainstreet Rebellion in your neighborhood.',
  zip_code text,
  status text NOT NULL DEFAULT 'pending',
  accepted_by uuid,
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tester_invites' AND policyname = 'Inviters can view their own invites'
  ) THEN
    CREATE POLICY "Inviters can view their own invites"
    ON public.tester_invites
    FOR SELECT
    TO authenticated
    USING (auth.uid() = invited_by OR auth.uid() = accepted_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tester_invites' AND policyname = 'Authenticated users can create tester invites'
  ) THEN
    CREATE POLICY "Authenticated users can create tester invites"
    ON public.tester_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = invited_by);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tester_invites_token_hash ON public.tester_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_tester_invites_status_expires_at ON public.tester_invites(status, expires_at);

DROP TRIGGER IF EXISTS update_tester_invites_updated_at ON public.tester_invites;
CREATE TRIGGER update_tester_invites_updated_at
BEFORE UPDATE ON public.tester_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_tester_invite(_token text)
RETURNS TABLE (
  invite_id uuid,
  email text,
  invited_by_label text,
  invited_reason text,
  zip_code text,
  expires_at timestamp with time zone,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    ti.id,
    ti.email,
    ti.invited_by_label,
    ti.invited_reason,
    ti.zip_code,
    ti.expires_at,
    CASE
      WHEN ti.status <> 'pending' THEN ti.status
      WHEN ti.expires_at <= now() THEN 'expired'
      ELSE 'pending'
    END AS status
  FROM public.tester_invites ti
  WHERE ti.token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_tester_invite(_token text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.tester_invites
  SET status = 'accepted', accepted_by = _user_id, accepted_at = now()
  WHERE token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
    AND status = 'pending'
    AND expires_at > now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;