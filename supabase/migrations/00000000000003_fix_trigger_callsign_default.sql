-- Fix: handle_new_user trigger fails when callsign is missing in user metadata
-- Use COALESCE to default to empty string

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(1);
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    INSERT INTO public.profiles (id, callsign, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'callsign', ''), 'admin');
  ELSE
    INSERT INTO public.profiles (id, callsign, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'callsign', ''), 'user');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
