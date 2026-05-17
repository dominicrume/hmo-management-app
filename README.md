# Matty's Place — HMO Management System

> Enterprise-grade tenancy management platform for **Ash Shahada Housing Association Ltd**, Birmingham UK.
> Built for General Matlub · Reliance Housing · Matty's Place.

[![Version](https://img.shields.io/badge/version-0.5.0-amber)](./CHANGELOG.md)
[![Live](https://img.shields.io/badge/live-hmo--management--app.vercel.app-green)](https://hmo-management-app.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

---

## What This Is

A full-stack HMO (House in Multiple Occupation) management system that handles:

- **Tenant intake** — 8-form digital pack (personal details, missing person, risk assessment, support plan, etc.)
- **OCR pipeline** — upload paper forms → AI extracts data → staff review → tenant verifies
- **AI Brain** — GPT-4o generates follow-up questions after each support session
- **Audit trail** — every save produces a SHA-256 blockchain stamp (Polygon Phase 2)
- **Role-based access** — Manager / SupportWorker / Tenant with full RLS enforcement
- **Session logging** — daily, weekly, monthly support sessions per tenant
- **Service charge ledger** — weekly payment tracking with payment status

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) + Row Level Security |
| Auth | Supabase Auth (magic link) |
| AI | OpenAI GPT-4o |
| Blockchain | SHA-256 (Phase 1) · Polygon ERC-721 (Phase 2) |
| Deploy | Vercel (auto-deploy from `main`) |
| Fonts | Sora + JetBrains Mono |

---

## Project Structure

```
src/
├── app/                    Next.js App Router pages + API routes
│   ├── (auth)/login/       Login page
│   ├── api/                REST endpoints (forms, sessions, ai, audit, stats)
│   ├── auth/callback/      Supabase auth callback + auth_id linking
│   ├── dashboard/          Main app shell
│   └── intake/             OCR review, staff review, tenant verify
│
├── components/             Reusable component library
│   ├── navbar/             Global navbar
│   ├── sidebar/            Collapsible role-gated nav
│   ├── cards/              StatCard, TenantCard
│   ├── tables/             TenantsTable, AuditTable
│   ├── modals/             ConfirmModal, TenantModal
│   ├── ui/                 Badge, Button, EmptyState
│   ├── forms/              Form01–Form08 (full intake pack)
│   ├── views/              Dashboard, Audit, Ledger, Risk, Sessions, Print
│   ├── layout/             FormWorkspace, FormsPanel, Sidebar, Letterhead
│   └── ai/                 AIBrainPanel
│
├── lib/
│   ├── supabase/           server.ts (createClient + createServiceClient)
│   ├── dal/                auth.ts (data access layer)
│   └── security/           session, rbac, rate-limit, env validation
│
└── types/
    └── database.ts         Full TypeScript types for all Supabase tables
```

---

## Database Schema

7 tables with full RLS:

| Table | Purpose |
|---|---|
| `users` | Staff accounts (Manager / SupportWorker) |
| `tenants` | 30-field master record per resident |
| `sessions` | Daily/weekly/monthly support sessions |
| `service_charges` | Weekly payment ledger |
| `audit_logs` | Immutable blockchain-stamped audit trail |
| `tenant_verifications` | Tenant signature events |
| `worker_tenant_assignments` | Many-to-many worker→tenant scoping |

---

## User Roles

| Role | Access |
|---|---|
| `Manager` | Full CRUD across all tenants, all data, audit logs, ledger |
| `SupportWorker` | Assigned tenants only — sessions, forms, limited reads |
| `Tenant` | Read-only own record + sign own verification |

---

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run dev server
npm run dev
# → http://localhost:3000
```

---

## Deployment

Vercel auto-deploys on every push to `main`.

```bash
# Deploy manually
npx vercel deploy --prod
```

Production URL: **https://hmo-management-app.vercel.app**

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format (Conventional Commits)
- Versioning rules (Semantic Versioning)
- PR process and branch protection rules

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for full release history.

Current version: **v0.5.0**

---

## License

Private — Ash Shahada Housing Association Ltd · All rights reserved.
