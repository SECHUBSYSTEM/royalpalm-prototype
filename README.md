# RoyalPalm Agro Prototype

A Next.js PWA prototype for plantation management and employee attendance system.

## Features

- ✅ QR Code scanning for palm identification
- ✅ Offline-first architecture with IndexedDB
- ✅ Reliable data synchronization
- ✅ Employee attendance tracking
- ✅ Progressive Web App (PWA) support
- ✅ Role-based access control (Admin, Supervisor, Worker)

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL 15+ (via Prisma)
- **Offline Storage**: IndexedDB (via idb)
- **HTTP Client**: Axios
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **QR Scanning**: html5-qrcode
- **PWA**: next-pwa

## Prerequisites

- Node.js 18+ 
- pnpm
- Docker (for local PostgreSQL)

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update the `DATABASE_URL` and `NEXTAUTH_SECRET` in `.env.local`.

### 3. Start PostgreSQL Database

```bash
docker-compose up -d
```

### 4. Set Up Database

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with demo data
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with demo data
- `pnpm db:studio` - Open Prisma Studio

## Test Credentials

After seeding the database, you can use these test credentials:

- **Admin**: `admin@royalpalm.com` / `password123`
- **Supervisor**: `supervisor@royalpalm.com` / `password123`
- **Worker**: `worker@royalpalm.com` / `password123`

## Project Structure

```
royalpalm-prototype/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seed script
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── qr/                # QR scanner components
│   │   └── sync/              # Sync status components
│   ├── lib/                   # Utilities
│   │   ├── api/               # Axios configuration
│   │   ├── db/                # Prisma client
│   │   ├── offline/           # IndexedDB operations
│   │   ├── sync/              # Sync engine logic
│   │   └── utils/             # Helper functions
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── stores/                # Zustand stores
└── docker-compose.yml          # PostgreSQL container
```

## Database Schema

The database includes the following main entities:

- **Blocks**: Plantation blocks
- **Palms**: Individual palm trees with QR codes
- **Employees**: Field workers, supervisors, and admins
- **PalmActivity**: Activities performed on palms (fertilizer, harvesting, etc.)
- **Attendance**: Employee check-in/check-out records
- **Users**: Authentication accounts
- **AuditLog**: System audit trail
- **Devices**: Registered mobile devices
- **SyncLog**: Synchronization logs

## Offline-First Architecture

The app uses IndexedDB to store data offline:

- **activities_queue**: Pending palm activities
- **attendance_queue**: Pending attendance records
- **sync_metadata**: Sync status and metadata

When online, the sync engine automatically uploads pending records in batches.

## PWA Features

- Installable on mobile and desktop
- Works offline
- Camera access for QR scanning
- Standalone app experience

## Deployment

See the best practices plan for Vercel deployment instructions.

## License

Private - RoyalPalm Agro Project
