# St Clare Inventory Stock App

A Next.js inventory app for St Clare that uses Google Sheets as the source of truth, Firebase Google sign-in for both admin and staff roles, analytics dashboards, and SMTP low-stock alerts.

## Features

- **Staff workspace:** record stock in and stock out against the shared Google Sheet
- **Admin dashboard:** KPIs, low-stock table, item management, analytics charts
- **Email alerts:** SMTP notifications when stock falls to the reorder level
- **Audit log:** every movement is appended to a `Transactions` sheet tab

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Google Sheets API (service account)
- Firebase Auth (Google sign-in for admin and staff)
- Nodemailer (SMTP)
- Recharts (analytics)
- Vercel deployment + Cron

## Prerequisites

1. A Google Cloud project with the **Google Sheets API** enabled
2. A Google service account with access to the inventory spreadsheet
3. A Firebase project with Google sign-in enabled
4. SMTP credentials for alert emails

## Google Sheet setup

Use this spreadsheet (or your own copy with the same columns):

`https://docs.google.com/spreadsheets/d/13YAJPLi-W_JxZBRAj-7GMdV0iLvG4Kn_4oufQKB15fo/edit`

`Sheet1` columns:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Item ID | Item Name | Category | Unit | Opening Stock | Stock In | Stock Out | Closing Stock | Reorder Level | Notes |

The app will auto-create these tabs if they do not exist:

- `Transactions` — audit log columns: Timestamp, Item ID, Item Name, Type, Quantity, User Email, Notes, **Destination** (stock-out: Charity Work / Office / Kitchen; blank stock-outs default to Kitchen)
- `AlertLog`
- `Corrections` — admin stock adjustment audit log
- `DailyReportTemplate` — legacy flat list (migrated automatically to Monday breakfast)
- `WeeklyMenuTemplate` — weekday + meal menu: Day, Meal, Sort, Item ID, Item Name
- `DailyReportSettings` — enabled flag, send time (HH:MM, Africa/Nairobi), recipients, last sent date

Share the spreadsheet with your service account email as **Editor**.

## Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Important groups:

- `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_ADMIN_*` for Firebase auth
- `ADMIN_UIDS`, `STAFF_UIDS`, and matching `NEXT_PUBLIC_*` UID lists
- `ADMIN_ACCESS_PASSWORD`, `STAFF_ACCESS_PASSWORD`, and `PORTAL_SECRET` for the second-step password gate
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `SMTP_*` and `ADMIN_ALERT_EMAIL`
- `CRON_SECRET` for the scheduled low-stock job
- `NEXT_PUBLIC_APP_URL` for links inside alert emails

### Setting up Firebase UIDs

1. Enable **Google** sign-in in Firebase Console
2. Add `localhost` to Firebase authorized domains
3. Have each user sign in once at `/admin/login` or `/clerk/login` (Google first, then role password)
4. Copy their **UID** from Firebase Console → Authentication → Users
5. Add UIDs to `.env.local`:

```bash
ADMIN_UIDS=uidForAdmin1,uidForAdmin2
STAFF_UIDS=uidForStaff1,uidForStaff2
NEXT_PUBLIC_ADMIN_UIDS=uidForAdmin1,uidForAdmin2
NEXT_PUBLIC_STAFF_UIDS=uidForStaff1,uidForStaff2
ADMIN_ACCESS_PASSWORD=your-strong-admin-password
STAFF_ACCESS_PASSWORD=your-strong-staff-password
PORTAL_SECRET=random-long-secret-for-cookie-signing
```

6. Restart the dev server

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Landing page |
| `/admin/login` | Admin | Google sign-in + admin password |
| `/admin/dashboard` | Admin | KPIs and low-stock list |
| `/admin/analytics` | Admin | Charts + daily stock by date |
| `/admin/reports` | Admin | Period reports (weekly/monthly/4 months/custom) |
| `/admin/daily-report` | Admin | Daily stock email template, preview, PDF, and send |
| `/admin/items` | Admin | Edit items and reorder levels |
| `/admin/corrections` | Admin | Admin stock corrections audit |
| `/admin/alerts` | Admin | Test email + low-stock review |
| `/clerk/login` | Staff | Google sign-in + staff password |
| `/clerk/stock-out` | Staff | Record usage |
| `/clerk/stock-in` | Staff | Record incoming stock |
| `/clerk/daily` | Staff | Today's per-item stock in/out |

## Deploy to Vercel

1. Push the repository to GitHub
2. Import the project in Vercel
3. Add all environment variables from `.env.example`
4. Deploy

`vercel.json` includes cron jobs (once per day — required on Vercel Hobby):

- `/api/cron/check-stock` at `0 6 * * *` UTC (9:00 AM Nairobi) — low-stock alerts
- `/api/cron/daily-report` at `0 15 * * *` UTC (6:00 PM Nairobi) — daily stock email when reporting is enabled

To change the automated email time, update the cron schedule in `vercel.json` (UTC) and redeploy.

Set `CRON_SECRET` in Vercel and ensure the cron route receives:

```http
Authorization: Bearer <CRON_SECRET>
```

## Stock logic

Closing stock is recalculated on every write:

```text
Closing Stock = Opening Stock + Stock In - Stock Out
```

Low-stock alerts fire when:

```text
Closing Stock <= Reorder Level
```

Alerts are deduplicated using the `AlertLog` tab until stock recovers above the reorder level.

## Authentication

Both admin and staff use **Firebase Google sign-in** plus a **second-step role password** verified on the server. Access is controlled by Firebase UID lists and portal passwords in the environment:

- `ADMIN_UIDS` / `NEXT_PUBLIC_ADMIN_UIDS` — full dashboard access
- `STAFF_UIDS` / `NEXT_PUBLIC_STAFF_UIDS` — stock in/out only
- `ADMIN_ACCESS_PASSWORD` / `STAFF_ACCESS_PASSWORD` — role passwords (server-only)
- `PORTAL_SECRET` — signs the httpOnly portal cookie after password verification

Login flow: Google sign-in first, then enter the role password. API routes require both a valid Firebase token and the portal cookie.

Login pages use a branded **Sign in with Google** button with the official Google logo.
