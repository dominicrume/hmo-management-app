# Regression Protection Strategy (Phase 7)

## Core Philosophy
The HMO Management Application is an enterprise-grade system. No features can be shipped if they compromise core workflows. Stability > Features.

## Key Invariants
1. **Forms Never Fail Silently:**
   - The `<FormWorkspace>` maintains the single source of truth for saving.
   - All forms MUST use the `isSaving` prop for disabled states.
   - Any server error MUST be surfaced immediately to the user and persist until dismissed or resolved.

2. **Blockchain Immutability:**
   - Every saved form payload is hashed.
   - Modifying a form triggers a re-hash.

3. **Session Stability:**
   - `supabase.auth.signOut()` must be accompanied by a server-side route call (`/api/auth/signout`) to guarantee that cookies are wiped by the `@supabase/ssr` server client before any redirection.

4. **Print Engine Accuracy:**
   - `Print Active Form` prints only the currently open tab.
   - `Print All Forms` mounts a hidden React tree containing all 9 forms populated with tenant data.
   - Print media queries (`print:hidden`, `print:block`) are strictly enforced. UI buttons MUST use `print:hidden`.

## Testing Strategy
- Playwright E2E tests (`tests/print-forms.spec.ts`, `tests/example.spec.ts`) cover the happy paths.
- Local E2E testing ensures CI passes cleanly without requiring external Vercel URLs during build/test phase.

## Manual QA Cadence
Before any major release:
1. Complete a full 8-form intake with a dummy tenant.
2. Hit "Save & Stamp" on all forms and verify UI feedback.
3. Test Print Active Form.
4. Test Print All Forms.
5. Delete the dummy tenant and confirm deletion cascade.
