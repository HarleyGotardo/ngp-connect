-- supabase/migrations/001_initial_schema.sql
-- MVP database schema for New Gen Performance (NGP) Booking System

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. TABLES
-- =========================================================================

-- profiles: authenticated admin/coach users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'coach')) DEFAULT 'coach',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- services: basketball training packages
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- courts: location and rental pricing details
CREATE TABLE public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  description text,
  rental_price numeric(10, 2) NOT NULL CHECK (rental_price >= 0),
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- coach_availability: manually scheduled coach hours
CREATE TABLE public.coach_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'booked', 'blocked')) DEFAULT 'available',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT coach_availability_time_check CHECK (start_at < end_at)
);

-- court_availability: manually scheduled court hours
CREATE TABLE public.court_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'booked', 'blocked')) DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT court_availability_time_check CHECK (start_at < end_at)
);

-- clients: user contact and optional details
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  age integer NOT NULL CHECK (age > 0),
  guardian_name text,
  guardian_phone text,
  basketball_position text,
  experience_level text,
  training_goals text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT minor_guardian_check CHECK (
    (age >= 18) OR 
    (age < 18 AND guardian_name IS NOT NULL AND guardian_phone IS NOT NULL)
  )
);

-- bookings: the core booking record containing snapshots of historical fees
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  coach_availability_id uuid REFERENCES public.coach_availability(id) ON DELETE SET NULL,
  court_availability_id uuid REFERENCES public.court_availability(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  training_fee numeric(10, 2) NOT NULL CHECK (training_fee >= 0),
  court_fee numeric(10, 2) NOT NULL CHECK (court_fee >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED')) DEFAULT 'PENDING_PAYMENT',
  cancellation_reason text,
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT booking_time_check CHECK (start_at < end_at)
);

-- booking_participants: for small groups or 2-on-1 training
CREATE TABLE public.booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  participant_name text NOT NULL,
  age integer CHECK (age > 0),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- payments: proof of manual payment reference and file path
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  reference_number text,
  proof_storage_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')) DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- refunds: manual refund verification tracks
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'refunded')) DEFAULT 'pending',
  requested_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  admin_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- reviews: public feedback and testimonials
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- settings: single-row general business layout details
CREATE TABLE public.settings (
  id integer PRIMARY KEY CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'New Gen Performance',
  coach_name text NOT NULL DEFAULT 'Coach Paul',
  business_description text,
  contact_phone text,
  contact_email text,
  gcash_name text,
  gcash_number text,
  gcash_qr_path text,
  maya_name text,
  maya_number text,
  maya_qr_path text,
  payment_instructions text,
  cancellation_hours integer DEFAULT 24 NOT NULL,
  instagram_url text,
  facebook_url text,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =========================================================================
-- 3. TRIGGERS & FUNCTIONS FOR AUTOMATION
-- =========================================================================

-- Trigger to create a profile automatically when a user signs up via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Coach Coach Paul'),
    coalesce(new.raw_user_meta_data->>'role', 'coach'),
    now(),
    now()
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to generate a booking reference (e.g. NGP-2026-00042)
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS trigger AS $$
DECLARE
  v_year text;
  v_seq integer;
  v_ref text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Counts bookings of the current year to use as a sequence suffix
  SELECT count(*) + 1 
  INTO v_seq 
  FROM public.bookings 
  WHERE to_char(created_at, 'YYYY') = v_year;
  
  v_ref := 'NGP-' || v_year || '-' || lpad(v_seq::text, 5, '0');
  
  -- Loop just in case of conflicts (race condition fallback)
  WHILE EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = v_ref) LOOP
    v_seq := v_seq + 1;
    v_ref := 'NGP-' || v_year || '-' || lpad(v_seq::text, 5, '0');
  END LOOP;
  
  new.booking_reference := v_ref;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_booking_reference
BEFORE INSERT ON public.bookings
FOR EACH ROW
WHEN (new.booking_reference IS NULL)
EXECUTE FUNCTION public.generate_booking_reference();

-- =========================================================================
-- 4. CONCURRENCY-SAFE TRANSACTION ACTIONS (RPCs)
-- =========================================================================

-- Atomic booking creation with FOR UPDATE locking on availability records
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_service_id uuid,
  p_coach_id uuid,
  p_court_id uuid,
  p_coach_availability_id uuid,
  p_court_availability_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_client_age integer,
  p_guardian_name text,
  p_guardian_phone text,
  p_position text,
  p_experience text,
  p_goals text,
  p_client_notes text,
  p_participants jsonb DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  booking_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_booking_id uuid;
  v_booking_ref text;
  v_coach_status text;
  v_court_status text;
  v_training_fee numeric;
  v_court_fee numeric;
  v_total_amount numeric;
  v_participant jsonb;
