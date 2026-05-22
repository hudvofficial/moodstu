ALTER TABLE "public"."galleries"
ADD COLUMN "custom_slug" text,
ADD COLUMN "client_name" text,
ADD COLUMN "tags" text[],
ADD COLUMN "enable_watermark" boolean DEFAULT false,
ADD COLUMN "show_namecard" boolean DEFAULT true;

-- Ensure custom_slug is unique
ALTER TABLE "public"."galleries"
ADD CONSTRAINT "galleries_custom_slug_key" UNIQUE ("custom_slug");
