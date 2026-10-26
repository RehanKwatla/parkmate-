# ParkMate Supabase Backend Guide & Setup Instructions

This document provides setup instructions, schema documentation, and security verification guidelines for the ParkMate Supabase backend.

---

## 1. Architecture Overview

ParkMate uses Supabase for:
- **Authentication**: Email/password authentication with role metadata (`driver`, `owner`, `both`), password recovery, and SSR session synchronization via `@supabase/ssr`.
- **PostgreSQL Database**: Relational schema with custom ENUMs, foreign keys, cascade rules, triggers, and Row Level Security (RLS).
- **Overlapping Booking Prevention**: Physical PostgreSQL exclusion constraints (`EXCLUDE USING gist`) and atomic stored procedure transactions (`create_booking_atomic`) preventing race conditions and double-bookings.
- **Storage**: `parking-photos` bucket with MIME type validation (`image/jpeg`, `image/png`, `image/webp`) and a 5MB per-file size limit.
- **Server-Side Validation**: Zod schemas guarding all API endpoints with strict server-side price computation.

---

## 2. Environment Configuration

1. Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```

2. Populate the required environment variables:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Obtain from Supabase Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# SERVER-SIDE ONLY: Service role secret (never expose with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Storage Bucket
NEXT_PUBLIC_STORAGE_BUCKET_PARKING=parking-photos
```

---

## 3. Database Migrations

The migrations are located in the `supabase/migrations/` directory:

1. **`20261027000001_parkmate_core.sql`**:
   - Enables `uuid-ossp` and `btree_gist` extensions.
   - Defines enums: `user_role`, `vehicle_type`, `space_category`, `access_type`, `verification_status`, `publication_status`, `booking_status`, `payment_status`, `event_type`, `report_type`, `report_status`.
   - Creates tables:
     - `profiles`: user metadata, display name, contact, role, superhost status.
     - `parking_spaces`: space location, coordinates, pricing, clearance feet, vehicle restrictions, access credentials.
     - `availability_rules`: recurring weekly schedules and exceptions.
     - `bookings`: reservations with temporal range check and `no_overlapping_confirmed_bookings` exclusion constraint.
     - `booking_events`: audit trail for status changes, access issues, and extensions.
     - `reviews`: ratings and feedback tied to completed bookings with automatic space rating recalculation.
     - `saved_spaces`: user favorites.
     - `reports`: moderation and access failure dispute reports.
   - Creates stored procedure `create_booking_atomic`.
   - Configures Row Level Security (RLS) policies across all tables.
   - Configures `parking-photos` storage bucket and access policies.

2. **`20261027000002_seed_demo_data.sql`**:
   - Seeds initial verified parking spaces across San Francisco (Downtown Garage, Nob Hill Driveway, Moscone Executive Deck, SFO Carport, Valencia Carport, Chase Center Deck).
   - Seeds verified host profiles and default availability schedules.

### How to Apply Migrations:

#### Option A: Supabase Dashboard SQL Editor (Quickest)
1. Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Open `supabase/migrations/20261027000001_parkmate_core.sql`, copy all contents, paste into the editor, and click **Run**.
4. Open `supabase/migrations/20261027000002_seed_demo_data.sql`, paste into the editor, and click **Run**.

#### Option B: Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase db push
```

---

## 4. Row Level Security (RLS) Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Public read | `auth.uid() = id` | `auth.uid() = id` (no admin promotion) | Restricted |
| `parking_spaces` | Published & verified OR space owner | `auth.uid() = owner_id` | `auth.uid() = owner_id` | `auth.uid() = owner_id` |
| `availability_rules`| Published space OR space owner | Space owner | Space owner | Space owner |
| `bookings` | Driver OR space owner | `auth.uid() = driver_id` | Driver OR space owner | Restricted |
| `booking_events` | Booking participants | Booking participants | Restricted | Restricted |
| `reviews` | Public read | Completed booking driver | Reviewer only | Reviewer only |
| `saved_spaces` | `auth.uid() = user_id` | `auth.uid() = user_id` | N/A | `auth.uid() = user_id` |
| `reports` | Report submitter | `auth.uid() = reporter_id` | Report submitter | Restricted |

---

## 5. Security & Verification Tests

Run the security isolation and authorization test script at any time:
```bash
node scripts/test-authorization.mjs
```

Or query the test endpoint while running the Next.js server:
```bash
curl http://localhost:3000/api/test-auth-isolation
```

Tests verify:
1. One space host cannot modify another space host's listings.
2. Drivers cannot alter space listings.
3. Users cannot alter or cancel unrelated drivers' bookings.
4. Users cannot escalate their role to `admin`.
5. Server recalculates and enforces prices regardless of client payload.
6. Temporal overlaps on identical spots are detected and blocked.
