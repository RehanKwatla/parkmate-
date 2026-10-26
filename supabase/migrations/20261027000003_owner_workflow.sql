-- ==============================================================================
-- ParkMate Migration: Full Owner Listing Workflow & Availability Conflict Prevention
-- Adds price_per_month, dimensions, authorization, availability conflict checking,
-- and verification admin review functions
-- ==============================================================================

-- 1. Add extra columns to parking_spaces for full wizard & specs
ALTER TABLE public.parking_spaces
  ADD COLUMN IF NOT EXISTS price_per_month NUMERIC(8, 2) CHECK (price_per_month >= 0),
  ADD COLUMN IF NOT EXISTS height_clearance_inches NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS space_dimensions TEXT DEFAULT '18ft x 9ft',
  ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft_step INTEGER DEFAULT 1;

-- 2. Add reason column to availability_rules
ALTER TABLE public.availability_rules
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Update public RLS policy for parking_spaces:
-- Published spaces are visible publicly in search; unpublished drafts/paused spaces are owner-only.
DROP POLICY IF EXISTS "Anyone can view published verified spaces" ON public.parking_spaces;
DROP POLICY IF EXISTS "Anyone can view published spaces" ON public.parking_spaces;

CREATE POLICY "Anyone can view published spaces"
  ON public.parking_spaces FOR SELECT
  USING (
    publication_status = 'published'
    OR (auth.uid() = owner_id)
  );

-- 4. Function: Check availability conflicts before adding a blocked date
CREATE OR REPLACE FUNCTION public.check_availability_conflicts(
  p_space_id UUID,
  p_date DATE,
  p_start_time TIME DEFAULT '00:00:00',
  p_end_time TIME DEFAULT '23:59:59'
)
RETURNS TABLE (
  booking_id UUID,
  booking_ref TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  driver_name TEXT,
  vehicle_model TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    b.booking_reference AS booking_ref,
    b.start_time,
    b.end_time,
    COALESCE(p.display_name, 'Driver') AS driver_name,
    b.vehicle_model
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  WHERE b.space_id = p_space_id
    AND b.booking_status IN ('confirmed', 'active', 'pending')
    AND tstzrange(b.start_time, b.end_time) && tstzrange(
      (p_date || ' ' || p_start_time)::timestamptz,
      (p_date || ' ' || p_end_time)::timestamptz
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Block availability with strict conflict prevention
CREATE OR REPLACE FUNCTION public.block_space_availability(
  p_space_id UUID,
  p_date DATE,
  p_start_time TIME DEFAULT '00:00:00',
  p_end_time TIME DEFAULT '23:59:59',
  p_reason TEXT DEFAULT 'Owner reserved / blocked'
)
RETURNS JSONB AS $$
DECLARE
  v_conflict_count INTEGER;
  v_first_conflict RECORD;
  v_new_rule_id UUID;
  v_owner_id UUID;
BEGIN
  -- Verify ownership
  SELECT owner_id INTO v_owner_id
  FROM public.parking_spaces
  WHERE id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parking space not found');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not own this space');
  END IF;

  -- Check for conflicting bookings
  SELECT COUNT(*), b.booking_reference, b.start_time, b.end_time
  INTO v_conflict_count, v_first_conflict
  FROM public.bookings b
  WHERE b.space_id = p_space_id
    AND b.booking_status IN ('confirmed', 'active', 'pending')
    AND tstzrange(b.start_time, b.end_time) && tstzrange(
      (p_date || ' ' || p_start_time)::timestamptz,
      (p_date || ' ' || p_end_time)::timestamptz
    )
  GROUP BY b.booking_reference, b.start_time, b.end_time
  LIMIT 1;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conflict: Existing booking ' || v_first_conflict.booking_reference || ' is already confirmed for this period.',
      'conflict_ref', v_first_conflict.booking_reference,
      'start_time', v_first_conflict.start_time,
      'end_time', v_first_conflict.end_time
    );
  END IF;

  -- Insert blocked rule
  INSERT INTO public.availability_rules (
    space_id,
    day_of_week,
    start_time,
    end_time,
    is_blocked,
    specific_date,
    reason
  ) VALUES (
    p_space_id,
    EXTRACT(DOW FROM p_date)::SMALLINT,
    p_start_time,
    p_end_time,
    TRUE,
    p_date,
    p_reason
  ) RETURNING id INTO v_new_rule_id;

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', v_new_rule_id,
    'message', 'Blocked period scheduled successfully without conflicts'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: Admin Verification Review
CREATE OR REPLACE FUNCTION public.review_space_verification(
  p_space_id UUID,
  p_status public.verification_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_space RECORD;
BEGIN
  SELECT * INTO v_space
  FROM public.parking_spaces
  WHERE id = p_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parking space not found');
  END IF;

  UPDATE public.parking_spaces
  SET 
    verification_status = p_status,
    updated_at = NOW()
  WHERE id = p_space_id;

  RETURN jsonb_build_object(
    'success', true,
    'space_id', p_space_id,
    'new_status', p_status,
    'notes', p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
