-- =========================================================================
-- 006_add_redeem_package_function.sql
-- Installs a security-definered function to securely decrement package credits
-- =========================================================================

CREATE OR REPLACE FUNCTION public.redeem_package_session(p_client_package_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.client_packages
  SET remaining_sessions = remaining_sessions - 1,
      status = CASE WHEN remaining_sessions - 1 = 0 THEN 'EXHAUSTED' ELSE status END,
      updated_at = now()
  WHERE id = p_client_package_id AND remaining_sessions > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to redeem package session. Package is exhausted, inactive, or not found.';
  END IF;
  
  RETURN true;
END;
$$;