BEGIN
  -- 1. Lock and inspect coach availability
  IF p_coach_availability_id IS NOT NULL THEN
    SELECT status INTO v_coach_status
    FROM public.coach_availability
    WHERE id = p_coach_availability_id
    FOR UPDATE;
    
    IF v_coach_status IS NULL OR v_coach_status != 'available' THEN
      RAISE EXCEPTION 'Coach availability slot is no longer available.';
    END IF;
  END IF;

  -- 2. Lock and inspect court availability
  IF p_court_availability_id IS NOT NULL THEN
    SELECT status INTO v_court_status
    FROM public.court_availability
    WHERE id = p_court_availability_id
    FOR UPDATE;
    
    IF v_court_status IS NULL OR v_court_status != 'available' THEN
      RAISE EXCEPTION 'Court availability slot is no longer available.';
    END IF;
  END IF;

  -- 3. Fetch pricing snapshots from services & courts tables
  SELECT price INTO v_training_fee
  FROM public.services
  WHERE id = p_service_id AND is_active = true;

  IF v_training_fee IS NULL THEN
    RAISE EXCEPTION 'Service not found or is inactive.';
  END IF;

  SELECT rental_price INTO v_court_fee
  FROM public.courts
  WHERE id = p_court_id AND is_active = true;

  IF v_court_fee IS NULL THEN
    RAISE EXCEPTION 'Court not found or is inactive.';
  END IF;

  v_total_amount := v_training_fee + v_court_fee;

  -- 4. Create the client record
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

  -- 5. Create the Booking entry
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

  -- 6. Insert participants for group sessions
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

  -- 7. Block the slots in the availability calendars
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

