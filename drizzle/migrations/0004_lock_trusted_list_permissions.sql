REVOKE ALL ON TABLE public.allowed_emails FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.allowed_emails TO service_role;