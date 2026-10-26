-- ==============================================================================
-- ParkMate Supabase Core Database Schema & Migrations
-- Complete Migration: Schema, Enums, Constraints, Triggers, RLS & Seed
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. CUSTOM TYPES / ENUMS
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('driver', 'owner', 'both', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_type AS ENUM ('compact', 'sedan', 'suv', 'truck', 'van', 'ev');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.space_category AS ENUM ('all', 'covered', 'ev_charging', 'daily', 'monthly', 'event', 'airport');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.access_type AS ENUM ('instant_keypad', 'app_remote', 'qr_scanner', 'on_site_attendant', 'physical_permit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publication_status AS ENUM ('draft', 'published', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'refunded', 'recovered');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM ('status_change', 'access_issue', 'extension', 'resolution', 'cancellation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_type AS ENUM ('access_failure', 'spot_blocked', 'dispute', 'moderation', 'damage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. HELPER FUNCTIONS FOR TIMESTAMPS
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLE: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'driver',
  is_superhost BOOLEAN NOT NULL DEFAULT FALSE,
  response_time TEXT NOT NULL DEFAULT 'within 10 mins',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role text;
  assigned_role public.user_role;
BEGIN
  raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'driver'));
  IF raw_role IN ('driver', 'owner', 'both') THEN
    assigned_role := raw_role::public.user_role;
  ELSE
    assigned_role := 'driver'::public.user_role;
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    phone,
    avatar_url,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'ParkMate Member'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to prevent non-admins from promoting themselves to 'admin'
CREATE OR REPLACE FUNCTION public.prevent_self_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin') THEN
    IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: Users cannot promote themselves to admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_admin_escalation ON public.profiles;
CREATE TRIGGER check_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_admin_escalation();

-- 5. TABLE: PARKING_SPACES
CREATE TABLE IF NOT EXISTS public.parking_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'San Francisco',
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  price_per_hour NUMERIC(8, 2) NOT NULL CHECK (price_per_hour >= 0),
  price_per_day NUMERIC(8, 2) NOT NULL CHECK (price_per_day >= 0),
  category public.space_category NOT NULL DEFAULT 'covered',
  photos TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  is_covered BOOLEAN NOT NULL DEFAULT FALSE,
  has_ev_charging BOOLEAN NOT NULL DEFAULT FALSE,
  ev_charger_type TEXT,
  verification_status public.verification_status NOT NULL DEFAULT 'verified',
  publication_status public.publication_status NOT NULL DEFAULT 'published',
  is_demo_seed BOOLEAN NOT NULL DEFAULT FALSE,
  walking_distance TEXT NOT NULL DEFAULT '2 min walk to transit',
  max_vehicle_type public.vehicle_type NOT NULL DEFAULT 'suv',
  clearance_feet NUMERIC(4, 2) NOT NULL CHECK (clearance_feet > 0),
  access_type public.access_type NOT NULL DEFAULT 'instant_keypad',
  access_instructions TEXT NOT NULL DEFAULT '',
  security_features TEXT[] NOT NULL DEFAULT '{}',
  rules TEXT[] NOT NULL DEFAULT '{}',
  recovery_guaranteed BOOLEAN NOT NULL DEFAULT TRUE,
  flexible_extension_supported BOOLEAN NOT NULL DEFAULT TRUE,
  available_slots_count INTEGER NOT NULL DEFAULT 1 CHECK (available_slots_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_parking_spaces
  BEFORE UPDATE ON public.parking_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. TABLE: AVAILABILITY_RULES
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  specific_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_availability_time_order CHECK (end_time > start_time)
);

CREATE TRIGGER handle_updated_at_availability_rules
  BEFORE UPDATE ON public.availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 7. TABLE: BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  booking_status public.booking_status NOT NULL DEFAULT 'confirmed',
  payment_status public.payment_status NOT NULL DEFAULT 'paid',
  hourly_rate NUMERIC(8, 2) NOT NULL CHECK (hourly_rate >= 0),
  subtotal NUMERIC(8, 2) NOT NULL CHECK (subtotal >= 0),
  service_fee NUMERIC(8, 2) NOT NULL CHECK (service_fee >= 0),
  tax NUMERIC(8, 2) NOT NULL CHECK (tax >= 0),
  total_price NUMERIC(8, 2) NOT NULL CHECK (total_price >= 0),
  vehicle_model TEXT NOT NULL,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'sedan',
  license_plate TEXT NOT NULL,
  access_code TEXT NOT NULL,
  can_extend BOOLEAN NOT NULL DEFAULT TRUE,
  recovery_status TEXT NOT NULL DEFAULT 'none' CHECK (recovery_status IN ('none', 'reported', 'recovered')),
  alternative_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overlapping_confirmed_bookings EXCLUDE USING gist (
    space_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (booking_status IN ('confirmed', 'active', 'pending'))
);

CREATE TRIGGER handle_updated_at_bookings
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 8. TABLE: BOOKING_EVENTS
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLE: REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger to recompute average rating & review count for space
CREATE OR REPLACE FUNCTION public.recompute_space_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_space_id UUID;
  new_avg NUMERIC(3, 2);
  new_count INTEGER;
BEGIN
  target_space_id := COALESCE(NEW.space_id, OLD.space_id);
  SELECT COALESCE(ROUND(AVG(rating), 2), 5.0), COUNT(*)
  INTO new_avg, new_count
  FROM public.reviews
  WHERE space_id = target_space_id;

  UPDATE public.parking_spaces
  SET rating = new_avg,
      review_count = new_count,
      updated_at = NOW()
  WHERE id = target_space_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_space_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_space_rating();

-- 10. TABLE: SAVED_SPACES
CREATE TABLE IF NOT EXISTS public.saved_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_saved_space UNIQUE (user_id, space_id)
);

