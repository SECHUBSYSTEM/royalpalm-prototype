# RoyalPalm Prototype - Setup & Login Guide

## Quick Setup Checklist

### 1. Environment Variables
Create `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://royalpalm:royalpalm123@localhost:5432/royalpalm_prototype?schema=public"
JWT_SECRET="royalpalm-secret-key-change-in-production-min-32-chars"
```

### 2. Start Database
```bash
docker-compose up -d
```

Wait for database to be ready (check with `docker ps`).

### 3. Setup Database Schema
```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push

# Seed database with test users
pnpm db:seed
```

### 4. Start Development Server
```bash
pnpm dev
```

## Login Credentials

After seeding, use these credentials:

- **Admin**: `admin@royalpalm.com` / `password123`
- **Supervisor**: `supervisor@royalpalm.com` / `password123`
- **Worker**: `worker@royalpalm.com` / `password123`

## Troubleshooting Login Issues

### Issue: "Login failed" or Network Error

1. **Check Database Connection**
   ```bash
   docker ps  # Should show royalpalm-db running
   ```

2. **Verify Database is Seeded**
   ```bash
   pnpm db:seed
   ```

3. **Check Environment Variables**
   - Ensure `.env.local` exists
   - Verify `DATABASE_URL` matches docker-compose.yml
   - Default password: `royalpalm123`

4. **Check Prisma Client**
   ```bash
   pnpm db:generate
   ```

5. **Check Browser Console**
   - Open DevTools (F12)
   - Check Network tab for `/api/auth/login` request
   - Look for error messages

### Issue: "Invalid username or password"

- Ensure database is seeded: `pnpm db:seed`
- Verify you're using correct credentials (see above)
- Check that users exist in database: `pnpm db:studio`

### Issue: Database Connection Error

1. **Start Docker Container**
   ```bash
   docker-compose up -d
   ```

2. **Check Container Status**
   ```bash
   docker ps
   ```

3. **View Logs**
   ```bash
   docker logs royalpalm-db
   ```

4. **Reset Database** (if needed)
   ```bash
   docker-compose down -v
   docker-compose up -d
   pnpm db:push
   pnpm db:seed
   ```

## Next Steps After Login

Once logged in, you can:
1. Scan QR codes to record activities
2. Check in/out for attendance
3. View sync status
4. All data saves offline and syncs when online
