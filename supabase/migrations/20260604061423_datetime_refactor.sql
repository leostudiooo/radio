ALTER TABLE qsos
  ADD COLUMN time_on_ts TIMESTAMPTZ,
  ADD COLUMN time_off_ts TIMESTAMPTZ;

UPDATE qsos
SET time_on_ts = (qso_date + time_on) AT TIME ZONE 'UTC';

UPDATE qsos
SET time_off_ts = (qso_date + time_off) AT TIME ZONE 'UTC'
WHERE time_off IS NOT NULL;

ALTER TABLE qsos
  DROP CONSTRAINT qsos_profile_id_callsign_qso_date_time_on_band_key;

ALTER TABLE qsos
  DROP COLUMN qso_date,
  DROP COLUMN time_on,
  DROP COLUMN time_off;

ALTER TABLE qsos
  RENAME COLUMN time_on_ts TO time_on;

ALTER TABLE qsos
  RENAME COLUMN time_off_ts TO time_off;

ALTER TABLE qsos
  ALTER COLUMN time_on SET NOT NULL;

ALTER TABLE qsos
  ADD CONSTRAINT qsos_profile_id_callsign_time_on_band_key UNIQUE (profile_id, callsign, time_on, band);
