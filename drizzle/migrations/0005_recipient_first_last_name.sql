ALTER TABLE public.recipients ADD COLUMN first_name text NOT NULL DEFAULT '', ADD COLUMN last_name text NOT NULL DEFAULT '';
ALTER TABLE public.recipients ALTER COLUMN name SET DEFAULT '';
UPDATE public.recipients SET first_name = split_part(trim(name), ' ', 1), last_name = trim(substr(trim(name), length(split_part(trim(name), ' ', 1)) + 1));
CREATE OR REPLACE FUNCTION public.sync_recipient_name() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.first_name := trim(NEW.first_name); NEW.last_name := trim(NEW.last_name);
  NEW.name := trim(NEW.first_name || ' ' || NEW.last_name);
  RETURN NEW;
END $$;
CREATE TRIGGER recipients_sync_name BEFORE INSERT OR UPDATE ON public.recipients FOR EACH ROW EXECUTE FUNCTION public.sync_recipient_name();