-- qsl_cards is the operational source of truth. The qsos QSL columns remain as
-- an ADIF-compatible projection maintained by the triggers below.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.qsl_cards
	ADD COLUMN sent_via TEXT,
	ADD COLUMN received_via TEXT;

UPDATE public.qsl_cards
SET
	sent_status = CASE
		WHEN sent_status IS NULL THEN NULL
		WHEN sent_status IN ('pending', 'sent', 'invalid') THEN sent_status
		WHEN sent_status IN ('received', 'confirmed') THEN 'sent'
		ELSE 'invalid'
	END,
	received_status = CASE
		WHEN received_status IS NULL THEN NULL
		WHEN received_status IN ('pending', 'received', 'confirmed', 'invalid') THEN received_status
		WHEN received_status = 'sent' THEN 'received'
		ELSE 'invalid'
	END;

ALTER TABLE public.qsl_cards
	ALTER COLUMN qso_id SET NOT NULL,
	ADD CONSTRAINT qsl_cards_sent_status_check
	CHECK (sent_status IS NULL OR sent_status IN ('pending', 'sent', 'invalid')),
	ADD CONSTRAINT qsl_cards_received_status_check
	CHECK (received_status IS NULL OR received_status IN ('pending', 'received', 'confirmed', 'invalid'));

-- Backfill normalized card rows from the legacy ADIF columns on qsos.
INSERT INTO public.qsl_cards (
	qso_id,
	method,
	sent_status,
	received_status,
	sent_via,
	received_via,
	received_date
)
SELECT
	id,
	'paper',
	CASE
		WHEN qsl_sent IS NULL THEN NULL
		WHEN upper(qsl_sent) = 'Y' THEN 'sent'
		WHEN upper(qsl_sent) = 'I' THEN 'invalid'
		ELSE 'pending'
	END,
	CASE
		WHEN verified_at IS NOT NULL THEN 'confirmed'
		WHEN upper(qsl_rcvd) = 'Y' THEN 'received'
		WHEN upper(qsl_rcvd) = 'I' THEN 'invalid'
		WHEN qsl_rcvd IS NULL THEN NULL
		ELSE 'pending'
	END,
	qsl_sent_via,
	qsl_rcvd_via,
	verified_at::date
FROM public.qsos
WHERE qsl_sent IS NOT NULL
	OR qsl_rcvd IS NOT NULL
	OR qsl_sent_via IS NOT NULL
	OR qsl_rcvd_via IS NOT NULL
	OR verified_at IS NOT NULL
ON CONFLICT (qso_id, method) DO UPDATE
SET
	sent_status = coalesce(public.qsl_cards.sent_status, excluded.sent_status),
	received_status = coalesce(public.qsl_cards.received_status, excluded.received_status),
	sent_via = coalesce(public.qsl_cards.sent_via, excluded.sent_via),
	received_via = coalesce(public.qsl_cards.received_via, excluded.received_via),
	received_date = coalesce(public.qsl_cards.received_date, excluded.received_date);

INSERT INTO public.qsl_cards (qso_id, method, sent_status, received_status)
SELECT
	id,
	'lotw',
	CASE
		WHEN lotw_qsl_sent IS NULL THEN NULL
		WHEN upper(lotw_qsl_sent) = 'Y' THEN 'sent'
		WHEN upper(lotw_qsl_sent) = 'I' THEN 'invalid'
		ELSE 'pending'
	END,
	CASE
		WHEN lotw_qsl_rcvd IS NULL THEN NULL
		WHEN upper(lotw_qsl_rcvd) = 'Y' THEN 'received'
		WHEN upper(lotw_qsl_rcvd) = 'I' THEN 'invalid'
		ELSE 'pending'
	END
FROM public.qsos
WHERE lotw_qsl_sent IS NOT NULL OR lotw_qsl_rcvd IS NOT NULL
ON CONFLICT (qso_id, method) DO UPDATE
SET
	sent_status = coalesce(public.qsl_cards.sent_status, excluded.sent_status),
	received_status = coalesce(public.qsl_cards.received_status, excluded.received_status);

INSERT INTO public.qsl_cards (qso_id, method, sent_status, received_status)
SELECT
	id,
	'eqsl',
	CASE
		WHEN eqsl_qsl_sent IS NULL THEN NULL
		WHEN upper(eqsl_qsl_sent) = 'Y' THEN 'sent'
		WHEN upper(eqsl_qsl_sent) = 'I' THEN 'invalid'
		ELSE 'pending'
	END,
	CASE
		WHEN eqsl_qsl_rcvd IS NULL THEN NULL
		WHEN upper(eqsl_qsl_rcvd) = 'Y' THEN 'received'
		WHEN upper(eqsl_qsl_rcvd) = 'I' THEN 'invalid'
		ELSE 'pending'
	END
