ALTER TABLE public.qsos
	ADD COLUMN verification_code TEXT,
	ADD COLUMN verified_at TIMESTAMPTZ;

ALTER TABLE public.qsos
	ADD CONSTRAINT qsos_verification_code_format_check
	CHECK (verification_code IS NULL OR verification_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$');

CREATE UNIQUE INDEX qsos_verification_code_unique_idx
	ON public.qsos (verification_code)
	WHERE verification_code IS NOT NULL;

-- Codes already handwritten on paper cards before this workflow shipped.
UPDATE public.qsos
SET verification_code = CASE callsign
	WHEN 'BI4AYW' THEN '6VSKC6A8'
	WHEN 'BH4DFB' THEN '5A6JY5ZM'
END
WHERE callsign IN ('BI4AYW', 'BH4DFB')
	AND time_on >= '2026-07-10T00:00:00Z'
	AND time_on < '2026-07-11T00:00:00Z';

INSERT INTO public.qsl_cards (qso_id, method, sent_status, sent_date)
SELECT id, 'paper', 'sent', DATE '2026-07-10'
FROM public.qsos
WHERE verification_code IN ('6VSKC6A8', '5A6JY5ZM')
ON CONFLICT (qso_id, method) DO UPDATE
SET sent_status = 'sent', sent_date = excluded.sent_date;

-- Anonymous visitors and regular users may read public QSO fields, but not the code.
-- A table-level grant overrides a column-level revoke, so replace it with column grants.
REVOKE SELECT ON public.qsos FROM anon, authenticated;
GRANT SELECT (
	id, profile_id, callsign, time_on, time_off, band, freq, mode, submode,
	rst_sent, rst_rcvd, tx_pwr, name, qth, grid_square, comment, dxcc, country,
	cq_zone, itu_zone, cont, qsl_sent, qsl_sent_via, qsl_rcvd, qsl_rcvd_via,
	lotw_qsl_sent, lotw_qsl_rcvd, eqsl_qsl_sent, eqsl_qsl_rcvd, prop_mode,
	sat_name, ant_az, ant_el, distance, operator, is_eyeball, latitude, longitude,
	created_at, updated_at, verified_at
) ON public.qsos TO anon, authenticated;

REVOKE INSERT, UPDATE ON public.qsos FROM authenticated;
GRANT INSERT (
	profile_id, callsign, time_on, time_off, band, freq, mode, submode, rst_sent,
	rst_rcvd, tx_pwr, name, qth, grid_square, comment, dxcc, country, cq_zone,
	itu_zone, cont, qsl_sent, qsl_sent_via, qsl_rcvd, qsl_rcvd_via,
	lotw_qsl_sent, lotw_qsl_rcvd, eqsl_qsl_sent, eqsl_qsl_rcvd, prop_mode,
	sat_name, ant_az, ant_el, distance, operator, is_eyeball, latitude, longitude
) ON public.qsos TO authenticated;
GRANT UPDATE (
	callsign, time_on, time_off, band, freq, mode, submode, rst_sent, rst_rcvd,
	tx_pwr, name, qth, grid_square, comment, dxcc, country, cq_zone, itu_zone,
	cont, qsl_sent, qsl_sent_via, qsl_rcvd, qsl_rcvd_via, lotw_qsl_sent,
	lotw_qsl_rcvd, eqsl_qsl_sent, eqsl_qsl_rcvd, prop_mode, sat_name, ant_az,
	ant_el, distance, operator, is_eyeball, latitude, longitude, updated_at
) ON public.qsos TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_qso_verification_code(p_qso_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT q.verification_code
	FROM public.qsos AS q
	JOIN public.profiles AS p ON p.id = auth.uid()
	WHERE q.id = p_qso_id
		AND q.profile_id = auth.uid()
		AND p.role = 'admin'
	LIMIT 1;
$$;

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

	RETURN issued_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_qso_by_verification_code(code_input TEXT)
RETURNS TABLE (
	id UUID,
	callsign TEXT,
	time_on TIMESTAMPTZ,
	band TEXT,
	mode TEXT,
	rst_sent TEXT,
	rst_rcvd TEXT,
	verified_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT
		q.id,
		q.callsign,
		q.time_on,
		q.band,
		q.mode,
		q.rst_sent,
		q.rst_rcvd,
		q.verified_at
	FROM public.qsos AS q
	WHERE q.verification_code = upper(replace(code_input, '-', ''))
	LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.confirm_qso_by_code(code_input TEXT)
RETURNS TABLE (
	id UUID,
	callsign TEXT,
	time_on TIMESTAMPTZ,
	band TEXT,
	mode TEXT,
	rst_sent TEXT,
	rst_rcvd TEXT,
	verified_at TIMESTAMPTZ,
	already_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	qso_record public.qsos%ROWTYPE;
	was_verified BOOLEAN;
BEGIN
	SELECT *
	INTO qso_record
	FROM public.qsos AS q
	WHERE q.verification_code = upper(replace(code_input, '-', ''))
	LIMIT 1
	FOR UPDATE;

	IF NOT FOUND THEN
		RETURN;
	END IF;

	was_verified := qso_record.verified_at IS NOT NULL;

	IF NOT was_verified THEN
		UPDATE public.qsos AS q
		SET verified_at = now()
		WHERE q.id = qso_record.id
		RETURNING * INTO qso_record;
	END IF;

	RETURN QUERY SELECT
		qso_record.id,
		qso_record.callsign,
		qso_record.time_on,
		qso_record.band,
		qso_record.mode,
		qso_record.rst_sent,
		qso_record.rst_rcvd,
		qso_record.verified_at,
		was_verified;
END;
$$;

REVOKE ALL ON FUNCTION public.get_qso_by_verification_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_qso_by_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_qso_verification_code(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_qso_verification_code(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_qso_by_verification_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_qso_by_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_qso_verification_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_qso_verification_code(UUID, TEXT) TO authenticated;
