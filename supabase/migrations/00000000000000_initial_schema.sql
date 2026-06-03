CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign TEXT NOT NULL,
  grid_square TEXT,
  qth TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE qsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  callsign TEXT NOT NULL,
  qso_date DATE NOT NULL,
  time_on TIME NOT NULL,
  time_off TIME,
  band TEXT,
  freq NUMERIC(10,6),
  mode TEXT,
  submode TEXT,
  rst_sent TEXT,
  rst_rcvd TEXT,
  tx_pwr NUMERIC(6,1),
  name TEXT,
  qth TEXT,
  grid_square TEXT,
  comment TEXT,
  dxcc INTEGER,
  country TEXT,
  cq_zone INTEGER,
  itu_zone INTEGER,
  cont TEXT,
  qsl_sent TEXT,
  qsl_sent_via TEXT,
  qsl_rcvd TEXT,
  qsl_rcvd_via TEXT,
  lotw_qsl_sent TEXT,
  lotw_qsl_rcvd TEXT,
  eqsl_qsl_sent TEXT,
  eqsl_qsl_rcvd TEXT,
  prop_mode TEXT,
  sat_name TEXT,
  ant_az NUMERIC,
  ant_el NUMERIC,
  distance NUMERIC(10,2),
  operator TEXT,
  is_eyeball BOOLEAN DEFAULT false,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, callsign, qso_date, time_on, band)
);

CREATE TYPE equipment_type AS ENUM ('transceiver', 'receiver', 'transmitter', 'antenna', 'amplifier', 'filter', 'other');

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type equipment_type,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE qsl_method AS ENUM ('paper', 'lotw', 'eqsl');

CREATE TABLE qsl_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qso_id UUID REFERENCES qsos(id) ON DELETE CASCADE,
  method qsl_method NOT NULL,
  sent_status TEXT,
  received_status TEXT,
  sent_date DATE,
  received_date DATE,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (qso_id, method)
);

ALTER TABLE qsos ADD CONSTRAINT check_freq_positive CHECK (freq > 0 OR freq IS NULL);
ALTER TABLE qsos ADD CONSTRAINT check_distance_nonnegative CHECK (distance >= 0 OR distance IS NULL);
ALTER TABLE qsos ADD CONSTRAINT check_eyeball_or_band CHECK (is_eyeball = true OR band IS NOT NULL);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE qsl_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own QSOs" ON qsos FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Users can CRUD own equipment" ON equipment FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Users can CRUD own QSL cards" ON qsl_cards FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM qsos WHERE id = qso_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, callsign)
  VALUES (new.id, new.raw_user_meta_data->>'callsign');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