FROM public.qsos
WHERE eqsl_qsl_sent IS NOT NULL OR eqsl_qsl_rcvd IS NOT NULL
ON CONFLICT (qso_id, method) DO UPDATE
SET
	sent_status = coalesce(public.qsl_cards.sent_status, excluded.sent_status),
	received_status = coalesce(public.qsl_cards.received_status, excluded.received_status);

CREATE OR REPLACE FUNCTION private.sync_qso_qsl_cards()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	IF pg_trigger_depth() > 1 THEN
		RETURN NEW;
	END IF;

	IF NEW.qsl_sent IS NOT NULL
		OR NEW.qsl_rcvd IS NOT NULL
		OR NEW.qsl_sent_via IS NOT NULL
		OR NEW.qsl_rcvd_via IS NOT NULL
		OR NEW.verified_at IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM public.qsl_cards
			WHERE qso_id = NEW.id AND method = 'paper'
		)
	THEN
		INSERT INTO public.qsl_cards (
			qso_id,
			method,
			sent_status,
			received_status,
			sent_via,
			received_via,
			received_date
		)
		VALUES (
			NEW.id,
			'paper',
			CASE
				WHEN NEW.qsl_sent IS NULL THEN NULL
				WHEN upper(NEW.qsl_sent) = 'Y' THEN 'sent'
				WHEN upper(NEW.qsl_sent) = 'I' THEN 'invalid'
				ELSE 'pending'
			END,
			CASE
				WHEN NEW.verified_at IS NOT NULL THEN 'confirmed'
				WHEN upper(NEW.qsl_rcvd) = 'Y' THEN 'received'
				WHEN upper(NEW.qsl_rcvd) = 'I' THEN 'invalid'
				WHEN NEW.qsl_rcvd IS NULL THEN NULL
				ELSE 'pending'
			END,
			NEW.qsl_sent_via,
			NEW.qsl_rcvd_via,
			NEW.verified_at::date
		)
		ON CONFLICT (qso_id, method) DO UPDATE
		SET
			sent_status = excluded.sent_status,
			received_status = excluded.received_status,
			sent_via = excluded.sent_via,
			received_via = excluded.received_via,
			received_date = coalesce(public.qsl_cards.received_date, excluded.received_date);
	END IF;

	IF NEW.lotw_qsl_sent IS NOT NULL
		OR NEW.lotw_qsl_rcvd IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM public.qsl_cards
			WHERE qso_id = NEW.id AND method = 'lotw'
		)
	THEN
		INSERT INTO public.qsl_cards (qso_id, method, sent_status, received_status)
		VALUES (
			NEW.id,
			'lotw',
			CASE
				WHEN NEW.lotw_qsl_sent IS NULL THEN NULL
				WHEN upper(NEW.lotw_qsl_sent) = 'Y' THEN 'sent'
				WHEN upper(NEW.lotw_qsl_sent) = 'I' THEN 'invalid'
				ELSE 'pending'
			END,
			CASE
				WHEN NEW.lotw_qsl_rcvd IS NULL THEN NULL
				WHEN upper(NEW.lotw_qsl_rcvd) = 'Y' THEN 'received'
				WHEN upper(NEW.lotw_qsl_rcvd) = 'I' THEN 'invalid'
				ELSE 'pending'
			END
		)
		ON CONFLICT (qso_id, method) DO UPDATE
		SET
			sent_status = excluded.sent_status,
			received_status = excluded.received_status;
	END IF;

	IF NEW.eqsl_qsl_sent IS NOT NULL
		OR NEW.eqsl_qsl_rcvd IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM public.qsl_cards
			WHERE qso_id = NEW.id AND method = 'eqsl'
		)
	THEN
		INSERT INTO public.qsl_cards (qso_id, method, sent_status, received_status)
		VALUES (
			NEW.id,
			'eqsl',
			CASE
				WHEN NEW.eqsl_qsl_sent IS NULL THEN NULL
				WHEN upper(NEW.eqsl_qsl_sent) = 'Y' THEN 'sent'
				WHEN upper(NEW.eqsl_qsl_sent) = 'I' THEN 'invalid'
				ELSE 'pending'
			END,
			CASE
				WHEN NEW.eqsl_qsl_rcvd IS NULL THEN NULL
				WHEN upper(NEW.eqsl_qsl_rcvd) = 'Y' THEN 'received'
				WHEN upper(NEW.eqsl_qsl_rcvd) = 'I' THEN 'invalid'
				ELSE 'pending'
			END
		)
		ON CONFLICT (qso_id, method) DO UPDATE
		SET
			sent_status = excluded.sent_status,
			received_status = excluded.received_status;
	END IF;

	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_qsl_card_to_qso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	sent_adif text := CASE NEW.sent_status
		WHEN 'sent' THEN 'Y'
		WHEN 'invalid' THEN 'N'
		WHEN 'pending' THEN 'Q'
		ELSE NULL
	END;
	received_adif text := CASE NEW.received_status
		WHEN 'received' THEN 'Y'
		WHEN 'confirmed' THEN 'Y'
		WHEN 'invalid' THEN 'N'
		WHEN 'pending' THEN 'N'
		ELSE NULL
	END;
