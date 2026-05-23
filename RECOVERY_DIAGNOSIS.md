# RECOVERY DIAGNOSIS

## 1. PROJECT STRUCTURE
- `src/app/` — Next.js App Router definitions (`dashboard`, `login`, `api`).
- `src/components/forms/` — 8 core form components matching the intake/support workflow.
- `src/components/layout/` — Main structural UI panels (Sidebar, Topbar, FormsPanel, Workspace).
- `src/lib/` — Core utilities: Supabase clients (`client.ts`, `server.ts`), blockchain (`merkle.ts`), and GDPR compliance.
- `tests/` — Playwright E2E tests and integration tests.
- `public/` — Static assets (fonts, images).
- `docs/` — Governance and documentation files (`WORKFLOW_AUDIT.md`, `REGRESSION_PROTECTION.md`).

## 2. TECH STACK FOUND
- Next.js: 14.2.29
- React: ^18
- Supabase SSR: ^0.10.3 (supabase-js ^2.105.4)
- TypeScript: ^5
- (Dependencies confirmed via `package.json`)

## 3. FEATURE AUDIT
- [BROKEN] Tenant list in sidebar (cannot fetch from Supabase)
- [BROKEN] Tenant selection → form loads (no data available)
- [UNKNOWN] + New Tenant button (UI works, but backend save fails)
- [UNKNOWN] Personal Details form (all 19 fields) (UI present, save fails)
- [UNKNOWN] Sessions tab (Daily/Weekly/Monthly) (UI present, load fails)
- [UNKNOWN] AI Brain panel (3 suggested questions) (requires active tenant)
- [UNKNOWN] Service Charge Ledger (requires tenant data)
- [UNKNOWN] Intake Checklist (7 items) (UI present, save fails)
- [WORKING] Forms Panel (right panel, 7 form cards) (UI renders)
- [WORKING] Letterhead switcher (3 brands) (UI toggle functional)
- [BROKEN] Audit trail on save (database disconnected)
- [BROKEN] Blockchain hash on save (database disconnected)
- [UNKNOWN] Eviction notice modal (requires tenant context)
- [WORKING] Print active form (browser print triggers correctly)
- [BROKEN] Auth (Manager / SupportWorker / Tenant roles) (stuck on load)
- [BROKEN] Sign out (cannot terminate non-existent session)

## 4. BROKEN ITEMS — EXACT EVIDENCE
- `Failed to load data` — Error string returned when `check-tenants.ts` or `page.tsx` fails to execute `supabase.from('tenants').select()`.
- `0 Active` / `No tenants yet` — Default empty state rendered when `tenants` array length is 0 due to API failure.
- `Loading... Manager` — Auth state stuck indefinitely waiting for Supabase session resolution.
- `No tenant selected` — `FormWorkspace` default fallback when `activeTenant` is null.
- `Risk Flags shows "2"` — Hardcoded badge state out of sync with dynamic data load failure.
- `All buttons unresponsive` — Form save actions trap `isSaving` state due to unhandled promise rejections on API failure.

## 5. ENVIRONMENT AUDIT
- **Does `.env.local` exist?** NO (Confirmed missing, only `.env.local.bak` and templates exist).
- **Does `.env.example` or `.env.template` exist?** NO.
- **Are keys hardcoded?** NO. (Checked via `grep -r "supabase.co\|eyJ\|service_role" src/`, zero results outside of `.env` files and `node_modules`).

## 6. TYPESCRIPT ERRORS
Ran: `npx tsc --noEmit 2>&1`
- *Current Status:* 0 errors. The previously reported 10 errors in VS Code (which were likely DOM type mismatches in `tests/print-forms.spec.ts`) have already been resolved in a prior commit. Compilation is currently clean.

## 7. ROOT CAUSE RANKING
1. Missing `.env.local` (Total failure of Supabase clients).
2. Auth state lacks a timeout/fallback for missing credentials (causes the infinite "Loading... Manager").
3. API route exception handling silently traps the UI `isSaving` prop when the DB connection fails.
4. Tenant list strictly demands a network response and has no local mock fallback when `.env` is absent.
5. Missing `.env.example` meant developers couldn't easily reconstruct the environment locally.

## 8. MATTY'S PLACE CONCEPT ALIGNMENT CHECK
- **Three-panel layout?** YES. Exists in `page.tsx` with sidebar, workspace, and right panel.
- **Colours?** YES. Navy (#0F1C2E), amber (#E8A84C), cream (#F8F4EF) present in `tailwind.config.js` and UI.
- **Three brands?** YES. Implemented in `LetterheadSwitcher.tsx`.
- **Blockchain stamp?** YES. Core logic exists in `src/lib/blockchain/merkle.ts`.
- **AI Brain?** YES. Present in `AIBrainPanel.tsx`.
- **53-page form structure?** YES. Translated into the 8 core React forms matching the operational workflow.

## 9. FIX PRIORITY ORDER
1. Re-create `.env.local` from a template and add `.env.example`. (Restores DB capability or isolates the failure).
2. Implement auth timeout fallback in the global layout/provider. (Unsticks the app UI).
3. Inject local mock data for testing UI continuity when DB is unreachable. (Unblocks tenant selection).
4. Verify form save actions correctly catch network errors instead of freezing buttons.
