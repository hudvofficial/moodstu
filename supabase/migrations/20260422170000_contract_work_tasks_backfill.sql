-- Backfill default work_tasks for contracts that have events but no task plan.

BEGIN;

WITH contracts_without_tasks AS (
  SELECT c.id, c.service_type, c.created_by
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND NOT EXISTS (
      SELECT 1
      FROM public.work_tasks wt
      WHERE wt.contract_id = c.id
    )
),
event_task_rows AS (
  SELECT
    c.id AS contract_id,
    ce.id AS event_id,
    work_type,
    COALESCE(ce.event_date::date, ce.deadline::date) AS deadline,
    ce.event_date::date AS start_date,
    c.created_by
  FROM contracts_without_tasks c
  JOIN public.contract_events ce
    ON ce.contract_id = c.id
   AND ce.deleted_at IS NULL
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN ce.event_type = 'chuan_bi' THEN
        ARRAY['concept', 'kich_ban']::public.work_type_enum[]
      WHEN ce.event_type = 'ngay_chup' AND c.service_type = 'media' THEN
        ARRAY['quay_phim', 'cameraman']::public.work_type_enum[]
      WHEN ce.event_type = 'ngay_chup' AND c.service_type = 'ky_yeu' THEN
        ARRAY['chup_anh', 'quay_phim', 'tro_ly']::public.work_type_enum[]
      WHEN ce.event_type = 'ngay_chup' THEN
        ARRAY['chup_anh', 'makeup', 'tro_ly']::public.work_type_enum[]
      WHEN ce.event_type = 'ngay_to_chuc' THEN
        ARRAY['chup_anh', 'quay_phim', 'makeup', 'cameraman']::public.work_type_enum[]
      WHEN ce.event_type = 'hau_ky' AND c.service_type = 'media' THEN
        ARRAY['dung_phim', 'bien_tap']::public.work_type_enum[]
      WHEN ce.event_type = 'hau_ky' AND c.service_type IN ('combo', 'ngay_cuoi') THEN
        ARRAY['hau_ky_anh', 'dung_phim', 'retouch']::public.work_type_enum[]
      WHEN ce.event_type = 'hau_ky' THEN
        ARRAY['hau_ky_anh', 'retouch']::public.work_type_enum[]
      WHEN ce.event_type = 'giao_san_pham' THEN
        ARRAY['khac']::public.work_type_enum[]
      ELSE
        ARRAY['khac']::public.work_type_enum[]
    END
  ) AS work_type
)
INSERT INTO public.work_tasks (
  contract_id,
  event_id,
  work_type,
  status,
  deadline,
  start_date,
  cost,
  created_by
)
SELECT
  contract_id,
  event_id,
  work_type,
  'chua_lam',
  deadline,
  start_date,
  0,
  created_by
FROM event_task_rows;

COMMIT;