BEGIN
	IF auth.uid() IS NOT NULL AND NOT EXISTS (
		SELECT 1
		FROM public.qsos
		WHERE id = NEW.qso_id AND profile_id = auth.uid()
	) THEN
		RAISE EXCEPTION 'QSL card does not belong to the authenticated user';
	END IF;

	CASE NEW.method
		WHEN 'paper' THEN
			UPDATE public.qsos
			SET
				qsl_sent = sent_adif,
				qsl_sent_via = NEW.sent_via,
				qsl_rcvd = received_adif,
				qsl_rcvd_via = NEW.received_via,
				verified_at = CASE
					WHEN NEW.received_status = 'confirmed' THEN coalesce(verified_at, now())
					WHEN TG_OP = 'UPDATE' AND OLD.received_status = 'confirmed' THEN NULL
					ELSE verified_at
				END
			WHERE id = NEW.qso_id;
		WHEN 'lotw' THEN
			UPDATE public.qsos
			SET
				lotw_qsl_sent = sent_adif,
				lotw_qsl_rcvd = received_adif
			WHERE id = NEW.qso_id;
		WHEN 'eqsl' THEN
			UPDATE public.qsos
			SET
				eqsl_qsl_sent = sent_adif,
				eqsl_qsl_rcvd = received_adif
			WHERE id = NEW.qso_id;
	END CASE;

	RETURN NEW;
END;
$$;

CREATE TRIGGER sync_qso_qsl_cards_after_write
	AFTER INSERT OR UPDATE OF
		qsl_sent,
		qsl_sent_via,
		qsl_rcvd,
		qsl_rcvd_via,
		lotw_qsl_sent,
		lotw_qsl_rcvd,
		eqsl_qsl_sent,
		eqsl_qsl_rcvd,
		verified_at
	ON public.qsos
	FOR EACH ROW
	EXECUTE FUNCTION private.sync_qso_qsl_cards();

CREATE TRIGGER sync_qsl_card_to_qso_after_write
	AFTER INSERT OR UPDATE OF method, sent_status, received_status, sent_via, received_via
	ON public.qsl_cards
	FOR EACH ROW
	EXECUTE FUNCTION private.sync_qsl_card_to_qso();

REVOKE ALL ON FUNCTION private.sync_qso_qsl_cards()
	FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_qsl_card_to_qso()
	FROM PUBLIC, anon, authenticated;

-- Issue the verification code and mark the paper card sent in one transaction.
CREATE OR REPLACE FUNCTION public.issue_qso_verification_code(p_qso_id UUID, p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	normalized_code TEXT := upper(replace(p_code, '-', ''));
	issued_code TEXT;
BEGIN
	IF normalized_code !~ '^[0-9A-HJKMNP-TV-Z]{8}$' THEN
		RAISE EXCEPTION 'Invalid verification code format';
	END IF;

	UPDATE public.qsos AS q
	SET verification_code = normalized_code
	WHERE q.id = p_qso_id
		AND q.profile_id = auth.uid()
		AND q.verification_code IS NULL
		AND EXISTS (
			SELECT 1 FROM public.profiles AS p
			WHERE p.id = auth.uid() AND p.role = 'admin'
		)
	RETURNING q.verification_code INTO issued_code;

	IF issued_code IS NULL THEN
		SELECT q.verification_code
		INTO issued_code
		FROM public.qsos AS q
		JOIN public.profiles AS p ON p.id = auth.uid()
		WHERE q.id = p_qso_id
			AND q.profile_id = auth.uid()
			AND p.role = 'admin';
	END IF;

	IF issued_code IS NOT NULL THEN
		INSERT INTO public.qsl_cards (qso_id, method, sent_status, sent_date)
		VALUES (p_qso_id, 'paper', 'sent', current_date)
		ON CONFLICT (qso_id, method) DO UPDATE
		SET
			sent_status = 'sent',
			sent_date = coalesce(public.qsl_cards.sent_date, excluded.sent_date);
	END IF;

	RETURN issued_code;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_qso_verification_code(UUID, TEXT)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_qso_verification_code(UUID, TEXT)
	TO authenticated;