-- Secure client booking lookup function bypassing regular RLS select block
CREATE OR REPLACE FUNCTION public.get_booking_by_reference(
  p_reference text,
  p_email_or_phone text
)
RETURNS TABLE (
  id uuid,
  booking_reference text,
  start_at timestamptz,
  end_at timestamptz,
  training_fee numeric,
  court_fee numeric,
  total_amount numeric,
  status text,
  created_at timestamptz,
  service_name text,
  court_name text,
  court_location text,
  client_name text,
  client_email text,
  client_phone text,
  client_age integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_reference,
    b.start_at,
    b.end_at,
    b.training_fee,
    b.court_fee,
    b.total_amount,
    b.status,
    b.created_at,
    s.name as service_name,
    c.name as court_name,
    c.location as court_location,
    cl.full_name as client_name,
    cl.email as client_email,
    cl.phone as client_phone,
    cl.age as client_age
  FROM public.bookings b
  JOIN public.clients cl ON b.client_id = cl.id
  JOIN public.services s ON b.service_id = s.id
  JOIN public.courts c ON b.court_id = c.id
  WHERE b.booking_reference = p_reference
    AND (cl.email = p_email_or_phone OR cl.phone = p_email_or_phone);
END;
$$;

-- Self-service client cancellation with strict 24-hour verification check
CREATE OR REPLACE FUNCTION public.cancel_booking_by_client(
  p_reference text,
  p_email_or_phone text,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_start_at timestamptz;
  v_status text;
  v_total_amount numeric;
BEGIN
  -- Search booking
  SELECT b.id, b.start_at, b.status, b.total_amount
  INTO v_booking_id, v_start_at, v_status, v_total_amount
  FROM public.bookings b
  JOIN public.clients cl ON b.client_id = cl.id
  WHERE b.booking_reference = p_reference
    AND (cl.email = p_email_or_phone OR cl.phone = p_email_or_phone);

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF v_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Booking is already cancelled.';
  END IF;

  IF v_status != 'CONFIRMED' AND v_status != 'PENDING_PAYMENT' AND v_status != 'PAYMENT_REVIEW' THEN
    RAISE EXCEPTION 'This booking status cannot be cancelled online.';
  END IF;

  -- Verify training starts at least 24 hours in the future
  IF v_start_at - now() < interval '24 hours' THEN
    RAISE EXCEPTION 'Bookings can only be cancelled up to 24 hours before the training session.';
  END IF;

  -- Cancel booking
  UPDATE public.bookings
  SET status = 'CANCELLED',
      cancellation_reason = p_reason,
      updated_at = now()
  WHERE id = v_booking_id;

  -- Create a refund record if a payment exists
  IF EXISTS (SELECT 1 FROM public.payments WHERE booking_id = v_booking_id AND status IN ('verified', 'under_review', 'pending')) THEN
    INSERT INTO public.refunds (booking_id, amount, status, requested_at, created_at, updated_at)
    VALUES (v_booking_id, v_total_amount, 'pending', now(), now(), now());
  END IF;

  -- Free up availability status back to 'available'
  UPDATE public.coach_availability
  SET status = 'available', updated_at = now()
  WHERE id = (SELECT coach_availability_id FROM public.bookings WHERE id = v_booking_id);

  UPDATE public.court_availability
  SET status = 'available', updated_at = now()
  WHERE id = (SELECT court_availability_id FROM public.bookings WHERE id = v_booking_id);

  RETURN true;
END;
$$;

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 1. profiles policies
CREATE POLICY "Allow public SELECT profiles" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin ALL on profiles" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. services policies
CREATE POLICY "Allow public SELECT active services" ON public.services
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Allow admin ALL on services" ON public.services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. courts policies
CREATE POLICY "Allow public SELECT active courts" ON public.courts
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Allow admin ALL on courts" ON public.courts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. coach_availability policies
CREATE POLICY "Allow public SELECT available coach slots" ON public.coach_availability
  FOR SELECT TO anon, authenticated USING (status = 'available');
CREATE POLICY "Allow admin ALL on coach slots" ON public.coach_availability
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. court_availability policies
CREATE POLICY "Allow public SELECT available court slots" ON public.court_availability
  FOR SELECT TO anon, authenticated USING (status = 'available');
CREATE POLICY "Allow admin ALL on court slots" ON public.court_availability
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. clients policies
CREATE POLICY "Allow public INSERT clients" ON public.clients
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin ALL on clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. bookings policies
CREATE POLICY "Allow public INSERT bookings" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin ALL on bookings" ON public.bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. booking_participants policies
CREATE POLICY "Allow public INSERT participants" ON public.booking_participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin ALL on participants" ON public.booking_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. payments policies
CREATE POLICY "Allow public INSERT payments" ON public.payments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin ALL on payments" ON public.payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. refunds policies
CREATE POLICY "Allow admin ALL on refunds" ON public.refunds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. reviews policies
CREATE POLICY "Allow public SELECT active reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Allow admin ALL on reviews" ON public.reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. settings policies
CREATE POLICY "Allow public SELECT settings" ON public.settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin ALL on settings" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 6. STORAGE BUCKET CONFIGURATION (PAYMENT PROOFS)
-- =========================================================================

-- Create a private bucket for payment-proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880, '{image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- Storage object policies (on storage.objects table)
CREATE POLICY "Allow public uploads of payment proofs" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow admins to view payment proofs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs');

-- =========================================================================
-- 7. SEED DATA (MOCK/DEMO VALUES)
-- =========================================================================

-- Seed default settings
INSERT INTO public.settings (
  id, business_name, coach_name, business_description,
  contact_phone, contact_email, gcash_name, gcash_number, payment_instructions,
  cancellation_hours, instagram_url, facebook_url
)
VALUES (
  1,
  'New Gen Performance',
  'John Paul Maldo',
  'Personalized basketball training designed to help athletes build better skills, improve performance, and train with purpose.',
  '0917-123-4567',
  'coach.jp.maldo@gmail.com',
  'John Paul M.',
  '09171234567',
  'Please GCash the total fee. Include your name in the payment reference note. Take a screenshot of the receipt and upload it below.',
  24,
  'https://instagram.com/newgenperformance',
  'https://facebook.com/newgenperformance'
)
ON CONFLICT (id) DO NOTHING;

-- Seed services
INSERT INTO public.services (id, name, description, duration_minutes, price, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333331', '1-on-1 Training (5-Session Bundle)', 'Personalized individual coaching. Focuses on game translation skills (speed, deceleration, direction change). 1hr per session. Requires a minimum bundle of 5 sessions (₱5,000 total).', 60, 5000.00, true),
  ('33333333-3333-3333-3333-333333333332', 'Small Group Training (5 Players)', 'Training block optimized for exactly 5 players of the same positions. Focuses on structural space reads, defensive rotations, and live game conditioning. Price to be finalized.', 90, 0.00, true),
  ('33333333-3333-3333-3333-333333333333', 'Performance Camp', 'Intense group performance camp targeting deceleration, footwork, speed, and in-game transitions. Open for minimum 20 athletes, maximum 40 athletes. Pricing to be finalized.', 120, 0.00, true)
ON CONFLICT (id) DO NOTHING;

-- Seed courts
INSERT INTO public.courts (id, name, location, description, rental_price, is_active)
VALUES
  ('44444444-4444-4444-4444-444444444441', 'Hoop Dome Court A', 'Mandaue City, Cebu', 'Fully covered indoor court with premium wooden flooring and professional basketball rings.', 500.00, true),
  ('44444444-4444-4444-4444-444444444442', 'Cebu Sports Center Court 1', 'Cebu City, Cebu', 'Covered outdoor concrete court, excellent for standard training routines.', 300.00, true)
ON CONFLICT (id) DO NOTHING;

-- Seed reviews
INSERT INTO public.reviews (client_name, rating, review_text, is_featured, is_active)
VALUES
  ('Marcus Rivera', 5, 'Coach JPs attention to detail corrected my shooting release in just 3 sessions. His skill workouts are game-focused and incredibly intense.', true, true),
  ('Kenzo Sy', 5, 'The 2-on-1 sessions helped my brother and me develop better chemistry on court. Coach JP explains the "why" behind every movement pattern.', true, true),
  ('Coach Adrian', 4, 'Great skill trainer. Highly recommended for kids and teenagers looking to build solid fundamentals and athletic basketball movement.', false, true);
