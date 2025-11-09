This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies:

```bash
npm ci
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

Run the database migration to set up the required tables:

```sql
-- Execute this SQL in your Supabase SQL Editor
-- File: migrations/20251109_sync_json_schema.sql
```

## Testing

Run the end-to-end upload tests:

```bash
# Make sure the dev server is running first
npm run dev

# In another terminal, run the tests
./scripts/e2e_upload_test.sh
```

## Verification Steps

After running the tests, verify the following:

1. **Database Records**: Check that `json_schemas` and `files_metadata` tables have the expected records:
   ```sql
   SELECT id, file_id, storage_type FROM json_schemas ORDER BY created_at DESC LIMIT 5;
   SELECT id, name, storage_type, schema_id, table_name FROM files_metadata WHERE name IN ('flat_sql_test.json', 'nested_nosql_test.json');
   ```

2. **SQL Table Creation**: For the flat JSON file, verify the table was created:
   ```sql
   -- Get the table name from files_metadata
   SELECT table_name FROM files_metadata WHERE name = 'flat_sql_test.json';
   -- Then query the table: SELECT * FROM public."<table_name>" LIMIT 1;
   ```

3. **No Duplicate UI Entries**: Upload the same files multiple times and ensure no duplicates appear in the UI.

4. **Upload Pipeline**: The flow should be: upload → metadata insert → analyze → SQL-table-create (for SQL files only).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