-- 11. TABLE: REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.parking_spaces(id) ON DELETE SET NULL,
  report_type public.report_type NOT NULL,
  description TEXT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_reports
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 12. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_parking_spaces_owner ON public.parking_spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_pub_ver ON public.parking_spaces(publication_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_location ON public.parking_spaces(city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_coords ON public.parking_spaces(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_availability_rules_space ON public.availability_rules(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_times ON public.bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON public.booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_space ON public.reviews(space_id);
CREATE INDEX IF NOT EXISTS idx_saved_spaces_user ON public.saved_spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

-- 13. ATOMIC BOOKING FUNCTION (PostgreSQL Transaction Safety)
-- This function enforces availability, locks the space, recomputes pricing, and inserts booking + event atomically
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_driver_id UUID,
  p_space_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_vehicle_model TEXT,
  p_vehicle_type public.vehicle_type,
  p_license_plate TEXT,
  p_service_fee NUMERIC DEFAULT 2.50,
  p_tax_rate NUMERIC DEFAULT 0.08
)
RETURNS JSONB AS $$
DECLARE
  v_space RECORD;
  v_duration_hours NUMERIC;
  v_subtotal NUMERIC(8, 2);
  v_tax NUMERIC(8, 2);
  v_total NUMERIC(8, 2);
  v_booking_ref TEXT;
  v_access_code TEXT;
  v_new_booking_id UUID;
  v_conflict_count INTEGER;
BEGIN
  -- 1. Validate time range
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  -- 2. Lock space row to prevent race conditions
  SELECT * INTO v_space
  FROM public.parking_spaces
  WHERE id = p_space_id AND publication_status = 'published' AND verification_status = 'verified'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parking space not found or is currently not available for booking';
  END IF;

  -- 3. Check for conflicting active bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings
  WHERE space_id = p_space_id
    AND booking_status IN ('confirmed', 'active', 'pending')
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'This parking spot is already reserved for the selected timeframe';
  END IF;

  -- 4. Calculate prices strictly on server
  v_duration_hours := CEIL(EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0);
  IF v_duration_hours < 1 THEN
    v_duration_hours := 1;
  END IF;

  v_subtotal := ROUND(v_space.price_per_hour * v_duration_hours, 2);
  v_tax := ROUND(v_subtotal * p_tax_rate, 2);
  v_total := v_subtotal + p_service_fee + v_tax;

  -- 5. Generate human-readable reference & access code
  v_booking_ref := 'PM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 4));
  v_access_code := 'PASS-' || FLOOR(1000 + RANDOM() * 9000)::TEXT || '-' || UPPER(SUBSTRING(p_space_id::TEXT FROM 1 FOR 4));

  -- 6. Insert booking
  INSERT INTO public.bookings (
    booking_reference,
    driver_id,
    space_id,
    start_time,
    end_time,
    booking_status,
    payment_status,
    hourly_rate,
    subtotal,
    service_fee,
    tax,
    total_price,
    vehicle_model,
    vehicle_type,
    license_plate,
    access_code,
    can_extend,
    recovery_status
  ) VALUES (
    v_booking_ref,
    p_driver_id,
    p_space_id,
    p_start_time,
    p_end_time,
    'active',
    'paid',
    v_space.price_per_hour,
    v_subtotal,
    p_service_fee,
    v_tax,
    v_total,
    p_vehicle_model,
    p_vehicle_type,
    p_license_plate,
    v_access_code,
    v_space.flexible_extension_supported,
    'none'
  ) RETURNING id INTO v_new_booking_id;

  -- 7. Record initial event
  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    from_status,
    to_status,
    note,
    created_by,
    metadata
  ) VALUES (
    v_new_booking_id,
    'status_change',
    'created',
    'active',
    'Reservation confirmed and payment authorized',
    p_driver_id,
    jsonb_build_object('hours', v_duration_hours, 'total_price', v_total)
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'booking_reference', v_booking_ref,
    'total_price', v_total,
    'access_code', v_access_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 14.1 PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 14.2 PARKING_SPACES POLICIES
CREATE POLICY "Anyone can view published verified spaces"
  ON public.parking_spaces FOR SELECT
  USING (
    (publication_status = 'published' AND verification_status = 'verified')
    OR (auth.uid() = owner_id)
  );

CREATE POLICY "Owners can insert their own spaces"
  ON public.parking_spaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own spaces"
  ON public.parking_spaces FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own spaces"
  ON public.parking_spaces FOR DELETE
  USING (auth.uid() = owner_id);

-- 14.3 AVAILABILITY_RULES POLICIES
CREATE POLICY "Availability rules viewable for visible spaces"
  ON public.availability_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parking_spaces s
      WHERE s.id = availability_rules.space_id
      AND ((s.publication_status = 'published' AND s.verification_status = 'verified') OR s.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners manage their space availability rules"
  ON public.availability_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.parking_spaces s
      WHERE s.id = availability_rules.space_id
      AND s.owner_id = auth.uid()
    )
  );

-- 14.4 BOOKINGS POLICIES
-- Drivers can view their own bookings; Space owners can view bookings on their spaces
CREATE POLICY "Drivers and space owners can view associated bookings"
  ON public.bookings FOR SELECT
  USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parking_spaces s
      WHERE s.id = bookings.space_id AND s.owner_id = auth.uid()
    )
  );

