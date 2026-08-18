-- =========================================================================
-- 007_add_package_booking_rpc.sql
-- Installs an atomic transaction function to book sessions using package credits.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.create_booking_with_package(
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
  p_client_package_id     uuid
)
RETURNS TABLE (
  booking_id        uuid,
  booking_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
  v_package_code text;
  v_rem_sessions integer;
BEGIN
  -- 1. Verify client package has active credits
  SELECT package_code, remaining_sessions
  INTO v_package_code, v_rem_sessions
  FROM public.client_packages
  WHERE id = p_client_package_id AND status = 'ACTIVE'
  FOR UPDATE;

  IF v_package_code IS NULL OR v_rem_sessions <= 0 THEN
    RAISE EXCEPTION 'Package has no remaining sessions or is inactive.';
  END IF;

  -- 2. Lock and inspect coach availability (if provided)
  IF p_coach_availability_id IS NOT NULL THEN
    SELECT status INTO v_coach_status
    FROM public.coach_availability
    WHERE id = p_coach_availability_id
    FOR UPDATE;

    IF v_coach_status IS NULL OR v_coach_status != 'available' THEN
      RAISE EXCEPTION 'Coach availability slot is no longer available.';
    END IF;
  END IF;

  -- 3. Lock and inspect court availability (if provided)
  IF p_court_availability_id IS NOT NULL THEN
    SELECT status INTO v_court_status
    FROM public.court_availability
    WHERE id = p_court_availability_id
    FOR UPDATE;

    IF v_court_status IS NULL OR v_court_status != 'available' THEN
      RAISE EXCEPTION 'Court availability slot is no longer available.';
    END IF;
  END IF;

  -- 4. Fetch pricing snapshots from services & courts tables
  SELECT price INTO v_training_fee
  FROM public.services
  WHERE id = p_service_id AND is_active = true;

  IF v_training_fee IS NULL THEN
    RAISE EXCEPTION 'Service not found or is inactive.';
  END IF;

  IF p_coach_id IS NULL THEN
    v_training_fee := 0;
  END IF;

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

  -- 6. Create the Booking entry as CONFIRMED (funded by package)
  INSERT INTO public.bookings (
    client_id, service_id, coach_id, court_id,
    coach_availability_id, court_availability_id,
    start_at, end_at,
    training_fee, court_fee, total_amount,
    status, client_package_id, created_at, updated_at
  )
  VALUES (
    v_client_id, p_service_id, p_coach_id, p_court_id,
    p_coach_availability_id, p_court_availability_id,
    p_start_at, p_end_at,
    v_training_fee, v_court_fee, v_total_amount,
    'CONFIRMED', p_client_package_id, now(), now()
  )
  RETURNING id, bookings.booking_reference INTO v_booking_id, v_booking_ref;

  -- 7. Block slots in the availability calendars
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

  -- 8. Create verified Payment Record for audit tracking
  INSERT INTO public.payments (
    booking_id, payment_method, amount, reference_number, proof_storage_path, status, verified_at, created_at, updated_at
  )
  VALUES (
    v_booking_id,
    'Redeem Package Code',
    0.00,
    v_package_code,
    'reference-only',
    'verified',
    now(),
    now(),
    now()
  );

  -- 9. Decrement the package credits
  UPDATE public.client_packages
  SET remaining_sessions = remaining_sessions - 1,
      status = CASE WHEN remaining_sessions - 1 = 0 THEN 'EXHAUSTED' ELSE status END,
      updated_at = now()
  WHERE id = p_client_package_id;

  RETURN QUERY SELECT v_booking_id, v_booking_ref;
END;
$$;
