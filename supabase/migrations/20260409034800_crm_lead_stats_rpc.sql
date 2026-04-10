-- Create RPC to calculate CRM Lead Stats
-- Replaces client-side counting to improve performance

CREATE OR REPLACE FUNCTION public.get_crm_lead_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_closed INT;
  v_cancelled INT;
  v_active INT;
  v_conversion_rate INT;
  v_by_status JSON;
BEGIN
  -- Build the status count distribution
  SELECT 
    json_object_agg(COALESCE(status::text, 'unknown'), count)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) as count 
    FROM public.crm_leads 
    WHERE deleted_at IS NULL 
    GROUP BY status
  ) sub;

  -- Default to empty json if no leads
  IF v_by_status IS NULL THEN
    v_by_status := '{}'::json;
  END IF;

  -- Total count
  SELECT COUNT(*) INTO v_total FROM public.crm_leads WHERE deleted_at IS NULL;
  
  -- closed = 'da_chot'
  v_closed := COALESCE((v_by_status->>'da_chot')::INT, 0);
  
  -- cancelled = 'huy'
  v_cancelled := COALESCE((v_by_status->>'huy')::INT, 0);
  
  -- active = total - closed - cancelled
  v_active := v_total - v_closed - v_cancelled;
  
  -- conversion rate
  IF v_total > 0 THEN
    v_conversion_rate := ROUND((v_closed::NUMERIC / v_total::NUMERIC) * 100);
  ELSE
    v_conversion_rate := 0;
  END IF;
  
  -- Return full stats shape matching the TS interface
  RETURN json_build_object(
    'total', v_total,
    'active', v_active,
    'closed', v_closed,
    'conversionRate', v_conversion_rate,
    'byStatus', v_by_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_lead_stats() TO authenticated;
