-- Speed up contract item picker default lists and search filters.

CREATE INDEX IF NOT EXISTS idx_services_contract_catalog_unit_name
  ON public.services(unit, name)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_dresses_contract_catalog_status_name
  ON public.dresses(status, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dresses_name_trgm
  ON public.dresses USING gin(name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dresses_item_code_trgm
  ON public.dresses USING gin(item_code gin_trgm_ops)
  WHERE deleted_at IS NULL;
