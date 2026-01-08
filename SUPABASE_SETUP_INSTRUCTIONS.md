# Supabase Setup via SQL Editor

## Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run the Schema SQL

1. Open `supabase-schema-and-seed.sql` file
2. Copy **ALL** the SQL content
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

## Step 3: Verify Setup

After running, verify the data was created:

```sql
-- Run these in SQL Editor to verify:
SELECT COUNT(*) as block_count FROM "blocks";
SELECT COUNT(*) as palm_count FROM "palms";
SELECT COUNT(*) as employee_count FROM "employees";
SELECT COUNT(*) as user_count FROM "users";
SELECT "username", "role" FROM "users";
```

You should see:
- 2 blocks
- 10 palms
- 3 employees
- 3 users

## Step 4: Test Login

After deployment, test with these credentials:
- **Admin**: `admin@royalpalm.com` / `password123`
- **Supervisor**: `supervisor@royalpalm.com` / `password123`
- **Worker**: `worker@royalpalm.com` / `password123`

## Next Steps

After running the SQL:
1. Get your Supabase connection string from **Settings → Database → Connection string → URI**
2. Use it in Vercel environment variables as `DATABASE_URL`
3. Deploy to Vercel!

---

**Note**: The SQL file includes both schema creation AND seed data, so you only need to run it once.
