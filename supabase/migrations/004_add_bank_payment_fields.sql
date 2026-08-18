-- =========================================================================
-- 004_add_bank_payment_fields.sql
-- Alters settings table to support manual bank transfer details
-- =========================================================================

ALTER TABLE public.settings ADD COLUMN bank_name text;
ALTER TABLE public.settings ADD COLUMN bank_account_name text;
ALTER TABLE public.settings ADD COLUMN bank_account_number text;
ALTER TABLE public.settings ADD COLUMN bank_qr_path text DEFAULT '/bank_qr.jpg';

-- Update seeded settings with mock/default bank transfer values
UPDATE public.settings
SET bank_name = 'BDO Unibank',
    bank_account_name = 'John Paul Maldo',
    bank_account_number = '001234567890',
    bank_qr_path = '/bank_qr.jpg'
WHERE id = 1;
