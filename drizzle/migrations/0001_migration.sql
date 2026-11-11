ALTER TABLE public.sms_messages ADD COLUMN claimed_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_due_sms(_limit int DEFAULT 50)
RETURNS SETOF public.sms_messages LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.sms_messages SET status = 'sending', attempts = attempts + 1, claimed_at = now()
  WHERE id IN (
    SELECT id FROM public.sms_messages
    WHERE status = 'scheduled' AND scheduled_at <= now()
    ORDER BY scheduled_at LIMIT _limit
    FOR UPDATE SKIP LOCKED
  ) RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.timeout_stuck_sms()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.sms_messages SET status='failed', error='Timed out, check Brevo logs before retrying'
  WHERE status='sending' AND coalesce(claimed_at, scheduled_at) < now() - interval '10 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;