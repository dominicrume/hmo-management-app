# CORE WORKFLOWS SPECIFICATION

This document lists and defines the 7 sacred workflows of the Matty's Place HMO Management application that must be protected from regressions.

---

## 1. Authentication Workflow
* **Purpose:** Authenticate support staff and managers to control access to sensitive tenant records and management features.
* **Expected Behavior:** Users input their credentials on the `/login` page and are redirected to the `/dashboard`. Unauthenticated access redirects back to `/login`.
* **UI Elements Required:** Email/Password input fields, Login submit button, error messages.
* **API Dependencies:** Supabase Auth `/auth/v1` endpoints (sign-in, token refresh).
* **Failure Risks:** Lockout of valid users, session expiration leading to data loss, or redirection loops.
* **Regression Protection Notes:** Monitored via Playwright tests and managed by routing middleware in `src/middleware.ts`.

---

## 2. Dashboard Workflow
* **Purpose:** Provide managers and support workers with a high-level overview of system status, active tenant metrics, and alerts.
* **Expected Behavior:** Renders active tenant counters, unpaid service charges notifications, and sidebar navigations with live data updates via Supabase.
* **UI Elements Required:** Stats cards, notification bell, global search bar, tenant sidebar listings.
* **API Dependencies:** `/api/tenants`, `/api/charges?unpaid=true`, `/api/me`.
* **Failure Risks:** Stale data, infinite spinners if Supabase disconnects, or crash due to null user context.
* **Regression Protection Notes:** Handled by graceful state defaults, error boundaries, and Postgres real-time subscription channels.

---

## 3. AI Brain Workflow
* **Purpose:** Assist support staff in analyzing tenant needs, identifying risks, and generating administrative draft logs using RAG context.
* **Expected Behavior:** Staff select a tenant, open the AI Brain tab, and chat about tenant sessions. The model references past session notes and tenant profiles to output suggestions.
* **UI Elements Required:** AI Brain Tab, Chat input box (textarea), Send button, Clear history button, Quick Task chips.
* **API Dependencies:** `/api/ai/brain`, OpenAI Chat Completions API (`gpt-4o`).
* **Failure Risks:** 404/not_found_error for incorrect model naming, rate limits hit (10/min), or missing OpenAI keys in the environment.
* **Regression Protection Notes:** Model name is strictly locked to `gpt-4o` in `src/lib/ai/orchestrator.ts`. Checked by Playwright mocking.

---

## 4. Suggested Question Workflow
* **Purpose:** Prompt support workers with contextual follow-up questions for the next session.
* **Expected Behavior:** Automatically loads three targeted questions generated based on the tenant's ten most recent session logs when the AI Brain panel is opened.
* **UI Elements Required:** "This Week's Questions" list under the AI Brain panel header, Refresh button.
* **API Dependencies:** `/api/ai/questions`, OpenAI Chat Completions API (`gpt-4o-mini`).
* **Failure Risks:** Crash when there are no past sessions (should degrade to default general questions), or timeout fetching sessions.
* **Regression Protection Notes:** Handled by a default questions fallback array on line 22 of `/api/ai/questions/route.ts` if sessions count is zero.

---

## 5. Form Save Workflow
* **Purpose:** Securely save tenant intake and compliance documentation to Supabase and record a cryptographic proof to the blockchain.
* **Expected Behavior:** Support worker fills a form, clicks save. The data is updated in Supabase, an audit log is created, and the data hash is submitted to the Polygon smart contract.
* **UI Elements Required:** "Save" button in each form section, status indicators, success notifications.
* **API Dependencies:** `/api/tenants`, `/api/audit`, Polygon RPC node.
* **Failure Risks:** Form save failures due to Supabase connection drop, blockchain gas exhaustion, or invalid input validation rules.
* **Regression Protection Notes:** Save logic does not block the user if blockchain stamps fail (async queueing or non-blocking logging), preventing UX freeze.

---

## 6. Navigation Workflow
* **Purpose:** Seamlessly switch between active views (Dashboard, Sessions, Ledger, Risks, Audit, Settings) and individual tenant forms.
* **Expected Behavior:** Tapping items in the sidebar or mobile menu updates active state and renders the corresponding panel or sub-form.
* **UI Elements Required:** Sidebar navigation menu, mobile hamburger toggle, tenant selection cards.
* **API Dependencies:** Next.js client Router navigation.
* **Failure Risks:** Route redirects to login, loss of unsaved form state on navigate, or blank main viewport.
* **Regression Protection Notes:** State is persisted at the page-level (`activeNav`, `activeForm`) and prompt warnings warn users on unsaved forms.

---

## 7. Session Persistence Workflow
* **Purpose:** Keep user authenticated across page reloads and browser restarts without requiring re-login.
* **Expected Behavior:** Browser client checks Supabase cookies on start and refreshes JWT token in the background.
* **UI Elements Required:** None (background processing).
* **API Dependencies:** Supabase Session cookies, `/auth/v1/session`.
* **Failure Risks:** Silent token expiration resulting in random 401s on save, redirect loops, or token hijacking.
* **Regression Protection Notes:** Handled by next-auth or Supabase SSR middleware, maintaining active session state.
