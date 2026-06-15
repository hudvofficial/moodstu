-- Chỉ ADD VALUE. KHÔNG dùng 'outsource' trong cùng transaction này (Postgres: unsafe use of new value).
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'outsource';