-- Drivers can create bookings for themselves
CREATE POLICY "Drivers can insert bookings for themselves"
  ON public.bookings FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- Drivers can update their bookings (status or extension)
CREATE POLICY "Drivers and owners can update their bookings"
  ON public.bookings FOR UPDATE
  USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parking_spaces s
      WHERE s.id = bookings.space_id AND s.owner_id = auth.uid()
    )
  );

-- 14.5 BOOKING_EVENTS POLICIES
CREATE POLICY "Booking events viewable by booking participants"
  ON public.booking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_events.booking_id
      AND (b.driver_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.parking_spaces s WHERE s.id = b.space_id AND s.owner_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Booking participants can record events"
  ON public.booking_events FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_events.booking_id
      AND (b.driver_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.parking_spaces s WHERE s.id = b.space_id AND s.owner_id = auth.uid()
      ))
    )
  );

-- 14.6 REVIEWS POLICIES
CREATE POLICY "Reviews viewable by anyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Drivers with completed bookings can insert review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
      AND b.driver_id = auth.uid()
      AND b.booking_status IN ('completed', 'active')
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (reviewer_id = auth.uid());

-- 14.7 SAVED_SPACES POLICIES
CREATE POLICY "Users can manage their saved spaces"
  ON public.saved_spaces FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 14.8 REPORTS POLICIES
CREATE POLICY "Users can view their submitted reports"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update their reports"
  ON public.reports FOR UPDATE
  USING (reporter_id = auth.uid());

-- 15. STORAGE BUCKET CONFIGURATION
-- Note: Insert storage bucket if storage schema exists
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'parking-photos',
    'parking-photos',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public parking photos access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'parking-photos');
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload parking photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'parking-photos' AND auth.role() = 'authenticated');
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
