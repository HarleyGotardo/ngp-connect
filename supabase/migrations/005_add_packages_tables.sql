-- =========================================================================
-- 005_add_packages_tables.sql
-- Installs the packages and client_packages schemas and triggers.
-- =========================================================================

-- 1. Create packages table
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  number_of_sessions integer NOT NULL CHECK (number_of_sessions > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  original_price numeric(10, 2) CHECK (original_price >= 0),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create client_packages table
CREATE TABLE public.client_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  package_code text NOT NULL UNIQUE,
  total_sessions integer NOT NULL,
  remaining_sessions integer NOT NULL CHECK (remaining_sessions >= 0),
  status text NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'ACTIVE', 'EXHAUSTED', 'CANCELLED')) DEFAULT 'PENDING_PAYMENT',
  payment_method text,
  payment_reference text,
  proof_storage_path text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Link bookings to client_packages for tracking redemptions
ALTER TABLE public.bookings ADD COLUMN client_package_id uuid REFERENCES public.client_packages(id) ON DELETE SET NULL;

-- 4. Trigger to generate unique package codes (e.g. NGP-PKG-A2B4C6)
CREATE OR REPLACE FUNCTION public.generate_package_code()
RETURNS trigger AS $$
DECLARE
  v_rand text;
  v_code text;
BEGIN
  -- Generate a random uppercase alphanumeric string of length 6
  v_rand := upper(substring(md5(random()::text) from 1 for 6));
  v_code := 'NGP-PKG-' || v_rand;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.client_packages WHERE package_code = v_code) LOOP
    v_rand := upper(substring(md5(random()::text) from 1 for 6));
    v_code := 'NGP-PKG-' || v_rand;
  END LOOP;
  
  new.package_code := v_code;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_package_code
BEFORE INSERT ON public.client_packages
FOR EACH ROW
WHEN (new.package_code IS NULL)
EXECUTE FUNCTION public.generate_package_code();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies
-- Packages (Public can view active, admin can manage)
CREATE POLICY "Allow public SELECT active packages" ON public.packages
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Allow admin ALL on packages" ON public.packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Client Packages (Public can insert purchases and select for verification, admin can manage)
CREATE POLICY "Allow public INSERT client_packages" ON public.client_packages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public SELECT client_packages" ON public.client_packages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin ALL on client_packages" ON public.client_packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Seed Default Packages
INSERT INTO public.packages (id, name, description, number_of_sessions, price, original_price, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'Starter Training Package', '8 intensive skill-development sessions focusing on lateral changes of directions, deceleration mechanics, and basic shooting releases.', 8, 10000.00, 15000.00, true),
  ('55555555-5555-5555-5555-555555555552', 'Elite Athlete Package', '12 complete court/coaching sessions including advanced transition scoring workouts and game situation structural spacing reads.', 12, 14000.00, 20000.00, true)
ON CONFLICT (id) DO NOTHING;
