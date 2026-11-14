-- Read-only database regression: trusted rows, exact matching, and security configuration.
-- Privileged helpers are deliberately not executable by the read-only inspection role.
WITH expected(email) AS (VALUES
  ('contact@samuel-berthe.fr'), ('ouvrard.dorian@gmail.com'),
  ('maxime.pitussi@gmail.com'), ('maxime@explorethevault.ai'),
  ('judie@explorethevault.ai'), ('r.wetteren@gmail.com'),
  ('emilie@dotconferences.eu')
), blocked(email) AS (VALUES
  ('other@samuel-berthe.fr'), ('other@explorethevault.ai'),
  ('other@gmail.com'), ('other@dotconferences.eu'),
  ('contact@mail.samuel-berthe.fr'), ('contact@evil-samuel-berthe.fr'),
  ('contact+extra@samuel-berthe.fr'), ('contact@samuel-berthe.fr '),
  (''), (NULL)
)
SELECT
  (SELECT count(*) = 7 FROM public.allowed_emails) AS exactly_seven,
  (SELECT bool_and(EXISTS (SELECT 1 FROM public.allowed_emails a WHERE a.email = lower(e.email))) FROM expected e) AS all_approved_allowed,
  (SELECT bool_and(NOT EXISTS (SELECT 1 FROM public.allowed_emails a WHERE a.email = lower(b.email))) FROM blocked b) AS all_unlisted_blocked,
  EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = lower('CONTACT@SAMUEL-BERTHE.FR')) AS case_insensitive,
  (SELECT prosecdef AND provolatile = 's' AND prosrc LIKE '%WHERE email = lower(_email)%'
   FROM pg_proc WHERE oid = 'private.is_trusted_email(text)'::regprocedure) AS live_helper_uses_exact_match,
  NOT has_table_privilege('authenticated', 'public.allowed_emails', 'INSERT') AS no_self_grant,
  NOT has_table_privilege('authenticated', 'public.allowed_emails', 'SELECT') AS list_private,
  NOT has_table_privilege('anon', 'public.allowed_emails', 'SELECT') AS no_public_list,
  NOT has_function_privilege('anon', 'public.is_allowed_user()', 'EXECUTE') AS no_anonymous_check,
  (SELECT count(*) = 8 AND bool_and(coalesce(qual, '') || coalesce(with_check, '') LIKE '%is_allowed_user()%')
   FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('sms_messages', 'recipients')) AS all_data_policies_gated,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'enforce_allowed_domain_on_signup' AND tgenabled = 'O') AS signup_trigger_enabled;