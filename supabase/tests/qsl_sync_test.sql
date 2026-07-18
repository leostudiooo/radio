BEGIN;

DO $$
DECLARE
	test_qso_id UUID;
	paper_card public.qsl_cards%ROWTYPE;
	lotw_card public.qsl_cards%ROWTYPE;
	eqsl_card public.qsl_cards%ROWTYPE;
	test_qso public.qsos%ROWTYPE;
BEGIN
	INSERT INTO public.qsos (
		callsign,
		time_on,
		band,
		is_eyeball,
		qsl_sent,
		qsl_sent_via,
		qsl_rcvd,
		qsl_rcvd_via,
		lotw_qsl_sent,
		lotw_qsl_rcvd,
		eqsl_qsl_sent,
		eqsl_qsl_rcvd
	)
	VALUES (
		'TEST1',
		'2026-07-18T12:00:00Z',
		'20m',
		false,
		'Y',
		'D',
		'N',
		'B',
		'Y',
		'N',
		'Q',
		'Y'
	)
	RETURNING id INTO test_qso_id;

	IF (SELECT count(*) FROM public.qsl_cards WHERE qso_id = test_qso_id) <> 3 THEN
		RAISE EXCEPTION 'Expected paper, LoTW, and eQSL rows';
	END IF;

	SELECT * INTO STRICT paper_card
	FROM public.qsl_cards
	WHERE qso_id = test_qso_id AND method = 'paper';

	IF paper_card.sent_status <> 'sent'
		OR paper_card.received_status <> 'pending'
		OR paper_card.sent_via <> 'D'
		OR paper_card.received_via <> 'B'
	THEN
		RAISE EXCEPTION 'Paper QSL projection is incorrect';
	END IF;

	SELECT * INTO STRICT lotw_card
	FROM public.qsl_cards
	WHERE qso_id = test_qso_id AND method = 'lotw';

	IF lotw_card.sent_status <> 'sent' OR lotw_card.received_status <> 'pending' THEN
		RAISE EXCEPTION 'LoTW projection is incorrect';
	END IF;

	SELECT * INTO STRICT eqsl_card
	FROM public.qsl_cards
	WHERE qso_id = test_qso_id AND method = 'eqsl';

	IF eqsl_card.sent_status <> 'pending' OR eqsl_card.received_status <> 'received' THEN
		RAISE EXCEPTION 'eQSL projection is incorrect';
	END IF;

	UPDATE public.qsl_cards
	SET
		received_status = 'confirmed',
		received_date = '2026-07-18',
		sent_via = 'M'
	WHERE qso_id = test_qso_id AND method = 'paper';

	SELECT * INTO STRICT test_qso FROM public.qsos WHERE id = test_qso_id;

	IF test_qso.qsl_rcvd <> 'Y'
		OR test_qso.qsl_sent_via <> 'M'
		OR test_qso.verified_at IS NULL
	THEN
		RAISE EXCEPTION 'Paper card did not sync back to the QSO';
	END IF;

	UPDATE public.qsos
	SET
		lotw_qsl_sent = 'N',
		lotw_qsl_rcvd = 'Y'
	WHERE id = test_qso_id;

	SELECT * INTO STRICT lotw_card
	FROM public.qsl_cards
	WHERE qso_id = test_qso_id AND method = 'lotw';

	IF lotw_card.sent_status <> 'pending' OR lotw_card.received_status <> 'received' THEN
		RAISE EXCEPTION 'QSO changes did not sync back to LoTW';
	END IF;

	UPDATE public.qsos SET verified_at = now() WHERE id = test_qso_id;

	SELECT * INTO STRICT paper_card
	FROM public.qsl_cards
	WHERE qso_id = test_qso_id AND method = 'paper';

	IF paper_card.received_status <> 'confirmed' OR paper_card.received_date IS NULL THEN
		RAISE EXCEPTION 'Verification did not confirm the paper card';
	END IF;
END;
$$;

ROLLBACK;
