-- Phase 06: Rename google_calendar_auth → google_oauth
-- Unify Google OAuth token storage for Calendar + Drive
-- Rollback: ALTER TABLE studio_info RENAME COLUMN google_oauth TO google_calendar_auth;

ALTER TABLE studio_info
  RENAME COLUMN google_calendar_auth TO google_oauth;

COMMENT ON COLUMN studio_info.google_oauth IS 'Encrypted Google OAuth tokens (Calendar + Drive scopes). JSON blob with access_token, refresh_token, granted_scopes, etc.';
