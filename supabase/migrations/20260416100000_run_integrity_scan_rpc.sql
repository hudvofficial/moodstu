-- Migration: Add run_integrity_scan RPC
-- Purpose: System Health Data Integrity scan
-- Based on the KI spec for Ghost Payments and Core Financial Integrity

CREATE OR REPLACE FUNCTION public.run_integrity_scan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_critical INT := 0;
    v_total_warnings INT := 0;
    v_total_info INT := 0;
    v_checks JSONB := '[]'::jsonb;
    v_ghost_count INT;
    v_ghost_items JSONB;
BEGIN
    -- 1. CLEANUP OLD LOGS (> 90 days)
    DELETE FROM public.integrity_reports 
    WHERE created_at < NOW() - INTERVAL '90 days';

    -- 2. CHECK 1: Ghost Payments (CRITICAL)
    WITH ghost_payments AS (
        SELECT id, contract_id 
        FROM public.payment_plans 
        WHERE (status = 'paid' OR status = 'Đã thu') 
          AND receipt_id IS NULL
    ),
    counted AS (
        SELECT COUNT(*) as cnt FROM ghost_payments
    ),
    sampled AS (
        SELECT jsonb_agg(jsonb_build_object('id', id, 'contract_id', contract_id)) as items
        FROM (SELECT id, contract_id FROM ghost_payments LIMIT 10) sub
    )
    SELECT c.cnt, COALESCE(s.items, '[]'::jsonb)
    INTO v_ghost_count, v_ghost_items
    FROM counted c CROSS JOIN sampled s;

    IF v_ghost_count > 0 THEN
        v_total_critical := v_total_critical + v_ghost_count;
        v_checks := v_checks || jsonb_build_object(
            'check_name', 'ghost_payments',
            'severity', 'CRITICAL',
            'issue_count', v_ghost_count,
            'details', 'Phát hiện payment plans đã đóng nhưng mất liên kết phiếu thu (receipt_id is null)',
            'sample_items', v_ghost_items
        );
    END IF;

    -- 3. INSERT REPORT INTO DB
    INSERT INTO public.integrity_reports (
        scan_date,
        status,
        checks,
        total_issues,
        warning_count,
        info_count,
        created_at
    ) VALUES (
        CURRENT_DATE,
        CASE WHEN v_total_critical > 0 THEN 'failed'
             WHEN v_total_warnings > 0 THEN 'warning'
             ELSE 'passed' END,
        v_checks,
        v_total_critical,
        v_total_warnings,
        v_total_info,
        NOW()
    );
END;
$$;
