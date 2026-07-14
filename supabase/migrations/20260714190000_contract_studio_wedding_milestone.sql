-- Align Studio contracts with the real operational lifecycle:
-- shoot at Studio -> wedding day -> post-production -> delivery.
-- Existing contracts receive a wedding milestone without inventing a date.

BEGIN;

-- Move existing Studio templates out of the unique (service_type, sort_order)
-- range before assigning the canonical order.
UPDATE public.event_templates
SET sort_order = sort_order + 100,
    is_active = false,
    updated_at = now()
WHERE service_type = 'studio';

INSERT INTO public.event_templates (
  service_type,
  event_type,
  event_name,
  default_days_offset,
  sort_order,
  is_active
)
VALUES
  ('studio', 'ngay_chup', 'Chụp cổng tại Studio', 0, 1, true),
  ('studio', 'ngay_to_chuc', 'Ngày cưới', 0, 2, true),
  ('studio', 'hau_ky', 'Hậu kỳ Studio', 3, 3, true),
  ('studio', 'giao_san_pham', 'Giao sản phẩm', 7, 4, true)
ON CONFLICT (service_type, sort_order) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_name = EXCLUDED.event_name,
    default_days_offset = EXCLUDED.default_days_offset,
    is_active = true,
    updated_at = now();

-- Re-number generated Studio events consistently. A temporary offset avoids
-- accidental ordering collisions and preserves multiple events of one type.
WITH ranked AS (
  SELECT
    ce.id,
    CASE ce.event_type
      WHEN 'ngay_chup' THEN 1000
      WHEN 'ngay_to_chuc' THEN 2000
      WHEN 'hau_ky' THEN 3000
      WHEN 'giao_san_pham' THEN 4000
      ELSE 9000
    END + ROW_NUMBER() OVER (
      PARTITION BY ce.contract_id, ce.event_type
      ORDER BY ce.sort_order, ce.created_at, ce.id
    ) AS temporary_order
  FROM public.contract_events ce
  JOIN public.contracts c ON c.id = ce.contract_id
  WHERE c.service_type = 'studio'
    AND c.deleted_at IS NULL
    AND ce.deleted_at IS NULL
)
UPDATE public.contract_events ce
SET sort_order = ranked.temporary_order,
    updated_at = now()
FROM ranked
WHERE ce.id = ranked.id;

-- Add the missing wedding milestone. When wedding_date is unknown the event is
-- intentionally kept with NULL event_date so UI can request the missing input.
INSERT INTO public.contract_events (
  contract_id,
  event_type,
  title,
  event_date,
  deadline,
  status,
  sort_order,
  is_manual_date
)
SELECT
  c.id,
  'ngay_to_chuc'::public.event_type_enum,
  'Ngày cưới',
  cu.wedding_date,
  NULL,
  CASE
    WHEN c.status = 'hoan_thanh' THEN 'hoan_thanh'
    WHEN c.status = 'da_huy' THEN 'da_huy'
    ELSE 'chua_lam'
  END,
  2001,
  false
FROM public.contracts c
LEFT JOIN public.customers cu ON cu.id = c.customer_id
WHERE c.service_type = 'studio'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_events ce
    WHERE ce.contract_id = c.id
      AND ce.event_type = 'ngay_to_chuc'
      AND ce.deleted_at IS NULL
  );

-- Collapse temporary sort ranges back to compact, deterministic order.
WITH ordered AS (
  SELECT
    ce.id,
    ROW_NUMBER() OVER (
      PARTITION BY ce.contract_id
      ORDER BY ce.sort_order, ce.created_at, ce.id
    ) AS next_order
  FROM public.contract_events ce
  JOIN public.contracts c ON c.id = ce.contract_id
  WHERE c.service_type = 'studio'
    AND c.deleted_at IS NULL
    AND ce.deleted_at IS NULL
)
UPDATE public.contract_events ce
SET sort_order = ordered.next_order,
    updated_at = now()
FROM ordered
WHERE ce.id = ordered.id;

COMMIT;
