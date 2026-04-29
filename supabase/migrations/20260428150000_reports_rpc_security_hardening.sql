-- Reports/finance RPC hardening: finance report data must only be callable
-- through service-role server actions after app-level permission checks.

REVOKE ALL ON FUNCTION public.finance_reports_snapshot(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_ledger_range(int, int, date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_debt_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_contract_profit_report(text, date, date, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_ledger(int, int, int, int, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finance_reports_snapshot(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_ledger_range(int, int, date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_debt_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(text, date, date, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_ledger(int, int, int, int, text) TO service_role;
