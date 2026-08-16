# New Gen Performance (NGP) Booking System MVP

Welcome to the **New Gen Performance (NGP)** Booking System, a self-service training registration application built for Coach Coach Paul. This project turns manual calendar messaging and payment checks into a streamlined self-service basketball coaching booking system.

---

## 🚀 Key Stack
- **Framework:** Next.js (App Router, Tailwind CSS v4)
- **Database:** Supabase (PostgreSQL, Row-Level Security)
- **Authentication:** Supabase Auth (Admin/Coach authentication)
- **Storage:** Supabase Storage (Private bucket for manual payment proof uploads)

---

## 🛠️ Installation & Local Setup

### 1. Clone & Install Dependencies
Ensure you have [Node.js](https://nodejs.org) installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory (based on `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_anon_key_here
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 💾 Supabase Database & Migration Setup

Since local Docker setups vary, follow these steps to configure your remote Supabase Project:

### Step 1: Run Database Schema
1. Open your [Supabase Dashboard](https://supabase.com).
2. Go to the **SQL Editor** tab in the left sidebar.
3. Click **New Query**.
4. Copy the complete SQL commands from [`supabase/migrations/001_initial_schema.sql`](file:///c:/Users/Harley/Documents/Projects/ngp-connect/supabase/migrations/001_initial_schema.sql) and paste them into the editor.
5. Click **Run**. This will create the database tables, triggers, RPC transaction functions, seed active services, default venues, default business configurations, and RLS policies.

### Step 2: Storage Bucket Configuration
The migration automatically provisions the private bucket `payment-proofs` and hooks up Row-Level Security policies. However, verify the bucket configuration on the dashboard:
1. Navigate to the **Storage** tab on Supabase.
2. Ensure a bucket named `payment-proofs` is present and marked as **Private**.
3. Under RLS Policies, make sure the following policies are active:
   - **Upload:** `Allow public uploads of payment proofs` (Insert allowed for `anon` role, target: `bucket_id = 'payment-proofs'`).
   - **View:** `Allow admins to view payment proofs` (Select allowed for `authenticated` role, target: `bucket_id = 'payment-proofs'`).

---

## 👤 Admin / Coach Portal Setup

To access the Coach Dashboard, you must register the admin account:
1. Go to the **Authentication** tab on your Supabase dashboard.
2. Click **Add User** -> **Create User**.
3. Input the admin's email and password.
4. Expand **User Metadata** and add a property named `full_name` with the value `Coach Paul`.
5. Click **Save**.
6. The trigger `on_auth_user_created` will automatically copy this new user into the public `profiles` table as a coach.
7. Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to sign in to the Coach Dashboard!

---

## 🏀 Business Workflows

### Client Self-Service Flow:
1. **Visit Landing Page:** Read Coach JP's bio, values, and testimonials.
2. **Book Session:** Select a service (1-on-1, 2-on-1, or Group).
3. **Select Date & Slot:** View matched slots derived from overlapping Coach Availability and Court Availability schedules.
4. **Detail Entry:** Input client info (under 18 dynamically prompts for parent authorization details).
5. **Manual GCash/Maya Payment:** GCash account name, number, and payment instructions are fetched dynamically. Client uploads a receipt screenshot and enters the Reference Code.
6. **Confirmation:** Receives a unique booking reference (`NGP-YYYY-XXXXX`) indicating `Pending Confirmation`.

### Client Booking Lookup & Cancellation:
- Clients can lookup booking statuses or details without an account by visiting `/booking/lookup` and searching with their Reference Code and Email/Phone.
- Self-service cancellation is permitted if the training starts **at least 24 hours in the future**. This updates the slot back to `available` and submits a manual refund request.

### Coach Administration:
- Log in to `/admin` to see key statistics (Today's sessions, Pending payments, Active refunds) and today's schedule.
- **Bookings Management:** Filter bookings, click "Verify" on pending payments to view uploaded screenshots using secure signed URLs, and approve/reject payments.
- **Schedule Management:** Add/delete manual availability time blocks for the coach and courts.
- **CRUD Operations:** Dynamically configure active services, courts (rental pricing), settings (GCash/Maya details), client listings, and active testimonials.

---

## 🏗️ Production Deployment

To compile a clean production bundle of the application, run:
```bash
npm run build
```

This compiles optimized client-side assets and ensures static page shell generations resolve correctly.
