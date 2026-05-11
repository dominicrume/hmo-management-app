# AI Engineering Rules

You are assisting in building an enterprise-grade AI + blockchain application.

Rules:
- Use clean architecture
- Use TypeScript
- Use reusable components
- Keep files modular
- Never expose secrets
- Optimize for scalability
- Keep mobile responsive
- Use simple comments
- Explain difficult logic clearly
- Follow enterprise engineering standards


# CLAUDE.md — Matty's Place
## You are building: Matty's Place
HMO tenant management system for General Matlub, Birmingham UK.
Read /docs/PWD.md for full product requirements.
Read /docs/DESIGN.md for all UI/UX specifications.
Read /docs/URD.md for role-based access rules.

## Tech Stack
Frontend:   Next.js 14 (App Router), React, TypeScript
Styling:    Tailwind CSS — use DESIGN.md colour tokens
Database:   Supabase (PostgreSQL) — see /supabase/schema.sql
Auth:       Supabase Auth with Row Level Security
Fonts:      Sora + JetBrains Mono (Google Fonts)
Deploy:     Google Cloud Run

## Coding Rules
- NEVER hardcode tenant data — all data via intake pipeline
- EVERY save stamps: user name, role, timestamp, input method
- Forms must match /specs/forms/ specs exactly — field by field
- Three user roles: Manager / SupportWorker / Tenant (see URD.md)
- Blockchain stamp = SHA-256 hash in audit_logs table (Phase 1)
- All colours from DESIGN.md tokens — navy #0F1C2E, amber #E8A84C

## Never Do
- Never use Lorem Ipsum — use realistic HMO field values
- Never skip audit trail on any save operation
- Never show tenant data to wrong role (RLS enforced)
- Never use inline styles — use Tailwind classes

## File Locations
- Components → src/components/[name]/index.tsx
- Pages → src/app/[route]/page.tsx  
- DB types → src/types/database.ts
- Supabase client → src/lib/supabase.ts

