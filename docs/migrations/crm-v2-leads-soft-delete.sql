-- CRM V2: Migrating crm_leads to use soft deletes
-- This allows retaining lead records safely instead of hard physical deletion.

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: Create an index for querying active leads efficiently
CREATE INDEX IF NOT EXISTS idx_crm_leads_deleted_at ON crm_leads(deleted_at) WHERE deleted_at IS NULL;
