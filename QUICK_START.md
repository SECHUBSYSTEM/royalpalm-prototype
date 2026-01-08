# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Start Database
```bash
docker-compose up -d
```

Wait ~10 seconds for database to start, then verify:
```bash
docker ps  # Should show royalpalm-db running
```

### Step 2: Setup Database Schema
```bash
pnpm db:push
```

This creates all tables in the database.

### Step 3: Seed Test Data
```bash
pnpm db:seed
```

This creates:
- 2 blocks (A1, B1)
- 10 palm trees with QR codes
- 3 employees (Admin, Supervisor, Worker)
- 3 test users

### Step 4: Start Dev Server
```bash
pnpm dev
```

Open http://localhost:3000

### Step 5: Login
Use these credentials:
- **Admin**: `admin@royalpalm.com` / `password123`
- **Supervisor**: `supervisor@royalpalm.com` / `password123`
- **Worker**: `worker@royalpalm.com` / `password123`

## ✅ Verify Everything Works

1. **Login** - Should redirect to home page
2. **QR Scan** - Click "Scan QR Code", scan `RP-A1-00001` (or any palm QR)
3. **Activity Form** - Should auto-fill palm details, fill form, save
4. **Attendance** - Go to Attendance page, check in/out
5. **Offline** - Turn off network, record activity, turn on network, check sync

## 🐛 Common Issues

### Database won't start
```bash
# Check if port 5432 is in use
docker ps -a

# Remove old container and restart
docker-compose down
docker-compose up -d
```

### "Cannot connect to database"
- Check `.env.local` has correct `DATABASE_URL`
- Verify Docker is running: `docker ps`
- Check database logs: `docker logs royalpalm-db`

### "Prisma Client not generated"
```bash
pnpm db:generate
```

### Build errors
```bash
# Clean and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

## 📱 Test PWA Features

1. Open in Chrome/Edge
2. Click browser menu → "Install RoyalPalm Agro"
3. Test offline mode (turn off network)
4. Verify app works standalone

## 🎯 Ready for Deployment?

See `DEPLOYMENT_CHECKLIST.md` for full deployment guide.
