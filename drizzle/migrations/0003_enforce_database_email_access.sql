CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE OR REPLACE FUNCTION private.is_trusted_email(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = lower(_email));
$$;
REVOKE ALL ON FUNCTION private.is_trusted_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_trusted_email(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT lower(_email) = lower(auth.jwt()->>'email') AND private.is_trusted_email(_email);
$$;
REVOKE ALL ON FUNCTION public.is_allowed_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_allowed_email(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_allowed_email(auth.jwt()->>'email');
$$;
REVOKE ALL ON FUNCTION public.is_allowed_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_allowed_user() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_allowed_domain()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_trusted_email(NEW.email) THEN
    RAISE EXCEPTION 'This app is restricted to approved Google accounts.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_allowed_domain() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.enforce_allowed_domain() IS 'Legacy name retained for existing auth.users trigger; enforces the database exact-email allowlist, not domains.';