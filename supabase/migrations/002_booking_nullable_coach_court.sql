-- =========================================================================
-- 002_booking_nullable_coach_court.sql
-- Allows coach-only and court-only bookings by making coach_id and
-- court_id nullable in the bookings table, then updating the atomic
-- booking RPC to handle the three booking modes gracefully.
-- =========================================================================

-- 1. Drop NOT NULL constraints so court-only / coach-only rows are allowed
ALTER TABLE public.bookings ALTER COLUMN coach_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN court_id DROP NOT NULL;

-- 2. Replace the atomic booking function with a mode-aware version
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_service_id            uuid,
  p_coach_id              uuid,          -- NULL for court-only
  p_court_id              uuid,          -- NULL for coach-only
  p_coach_availability_id uuid,          -- NULL for court-only
  p_court_availability_id uuid,          -- NULL for coach-only
  p_start_at              timestamptz,
  p_end_at                timestamptz,
  p_client_name           text,
  p_client_email          text,
  p_client_phone          text,
  p_client_age            integer,
  p_guardian_name         text,
  p_guardian_phone        text,
  p_position              text,
  p_experience            text,
  p_goals                 text,
  p_client_notes          text,
  p_participants          jsonb DEFAULT NULL
)
RETURNS TABLE (
  booking_id        uuid,
  booking_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id   uuid;
  v_booking_id  uuid;
  v_booking_ref text;
  v_coach_status text;
  v_court_status text;
  v_training_fee numeric;
  v_court_fee    numeric;
  v_total_amount numeric;
  v_participant  jsonb;
BEGIN
  -- 1. Lock and inspect coach availability (if a coach slot was provided)
  IF p_coach_availability_id IS NOT NULL THEN
    SELECT status INTO v_coach_status
    FROM public.coach_availability
    WHERE id = p_coach_availability_id
    FOR UPDATE;

    IF v_coach_status IS NULL OR v_coach_status != 'available' THEN
      RAISE EXCEPTION 'Coach availability slot is no longer available.';
    END IF;
  END IF;

  -- 2. Lock and inspect court availability (if a court slot was provided)
  IF p_court_availability_id IS NOT NULL THEN
    SELECT status INTO v_court_status
    FROM public.court_availability
    WHERE id = p_court_availability_id
    FOR UPDATE;

    IF v_court_status IS NULL OR v_court_status != 'available' THEN
      RAISE EXCEPTION 'Court availability slot is no longer available.';
    END IF;
  END IF;

  -- 3. Fetch training fee snapshot from services table
  --    Always required — the service gives the booking its duration & category.
  SELECT price INTO v_training_fee
  FROM public.services
  WHERE id = p_service_id AND is_active = true;

  IF v_training_fee IS NULL THEN
    RAISE EXCEPTION 'Service not found or is inactive.';
  END IF;

  -- For court-only bookings (no coach assigned) the client does NOT pay
  -- the coaching/training fee — they only pay court rental.
  IF p_coach_id IS NULL THEN
    v_training_fee := 0;
  END IF;

  -- 4. Fetch court rental fee snapshot (0 when no court selected)
  IF p_court_id IS NOT NULL THEN
    SELECT rental_price INTO v_court_fee
    FROM public.courts
    WHERE id = p_court_id AND is_active = true;

    IF v_court_fee IS NULL THEN
      RAISE EXCEPTION 'Court not found or is inactive.';
    END IF;
  ELSE
    v_court_fee := 0;
  END IF;

  v_total_amount := v_training_fee + v_court_fee;

  -- 5. Create the client record
  INSERT INTO public.clients (
    full_name, email, phone, age,
    guardian_name, guardian_phone,
    basketball_position, experience_level, training_goals,
    notes, created_at, updated_at
  )
  VALUES (
    p_client_name, p_client_email, p_client_phone, p_client_age,
    p_guardian_name, p_guardian_phone,
    p_position, p_experience, p_goals,
    p_client_notes, now(), now()
  )
  RETURNING id INTO v_client_id;

  -- 6. Create the Booking entry
  INSERT INTO public.bookings (
    client_id, service_id, coach_id, court_id,
    coach_availability_id, court_availability_id,
    start_at, end_at,
    training_fee, court_fee, total_amount,
    status, created_at, updated_at
  )
  VALUES (
    v_client_id, p_service_id, p_coach_id, p_court_id,
    p_coach_availability_id, p_court_availability_id,
    p_start_at, p_end_at,
    v_training_fee, v_court_fee, v_total_amount,
    'PENDING_PAYMENT', now(), now()
  )
  RETURNING id, bookings.booking_reference INTO v_booking_id, v_booking_ref;

  -- 7. Insert participants for group sessions
  IF p_participants IS NOT NULL AND jsonb_array_length(p_participants) > 0 THEN
    FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
      INSERT INTO public.booking_participants (
        booking_id, client_id, participant_name, age, notes, created_at
      )
      VALUES (
        v_booking_id,
        v_client_id,
        v_participant->>'participant_name',
        (v_participant->>'age')::integer,
        v_participant->>'notes',
        now()
      );
    END LOOP;
  END IF;

  -- 8. Mark slots as booked in the availability calendars
  IF p_coach_availability_id IS NOT NULL THEN
    UPDATE public.coach_availability
    SET status = 'booked', updated_at = now()
    WHERE id = p_coach_availability_id;
  END IF;

  IF p_court_availability_id IS NOT NULL THEN
    UPDATE public.court_availability
    SET status = 'booked', updated_at = now()
    WHERE id = p_court_availability_id;
  END IF;

  RETURN QUERY SELECT v_booking_id, v_booking_ref;
END;
$$;
