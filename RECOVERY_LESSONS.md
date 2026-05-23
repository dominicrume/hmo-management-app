# Recovery Lessons

## What Broke
The application suffered a total frontend UI freeze ("Loading... Manager" stuck indefinitely, "Failed to load data", form buttons unresponsive).

## Why It Broke
A "product hardening and scaling" pass was run that changed multiple files simultaneously across different domains (auth, components, state management, compliance). Critically, `.env.local` was wiped/omitted, causing silent Supabase credential failures which cascaded into unhandled promise rejections on the client, permanently freezing state variables.

## How to Prevent It
1. **Never run broad "hardening" passes without committing before each change.** (Rule 4: Save Before You Change).
2. **`.env.local` must always exist before `npm run dev`.** We have now created `.env.example` and added validation checks in `client.ts` and `server.ts` to surface environment errors explicitly.
3. **Always commit working state before any refactor.** Every phase of recovery is now isolated to a discrete git commit.
4. **Resilient UI State:** Network requests must always have timeouts and fallback mock data (e.g. `NEXT_PUBLIC_USE_LOCAL_DATA`) for when backend services are unconfigured.
