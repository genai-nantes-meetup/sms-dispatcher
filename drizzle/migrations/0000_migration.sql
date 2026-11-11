CREATE TYPE public.sms_status AS ENUM ('scheduled','sending','sent','failed');
CREATE TYPE public.sms_source AS ENUM ('form','csv');

CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(split_part(coalesce(_email,''), '@', 2)) IN ('samuel-berthe.fr','explorethevault.ai')
     AND array_length(string_to_array(coalesce(_email,''), '@'), 1) = 2;
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.is_allowed_email(auth.jwt()->>'email');
$$;

CREATE OR REPLACE FUNCTION public.enforce_allowed_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_allowed_email(NEW.email) THEN
    RAISE EXCEPTION 'This app is restricted to @samuel-berthe.fr and @explorethevault.ai accounts.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER enforce_allowed_domain_on_signup
BEFORE INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_allowed_domain();

CREATE TABLE public.recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT coalesce(auth.jwt()->>'email','system')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipients TO authenticated;
GRANT ALL ON public.recipients TO service_role;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed select" ON public.recipients FOR SELECT TO authenticated USING (public.is_allowed_user());
CREATE POLICY "allowed insert" ON public.recipients FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());
CREATE POLICY "allowed update" ON public.recipients FOR UPDATE TO authenticated USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
CREATE POLICY "allowed delete" ON public.recipients FOR DELETE TO authenticated USING (public.is_allowed_user());

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.recipients(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  content text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status public.sms_status NOT NULL DEFAULT 'scheduled',
  source public.sms_source NOT NULL DEFAULT 'form',
  import_batch_id uuid,
  brevo_message_id text,
  error text,
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT coalesce(auth.jwt()->>'email','system')
);
CREATE INDEX sms_messages_status_scheduled_idx ON public.sms_messages (status, scheduled_at);
CREATE INDEX sms_messages_batch_idx ON public.sms_messages (import_batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed select" ON public.sms_messages FOR SELECT TO authenticated USING (public.is_allowed_user());
CREATE POLICY "allowed insert" ON public.sms_messages FOR INSERT TO authenticated WITH CHECK (public.is_allowed_user());
CREATE POLICY "allowed update" ON public.sms_messages FOR UPDATE TO authenticated USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
CREATE POLICY "allowed delete" ON public.sms_messages FOR DELETE TO authenticated USING (public.is_allowed_user());

-- Atomic claim for the dispatcher (service role only)
CREATE OR REPLACE FUNCTION public.claim_due_sms(_limit int DEFAULT 50)
RETURNS SETOF public.sms_messages LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.sms_messages SET status = 'sending', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.sms_messages
    WHERE status = 'scheduled' AND scheduled_at <= now()
    ORDER BY scheduled_at LIMIT _limit
    FOR UPDATE SKIP LOCKED
  ) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_due_sms(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_sms(int) TO service_role;

-- Claim a single row for "send now" (prevents double send)
CREATE OR REPLACE FUNCTION public.timeout_stuck_sms()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.sms_messages SET status='failed', error='Timed out, check Brevo logs before retrying'
  WHERE status='sending' AND coalesce(sent_at, created_at) < now() - interval '10 minutes'
    AND scheduled_at < now() - interval '10 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.timeout_stuck_sms() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.timeout_stuck_sms() TO service_role;