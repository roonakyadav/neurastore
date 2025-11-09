-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. json_schemas table (canonical)
CREATE TABLE IF NOT EXISTS public.json_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.files_metadata(id) ON DELETE CASCADE,
  schema jsonb NOT NULL,
  storage_type text CHECK (storage_type IN ('SQL','NoSQL')),
  created_at timestamptz DEFAULT now()
);

-- 2. Ensure files_metadata has expected columns
ALTER TABLE public.files_metadata
  ADD COLUMN IF NOT EXISTS storage_type text,
  ADD COLUMN IF NOT EXISTS schema_id uuid REFERENCES public.json_schemas(id),
  ADD COLUMN IF NOT EXISTS table_name text,
  ADD COLUMN IF NOT EXISTS record_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_json_schemas_file_id ON public.json_schemas(file_id);
CREATE INDEX IF NOT EXISTS idx_files_metadata_table_name ON public.files_metadata(table_name);
