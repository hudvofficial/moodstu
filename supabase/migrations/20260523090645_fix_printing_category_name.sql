-- Fix the spelling of the printing category from "In an" to "In ấn"
UPDATE public.transaction_categories
SET name = 'In ấn', updated_at = now()
WHERE category_code IN ('printing', 'in_an') AND name = 'In an';
