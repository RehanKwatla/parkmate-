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

3. **`20261027000003_owner_workflow.sql`**:
   - Adds `price_per_month`, `height_clearance_inches`, `space_dimensions`, `is_accessible`, `is_authorized`, `authorized_at`, and `draft_step` columns to `parking_spaces`.
   - Adds `reason` column to `availability_rules`.
   - Updates RLS policy to allow public search discovery of published spaces.
   - Defines `block_space_availability` and `check_availability_conflicts` PostgreSQL functions with conflict prevention.
   - Implements `review_space_verification` for admin deed review.

### How to Apply Migrations:

#### Option A: Supabase Dashboard SQL Editor (Quickest)
1. Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Open `supabase/migrations/20261027000001_parkmate_core.sql`, copy all contents, paste into the editor, and click **Run**.
4. Open `supabase/migrations/20261027000002_seed_demo_data.sql`, paste into the editor, and click **Run**.
5. Open `supabase/migrations/20261027000003_owner_workflow.sql`, paste into the editor, and click **Run**.

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
| `parking_spaces` | Published OR space owner | `auth.uid() = owner_id` | `auth.uid() = owner_id` | `auth.uid() = owner_id` |
| `availability_rules`| Published space OR space owner | Space owner | Space owner | Space owner |
| `bookings` | Driver OR space owner | `auth.uid() = driver_id` | Driver OR space owner | Restricted |
| `booking_events` | Booking participants | Booking participants | Restricted | Restricted |
| `reviews` | Public read | Completed booking driver | Reviewer only | Reviewer only |
| `saved_spaces` | `auth.uid() = user_id` | `auth.uid() = user_id` | N/A | `auth.uid() = user_id` |
| `reports` | Report submitter | `auth.uid() = reporter_id` | Report submitter | Restricted |

---

## 5. Security & Verification Tests

### 1. Owner Workflow & Conflict Prevention Suite
```bash
node scripts/test-owner-workflow.mjs
```
Verifies:
- Saving and resuming draft spaces at any step.
- Mandatory legal owner authorization confirmation to publish.
- Enforcing `pending` verification status for newly published listings (cannot claim verified until admin review).
- Public marketplace search visibility of published spaces.
- Cross-account protection: User B cannot modify User A's listing (403 Forbidden).
- Conflict prevention: Confirmed driver bookings block conflicting owner unavailability (409 Conflict).
- Admin verification approval workflow.

### 2. Core Authorization & Price Tampering Suite
```bash
node scripts/test-authorization.mjs
```
Verifies:
- Host A cannot modify Host B's spaces.
- Drivers cannot modify space listings.
- Unrelated drivers cannot alter another driver's bookings.
- Privilege escalation prevention (users cannot promote to `admin`).
- Server-side price authority (ignores client-supplied totals).
- Temporal exclusion constraints preventing overlapping bookings.
