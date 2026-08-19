-- =========================================================================
-- 008_add_original_price_to_services.sql
-- Adds original_price column to services table to support crossed-out pricing.
-- =========================================================================

ALTER TABLE public.services
ADD COLUMN original_price numeric NULL;
