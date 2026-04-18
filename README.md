# ReelFlix Launchpad

**Live site:** [https://reelflix.vip/](https://reelflix.vip/)

This document is written for **clients, stakeholders, and marketplace hiring** (e.g. follow-on work on Upwork-style platforms). It summarizes **what the product does**, **how it is built**, and **what Supabase powers**—so you can scope the next phase without digging through the repo.

---

## Product overview

ReelFlix Launchpad is a **full-stack subscription and operations platform**: a public marketing surface, a **member dashboard** for subscribers, and a deep **admin / back-office** for payments, referrals, compliance, and reliability tooling. It is designed to support **trial signups**, **paid plans**, **invoicing**, **referrals**, and **day‑2 operations** (queues, monitoring, audits).

---

## Business logic (what the system is for)

| Area | Purpose |
|------|--------|
| **Acquisition** | Landing experience, registration, and trial flows to convert visitors into accounts. |
| **Subscriptions & billing** | Subscription lifecycle, invoices, transactions, and integration with payment webhooks (crypto-oriented processor via server-side handlers). |
| **Referrals** | Referral codes, click tracking, and rewards to grow paid usage. |
| **Customer self-service** | Profile, guides, FAQ, password change, notification preferences, referral views. |
| **Operations & trust** | Admin dashboards for payments and fulfillment queues, fraud signals, SLA/incidents, backups/DR runbooks, legal acceptances, and a **public status** surface for transparency. |

Together, this is the kind of stack you need when the product is **more than a landing page**—it is meant to **run billing and operations** in production.

---

## Frontend & UX (what users see)

- **Stack:** **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **shadcn/ui** (Radix primitives), **TanStack Query**, **React Router**.
- **Public:** Home, authentication, registration, **public status** (`/status`), **trust center** (`/trust`).
- **Member dashboard** (`/dashboard`): start / watch entry, profile, guides, invoices & transactions, subscriptions, referrals & rewards, FAQ, notifications, password change.
- **Admin** (`/admin`): overview, users, payments & queues (payments queue, fulfillment), subscriptions, referrals, notifications, analytics, system audit & health, service status, incidents, change management, backup/restore, disaster recovery, SLA monitoring, staff activity, legal acceptances, runbooks, elevated permissions, data lifecycle, diagnostics, QA mode, pricing control, settings.
- **UX extras:** impersonation banner for safe support, WhatsApp contact affordance, toast notifications.

This is a **single-page application** pattern: fast client-side navigation, server data via Supabase client and Edge Functions where appropriate.

---

## Supabase (backend) — what we implemented

Supabase is the **system of record** and **serverless API** layer.

### Authentication & data

- **Supabase Auth** for user sessions; app routes protect member and admin areas.
- **PostgreSQL** holds the operational model: among others—profiles, subscriptions, invoices and line items, referrals, account credits, app settings, audit-oriented and operational tables (aligned with the generated TypeScript DB types in `src/integrations/supabase/types.ts`).

### Edge Functions (server-side logic)

Server-side jobs and integrations live as **Supabase Edge Functions**, including:

| Function | Role (high level) |
|----------|-------------------|
| `validate-trial-signup` | Validates trial registration rules server-side. |
| `trial-create` | Creates trial state for new signups. |
| `record-trial-usage` | Records trial usage for metering / limits. |
| `purchase-subscriptions` | Drives subscription purchase flow from the client with trusted server logic. |
| `nowpayments-webhook` | Handles **NowPayments** webhook events for paid orders. |
| `send-invoice-email` | Sends invoice-related email. |
| `track-referral-click` | Records referral link clicks for attribution. |
| `check-alerts` | Operational alerting (e.g. critical notifications with links back to the admin health views). |
| `scan-fraud` | Fraud scanning hooks for risk signals. |
| `simulate-payment` | Controlled payment simulation for testing / ops. |
| `delete-user` | Account deletion workflow. |
| `delete-all-invoices` | Bulk invoice cleanup (admin/maintenance style). |
| `qa-smoke-tests` | Automated smoke checks for QA workflows. |
| `export-database` | Database export utility for backups / migration support. |

Secrets (API keys, webhook signing, email) are **not** committed to git; they are configured in the Supabase project and referenced by these functions.

---

## Local development

Requirements: **Node.js** (LTS recommended) and **npm**.

```sh
git clone <your-repo-url>
cd reel-flix-launchpad
npm install
npm run dev
```

Configure **Supabase URL** and **anon key** for the Vite app (e.g. `.env` / `VITE_*` variables as used in `src/integrations/supabase/client.ts`) for local runs. Edge Functions are deployed separately via the Supabase CLI when you change server code.

**Build for production:**

```sh
npm run build
```

Serve the `dist/` output behind any static host or CDN; ensure environment variables match your production Supabase project.

---

## Suggested “next work order” themes (for proposals)

Use this list when posting or scoping marketplace jobs:

- Mobile-responsive polish and **Core Web Vitals** tuning  
- **Payment processor** additions or reconciliation reports  
- **Email** templates and deliverability (SPF/DKIM)  
- **Deeper analytics** and executive dashboards  
- **Localization** / multi-currency  
- **Pen test** remediation and **SOC2**-style controls mapping to existing audit tables  

---

## License

Private project; rights belong to the product owner unless otherwise agreed in writing.
