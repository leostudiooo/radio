-- The synchronization triggers were created after the initial qsl_cards backfill.
-- Touch their projected columns once so pre-existing cards become authoritative in qsos.
UPDATE public.qsl_cards
SET
	sent_status = sent_status,
	received_status = received_status,
	sent_via = sent_via,
	received_via = received_via;
