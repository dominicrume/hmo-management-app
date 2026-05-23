# Matty's Place AI Briefing (CLAUDE.md)

## Tech Stack
- Next.js 14.2 App Router
- React 18
- Supabase SSR (Auth, Postgres DB)
- TypeScript
- Tailwind CSS

## Design Tokens (MUST use exactly)
- Primary: #0F1C2E (Navy)
- Accent: #E8A84C (Amber)
- Canvas: #F8F4EF (Warm Cream)
- Surface: #FFFFFF (White)

## Three Brands
1. Matty's Place
2. Ash Shahada Housing Association Ltd
3. Reliance Housing

## Three User Roles
1. Manager (full access)
2. SupportWorker (assigned tenants only)
3. Tenant (read own record + sign only)

## 8 Governing Lessons
1. Truth Over Assumption — diagnose with evidence first.
2. One Source of Truth — UI and DB must agree.
3. One Change at a Time — no broad hardening passes without commits.
4. Save Before You Change — commit often.
5. One Module, One Job — separate concerns.
6. Secrets Only in `.env` — no hardcoded keys.
7. Build Environment Around the Model — maintain governance files.
8. Small Explained Steps — explain before running.

## Never-Do Rules
- DO NOT run broad refactorings across multiple domains without checking in.
- DO NOT change colors to generic Tailwind blues or reds.
- DO NOT bypass RLS implicitly in client components.

## File Structure & DB Tables
- `/src/components/forms` — Contains the 8 core operational forms.
- `/src/app/dashboard` — Main app shell layout.
- Tables: `users`, `tenants`, `forms`, `audit_logs`.
