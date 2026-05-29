-- Check current RPC signature in production
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS parameters,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_gallery_data_v2'
  AND n.nspname = 'public';
