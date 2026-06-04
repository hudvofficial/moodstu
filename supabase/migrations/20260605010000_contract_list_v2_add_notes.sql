-- ═══════════════════════════════════════════════════════════
-- Add contract_notes preview to get_contract_list_v2 — 2026-06-05
-- ═══════════════════════════════════════════════════════════
-- Why: drawer "GHI CHÚ" hiện skeleton + phải fetch riêng vì list không JOIN notes.
-- Sau migration này, list trả kèm 10 notes mới nhất/HĐ → drawer GHI CHÚ instant
-- (useContractNotes có sẵn fallbackData logic — initialNotes => isLoading=false).
-- Payload: ~5-50KB/list (20 HĐ × ~10 notes × ~100-500B/note). Chấp nhận được.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_contract_list_v2(
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_service_type text DEFAULT 'all',
  p_sort text DEFAULT 'newest',
  p_time_filter text DEFAULT 'all',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset integer := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT c.*
      FROM public.contracts c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      WHERE c.deleted_at IS NULL
        AND (
          (COALESCE(p_status, 'all') = 'all' AND c.status <> 'da_huy')
          OR (COALESCE(p_status, 'all') <> 'all' AND c.status::text = p_status)
        )
        AND (
          COALESCE(p_service_type, 'all') = 'all'
          OR c.service_type::text = p_service_type
        )
        AND (
          v_search IS NULL
          OR c.contract_code ILIKE '%' || v_search || '%'
          OR cust.full_name ILIKE '%' || v_search || '%'
          OR cust.customer_code ILIKE '%' || v_search || '%'
          OR cust.phone ILIKE '%' || v_search || '%'
          OR cust.bride_name ILIKE '%' || v_search || '%'
          OR cust.groom_name ILIKE '%' || v_search || '%'
        )
        AND (
          COALESCE(p_time_filter, 'all') = 'all'
          OR (
            p_time_filter = 'this_month'
            AND c.contract_date >= date_trunc('month', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
          )
          OR (
            p_time_filter = 'last_month'
            AND c.contract_date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
            AND c.contract_date < date_trunc('month', CURRENT_DATE)::date
          )
          OR (
            p_time_filter = 'this_year'
            AND c.contract_date >= date_trunc('year', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
          )
        )
        AND (p_start_date IS NULL OR c.contract_date >= p_start_date)
        AND (p_end_date IS NULL OR c.contract_date <= p_end_date)
    ),
    counted AS (
      SELECT COUNT(*)::integer AS total
      FROM filtered
    ),
    paged AS (
      SELECT f.*
      FROM filtered f
      ORDER BY
        CASE WHEN p_sort = 'oldest' THEN f.created_at END ASC NULLS LAST,
        CASE WHEN p_sort = 'amount_desc' THEN f.total_amount END DESC NULLS LAST,
        CASE WHEN p_sort = 'amount_asc' THEN f.total_amount END ASC NULLS LAST,
        f.created_at DESC NULLS LAST
      LIMIT v_page_size
      OFFSET v_offset
    ),
    rows AS (
      SELECT
        c.created_at,
        c.total_amount,
        jsonb_build_object(
          'id', c.id,
          'contract_code', c.contract_code,
          'customer_id', c.customer_id,
          'service_type', c.service_type,
          'transaction_type', c.transaction_type,
          'contract_date', c.contract_date,
          'work_date', c.work_date,
          'delivery_date', c.delivery_date,
          'total_amount', c.total_amount,
          'discount_amount', c.discount_amount,
          'paid_amount', c.paid_amount,
          'remaining_amount', c.remaining_amount,
          'status', c.status,
          'payment_status', c.payment_status,
          'description', c.description,
          'updated_at', c.updated_at,
          'created_at', c.created_at,
          'customers', CASE
            WHEN cust.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', cust.id,
              'customer_code', cust.customer_code,
              'full_name', cust.full_name,
              'phone', cust.phone,
              'address', cust.address,
              'bride_name', cust.bride_name,
              'groom_name', cust.groom_name
            )
          END,
          'work_tasks', COALESCE(tasks.items, '[]'::jsonb),
          'contract_checklists', COALESCE(checklists.items, '[]'::jsonb),
          'contract_notes', COALESCE(notes.items, '[]'::jsonb)
        ) AS item
      FROM paged c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wt.id,
            'contract_id', wt.contract_id,
            'work_type', wt.work_type,
            'status', wt.status,
            'deadline', wt.deadline
          )
          ORDER BY wt.deadline ASC NULLS LAST, wt.created_at ASC NULLS LAST
        ) AS items
        FROM public.work_tasks wt
        WHERE wt.contract_id = c.id
      ) tasks ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'contract_id', cc.contract_id,
            'event_stage', cc.event_stage,
            'category', cc.category,
            'item_name', cc.item_name,
            'is_completed', cc.is_completed,
            'created_at', cc.created_at,
            'updated_at', cc.updated_at
          )
          ORDER BY cc.created_at ASC NULLS LAST
        ) AS items
        FROM public.contract_checklists cc
        WHERE cc.contract_id = c.id
      ) checklists ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', n.id,
            'content', n.content,
            'created_by', n.created_by,
            'created_at', n.created_at
          )
          ORDER BY n.created_at DESC
        ) AS items
        FROM (
          SELECT id, content, created_by, created_at
          FROM public.contract_notes
          WHERE contract_id = c.id
          ORDER BY created_at DESC
          LIMIT 10
        ) n
      ) notes ON TRUE
    )
    SELECT jsonb_build_object(
      'contracts',
      COALESCE(
        jsonb_agg(
          rows.item
          ORDER BY
            CASE WHEN p_sort = 'oldest' THEN rows.created_at END ASC NULLS LAST,
            CASE WHEN p_sort = 'amount_desc' THEN rows.total_amount END DESC NULLS LAST,
            CASE WHEN p_sort = 'amount_asc' THEN rows.total_amount END ASC NULLS LAST,
            rows.created_at DESC NULLS LAST
        ) FILTER (WHERE rows.item IS NOT NULL),
        '[]'::jsonb
      ),
      'total', counted.total,
      'page', v_page,
      'pageSize', v_page_size
    )
    FROM counted
    LEFT JOIN rows ON TRUE
    GROUP BY counted.total
  );
END;
$$;
