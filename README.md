# ParkMate 🚗

> **The Smart Parking-Space Marketplace** inspired by Airbnb's visual clarity, generous whitespace, and intuitive interaction design.

ParkMate connects urban drivers with authorized owners of residential driveways, carports, and commercial parking bays.

---

## 🌟 The 5 Core Differentiators

1. **Booking Recovery Protection**: If access to a reserved spot fails or the space is blocked, ParkMate automatically reallocates an equal or upgraded alternative space nearby at zero extra charge.
2. **Vehicle Compatibility Verification**: Precise clearance height and dimension filters ensure that drivers never arrive with an SUV or truck that cannot clear the ceiling.
3. **1-Click Flexible Extensions**: Drivers running late can request extra time with one tap if no conflicting driver reservation immediately overlaps.
4. **Demand Prediction AI**: Space hosts maximize earnings through automated demand forecasting linked to local events, concert schedules, and commuter patterns.
5. **Smart Space Sharing**: Residential owners can monetize idle workday hours (e.g., Mon–Fri 8:30 AM – 5:30 PM) while keeping their spot reserved when they return home.

---

## 🏗️ Architecture & Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: Strict [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with curated Airbnb-inspired design tokens
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/) on Route Handlers
- **Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`) with safe client/server separation
- **Maps**: Reusable Map Adapter (`src/lib/maps/map-adapter.ts`) supporting Mapbox / Google Maps with an interactive SVG vector map fallback
- **Deployment**: Vercel-ready

---

## 📁 Folder Structure

```
parkmate/
├── .env.example                # Safe environment variable template
├── public/                     # Static assets and icons
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Route Handlers with Zod validation
│   │   │   ├── bookings/       # Booking creation endpoint
│   │   │   ├── listings/       # Search query endpoint
│   │   │   └── recovery/       # Booking recovery rebooking endpoint
│   │   ├── bookings/           # Driver passes & booking management
│   │   ├── listings/[id]/      # Detailed listing view & booking panel
│   │   ├── owner/              # Host Hub, Smart Sharing & Demand AI
│   │   ├── search/             # Split List/Map search with filters
│   │   ├── globals.css         # Design tokens & theme variables
│   │   ├── layout.tsx          # Root layout with Navbar & Footer
│   │   └── page.tsx            # Airbnb-style Homepage
│   ├── components/
│   │   ├── layout/             # Navbar, Footer
│   │   ├── map/                # Interactive Map with custom price pins
│   │   ├── parking/            # Cards, SearchBar, CategoryTabs, Differentiators
│   │   └── ui/                 # Reusable Button, Badge, Card, Dialog, Input, Skeleton
│   ├── lib/
│   │   ├── constants.ts        # Vehicle presets, categories, destinations
│   │   ├── mock-data.ts        # Verified & demo parking spots with real photos
│   │   ├── utils.ts            # Formatting & class merging
│   │   ├── maps/               # Reusable map adapter abstraction
│   │   └── supabase/           # Server and browser Supabase clients
│   └── types/
│       └── parking.ts          # Core domain TypeScript interfaces
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- `pnpm` or `npm`

### 2. Installation
```bash
pnpm install
```

### 3. Environment Configuration
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```
*(The application works immediately out-of-the-box with mock data even before external API keys are configured).*

### 4. Running the Development Server
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view ParkMate.

### 5. Running Production Build & Type-Check
```bash
pnpm run build
```

---

## 🗺️ Key Routes

- `/` – Homepage with hero search, categories, featured spots, and host acquisition
- `/search` – Split List / Interactive Map view with vehicle clearance filters and price pins
- `/listings/[id]` – Detailed listing page with vehicle compatibility check and instant reservation widget
- `/bookings` – Driver reservation hub with QR access passes, flexible extension, and recovery rebooking
- `/owner` – Host management dashboard with Smart Space Sharing scheduler and demand surge forecast
