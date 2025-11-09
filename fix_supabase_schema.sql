-- Inspect current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'files_metadata'
ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'files_metadata' AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'files_metadata' AND schemaname = 'public';

-- Ensure table has correct columns
-- Add missing columns if not exist
ALTER TABLE public.files_metadata
ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS size bigint,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS confidence numeric,
ADD COLUMN IF NOT EXISTS folder_path text,
ADD COLUMN IF NOT EXISTS public_url text,
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz DEFAULT now();

-- Drop unused columns
ALTER TABLE public.files_metadata
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS size_bytes,
DROP COLUMN IF EXISTS bucket,
DROP COLUMN IF EXISTS path,
DROP COLUMN IF EXISTS user_id;

-- Enable RLS
ALTER TABLE public.files_metadata ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "open_insert" ON public.files_metadata;
DROP POLICY IF EXISTS "open_select" ON public.files_metadata;
DROP POLICY IF EXISTS "open_delete" ON public.files_metadata;
-- Add more if there are other policies
DROP POLICY IF EXISTS "files_metadata_insert" ON public.files_metadata;
DROP POLICY IF EXISTS "files_metadata_select" ON public.files_metadata;
DROP POLICY IF EXISTS "files_metadata_delete" ON public.files_metadata;

-- Create new policies
CREATE POLICY "open_insert" ON public.files_metadata FOR INSERT USING (true) WITH CHECK (true);
CREATE POLICY "open_select" ON public.files_metadata FOR SELECT USING (true);
CREATE POLICY "open_delete" ON public.files_metadata FOR DELETE USING (true);

-- Verify schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'files_metadata'
ORDER BY ordinal_position;

-- Verify RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'files_metadata' AND schemaname = 'public';

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'files_metadata' AND schemaname = 'public';

-- Test insert
INSERT INTO public.files_metadata (name, mime_type, size)
VALUES ('test.txt', 'text/plain', 123);

-- Check if inserted
SELECT * FROM public.files_metadata WHERE name = 'test.txt';

-- Clean up test data
DELETE FROM public.files_metadata WHERE name = 'test.txt';
