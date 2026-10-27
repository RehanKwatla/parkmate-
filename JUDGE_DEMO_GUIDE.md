# ParkMate — Judge-Ready Full-Stack Demonstration Guide

Welcome to the **ParkMate** evaluation guide. This document provides everything required to evaluate, audit, and demo ParkMate end-to-end.

---

## 1. Quick Access & Live URLs

- **Live Production URL**: [https://parkmate.vercel.app](https://parkmate.vercel.app) *(or your deployed Vercel domain)*
- **GitHub Repository**: [https://github.com/RehanKwatla/parkmate-.git](https://github.com/RehanKwatla/parkmate-.git)
- **Local Dev Server**: `http://localhost:3000` (`npm run dev`)

---

## 2. Pre-Configured Demo Accounts & Roles

ParkMate supports both Supabase Authentication and a instant-access Sandbox Mode. No manual database setup is required to evaluate the entire platform.

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Driver / Commuter** | `driver@parkmate.demo` | `DemoPass123!` | Search spots, clearance checks, bookings, digital passes, FlexPark extensions, booking recovery failover |
| **Space Host / Owner** | `owner@parkmate.demo` | `DemoPass123!` | Create listings, set recurring schedules, block calendar dates, view space utilization metrics, approve Smart Space Sharing recommendations |
| **Instant Guest** | *None required* | *None required* | One-click instant browsing, search simulation, and test bookings via local/session sandbox persistence |

---

## 3. Environment Variables Reference

Copy `.env.example` to `.env.local` for local execution or enter into Vercel Project Settings:

```bash
# Next.js Application
NEXT_PUBLIC_APP_URL=https://parkmate.vercel.app

# Supabase Configuration (PostgreSQL, Auth, Storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Storage Bucket for Parking Photos
NEXT_PUBLIC_STORAGE_BUCKET_PARKING=parking-photos

# Optional: Mapbox Vector Interactive Maps (fallback vector canvas included)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here

# Payment Integration (Stripe Test Mode or ParkMate Test Gateway)
# If omitted or placeholder, ParkMate automatically activates the clearly-labelled Test Gateway
STRIPE_SECRET_KEY=sk_test_placeholder_key_here
STRIPE_WEBHOOK_SECRET=whsec_placeholder_secret_here
```

---

## 4. Database Migrations & Supabase Setup

ParkMate includes production-ready PostgreSQL migrations with Row Level Security (RLS) and strict exclusion constraints:

1. **Core Schema & Constraints** (`supabase/migrations/20261027000001_parkmate_core.sql`):
   - Tables: `profiles`, `parking_spaces`, `availability_rules`, `bookings`, `booking_events`, `reviews`, `saved_spaces`, `reports`.
   - Concurrency: PostgreSQL `EXCLUDE USING gist (space_id WITH =, tstzrange(start_time, end_time) WITH &&)` strictly prevents overlapping reservations at the database engine level.
   - Row Level Security (RLS): Strict ownership policies on all tables.
2. **Seed Data** (`supabase/migrations/20261027000002_seed_demo_data.sql`):
   - Populates verified San Francisco parking spaces across Financial District, SoMa, Mission, and Marina with high-resolution imagery and physical dimensions.
3. **Owner Workflow Enhancements** (`supabase/migrations/20261027000003_owner_workflow.sql`):
   - Multi-step draft persistence and host verification review statuses (`pending`, `verified`, `rejected`).

**Applying Migrations:**
```bash
# Via Supabase CLI:
npx supabase db push

# Or execute SQL files directly in the Supabase Dashboard SQL Editor in numerical order.
```

---

## 5. Security & Integrity Audit Summary

| Security Layer | Implementation Detail | Audit Status |
| :--- | :--- | :--- |
| **Row Level Security (RLS)** | Supabase RLS policies enforce that users can only modify spaces they own, and drivers can only access their own reservations. | Verified |
| **Price Tamper Resistance** | Prices are calculated strictly server-side (`calculateBookingPrice`). Client-provided totals are discarded. | Verified |
| **Payment Idempotency** | Server-side idempotency cache (`Idempotency-Key`) prevents double-charges or duplicate bookings upon network retry. | Verified |
| **Concurrency Protection** | PostgreSQL exclusion constraints + atomic conflict checks prevent double-booking identical slots. | Verified |
| **State Machine Guards** | Strict lifecycle transitions (`isValidBookingStateTransition`) prevent invalid transitions (e.g., `cancelled` -> `confirmed`). | Verified |
| **API Rate Limiting** | In-memory token bucket sliding-window limiter on `/api/bookings`, `/api/recovery`, and `/api/storage/upload`. | Verified |
| **Safe Image Uploads** | MIME whitelist (`jpeg`, `png`, `webp`), 5MB ceiling, and randomized sanitized file paths. | Verified |
| **Driver & Host Privacy** | Full addresses and gate access PINs are strictly gated until a booking is confirmed. | Verified |

---

## 6. End-to-End Demo Script for Judges

Follow these steps to experience the complete platform in under 5 minutes:

### Journey 1: Driver Search & Physical Vehicle Clearance Gate
1. Navigate to `/search`.
2. Observe the **Estimated Market Demand** card (e.g. *High Demand 89/100* for Financial District morning commute).
3. Click **"Why this estimate?"** to inspect the explainable scoring factors (temporal commute rush, neighborhood baseline, sample occupancy).
4. Notice the **`Verified Available (Real-Time)`** badge on parking cards, clearly distinguishing verified space vacancy from market demand estimates.
5. In the vehicle selector, select **"Commercial Van (7.8 ft)"**:
   - Notice low-clearance garages are immediately tagged with a red warning: *"Exceeds 6.8 ft clearance limit (Deficit: 1.0 ft)"*.
   - The reserve button is safely disabled, preventing vehicle damage.
6. Switch back to **"Standard SUV (6.2 ft)"** or **"Sedan (4.8 ft)"** to see full compatibility restored.

### Journey 2: Booking Confirmation, Test Payment & Digital Access Pass
1. Click **"Reserve Spot"** on any available space (e.g. *Financial District Gated Bay*).
2. Review the transparent server-calculated price quote (Hourly Rate $\times$ Hours + \$2.50 Service Fee + 8% Tax).
3. Under **Payment Simulation (Test Mode)**, select *Visa •••• 4242 (Simulate Success)* or test *Card Decline*.
4. Click **"Reserve Space Now"**:
   - The server verifies vehicle clearance, runs real-time conflict detection, confirms the test transaction, and issues a **Digital Access Pass** with an automated 4-digit PIN code (`PASS-XXXX-XXXX`) and unique reference (`PM-XXXX-XXXX`).
5. Notice the transparent declaration: `[DEMO PAYMENT MODE] Simulated transaction approved. No real credit card debited.`

### Journey 3: My Bookings, FlexPark Extension & Transparent Cancellation
1. Navigate to `/bookings`.
2. Find the active reservation. Click **"View Digital Pass"** to view the wallet QR code and gate credentials.
3. Click **"Extend Time (FlexPark)"**:
   - Select `+1 Hour`. The server checks subsequent bookings and confirms zero conflicts before extending the end time.
4. Click **"Cancel"**:
   - If cancelling $> 2$ hours prior to scheduled arrival, the modal confirms a 100% refund.
   - Click **"Confirm Cancellation"**:
   - The modal displays the transparent notice: *"Simulated test refund credited to demo ledger (Demo transaction: no real funds transferred)."*
   - The space is instantly released back to the search marketplace.

### Journey 4: Failed-Arrival Booking Recovery Failover
1. In `/bookings`, locate the sample reservation (*Reserved Space #A12*).
2. Click **"Report Access Issue"** (or click the recovery demonstration link).
3. Select **"Space occupied by another vehicle"** and submit.
4. The **Booking Recovery Engine** activates:
   - Scans nearby parking spaces within walking distance.
   - Hard-verifies vehicle physical dimensions (never suggests an incompatible bay).
   - Presents compatible alternative spaces with 1-click replacement at \$0 additional charge, or authorizes a 100% immediate refund + \$15 convenience credit.

### Journey 5: Owner Dashboard, Space Utilization & Smart Sharing
1. Navigate to `/owner`.
2. Click the **"Demand & Space Utilization (Smart Sharing)"** tab:
   - **4 Core Metrics**: Listed Hours/Week, Booked Hours, Available Unbooked Hours, Space Utilization Rate %.
   - **Revenue Separation**: Distinct cards comparing **Verified Realized Revenue** (confirmed in database) vs. **Estimated Potential Gross Value (Sample-Data Forecast)**.
   - Prominent notice clarifying that simulated forecasts do not represent actual customers or realized revenue.
3. In the **Suggested Unused Slots** section:
   - Click **"Review & Approve Slot"** on a recommended schedule gap.
   - Modify the suggested price or hours. Notice the conflict guarantee re-checks reservations in real time.
   - Click **"Approve & Publish Availability"** (availability rule is safely published with 0 conflicts).
4. Use the **Interactive Demand & Dynamic Pricing Simulator** at the bottom of the page to adjust days, hours, and event flags to see explainable demand score adjustments.

---

## 7. Documented Limitations & Assumptions

1. **Rule-Based Heuristic**: Demand estimation uses transparent, explainable deterministic formulas and does not claim trained machine learning models.
2. **Payment Processing**: Unless live Stripe API keys are configured in `.env.local`, all payment intents, charges, and refunds run through the ParkMate Test Mode Provider. No real financial currency is debited or credited.
3. **Map Fallback**: When `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is not configured, the interface seamlessly renders a responsive vector canvas map with real-time coordinate plotting.
4. **Utilization Forecasts**: Projected gross values in the owner hub assume an average 70% fill rate and prevailing neighborhood hourly yields.
