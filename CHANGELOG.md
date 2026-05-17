# Changelog

All notable changes to Matty's Place are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Tenant self-service portal (read-only)
- Weekly council export PDF
- Polygon on-chain stamp (Phase 2)
- Push notifications for risk flags
- Mobile PWA (Capacitor)

---

## [0.5.0] — 2026-05-17

### Added
- Enterprise component architecture: `navbar`, `sidebar`, `cards`, `tables`, `modals`, `ui`
- `Navbar` — global search, notification bell, role badge, user dropdown
- `Sidebar` — collapsible, role-gated nav, live tenant/risk count badges
- `StatCard` — metric tile with trend indicator
- `TenantCard` — tenant summary card with status and risk flag
- `TenantsTable` — sortable, clickable tenant rows
- `AuditTable` — audit log with blockchain hash display
- `ConfirmModal` — reusable confirm dialog (danger / warning / default)
- `TenantModal` — tenant quick-view with Open Forms action
- `Badge`, `Button`, `EmptyState` — shared UI primitives
- Master barrel export at `src/components/index.ts`
- `CONTRIBUTING.md` — branch strategy, commit conventions, versioning rules

### Fixed
- Renamed `master` → `main` as default branch (GitHub contribution graph now counts all commits)
- Deleted stale `master` branch from remote

### Security
- All DB writes in `forms/save`, `sessions`, `charges` now use service role client — fixes RLS permission denied errors
- Auth callback auto-links `auth_id` to seeded users row on first login

### Infrastructure
- Full 7-table schema applied to Supabase project `uictwafatmgfqkguwspe` (eu-west-1)
- Supabase env vars (`URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) set on Vercel production
- Manager account seeded: General Matlub / dominicrume@gmail.com

---

## [0.4.0] — 2026-05-13

### Added
- `Form02SupportChecklist` updated to match exact Ash Shahada operational document
- 3-phase workflow: ON_ARRIVAL (10 items), WITHIN_3_DAYS (2 items), AFTER_3_DAYS (5 items)
- FormsPanel FORMS array reordered to match real intake sequence
- New API routes: `src/app/api/admin/`, `src/app/api/auth/`
- Security utilities: `src/lib/security/` (session, rbac, rate-limit, env)

### Fixed
- Risk Assessment marked as internal — not shared with resident
- HB application correctly listed as first task on arrival

---

## [0.3.0] — 2026-05-12

### Added
- Dashboard V2.4.0: always-visible navy status bar, ☰ Menu dropdown, global search
- Settings view inline in dashboard
- Sidebar navigation to settings view
- `FormWorkspace` fully rewired to use pre-built `Form01`–`Form08` components
- `/api/forms/save` upgraded to match all Form0X component data shapes
- Blockchain SHA-256 hash stamp on all form saves
- Sidebar now hidden in form view — menu button added to header

### Fixed
- `nok_address` removed from intake insert payload (not a DB column)
- Sidebar hardcoded badge values replaced with live `tenantCount` / `riskCount` props
- Tenant selection now navigates to form view from full-width views
- Dashboard Supabase errors now throw proper Error objects

---

## [0.2.0] — 2026-05-11

### Added
- Full frontend architecture: `FormWorkspace`, `FormsPanel`, `Sidebar`, `AIBrainPanel`
- Forms 1–8 as reusable components with validation
- Sessions API: GET with tenant filter + POST with audit log
- OCR pipeline: upload, extract, staff review, tenant verify
- Voice-to-text AI extraction workflow
- AI Brain panel wired to `/api/ai/brain` and `/api/ai/questions`

### Changed
- Migrated AI pipeline from Anthropic to OpenAI (gpt-4o)

---

## [0.1.0] — 2026-03-25

### Added
- Project initialised: Next.js 14, TypeScript, Tailwind CSS, Supabase Auth
- Initial schema design: `users`, `tenants`, `audit_logs`, `sessions`, `service_charges`
- Row Level Security policies for Manager / SupportWorker / Tenant roles
- Supabase project created: `uictwafatmgfqkguwspe` (eu-west-1)
- Vercel deployment configured: `hmo-management-app.vercel.app`
