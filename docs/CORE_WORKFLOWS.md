# CORE WORKFLOWS

## 1. The Intelligent Operational Loop
The Matty's Place HMO application enforces a strict operational workflow for Support Workers and Management, augmented by the OpenAI-powered `gpt-4o` Intelligence Orchestrator.

**Loop:** `Login ➔ Open Dashboard ➔ Open Tenant Case ➔ Fill Compliance Form ➔ AI Brain Suggests Actions ➔ User Chats with AI ➔ Save Workflow (Supabase) ➔ Stamp to Polygon ➔ Dashboard Updates.`

1. **Authentication:** User authenticates via Supabase Auth (Magic Link or OAuth).
2. **Dashboard Overview:** Displays active cases, overdue compliance, and risk levels across tenants.
3. **Tenant Case Access:** Support worker opens a tenant profile to view historical data and form status.
4. **Compliance Intake:** Worker fills out one of the 8 mandatory compliance forms (e.g., Personal Details, Confidentiality Waiver).
5. **AI Orchestrator Intercept:** The `gpt-4o` Brain intercepts the payload, analyzes risk parameters (e.g., Next of Kin discrepancies, health warnings), and injects AI suggestions directly into the worker's chat feed.
6. **AI Chat & Refinement:** The worker communicates with the AI Brain to refine actions or retrieve policy data.
7. **Blockchain Ledger Commit:** Upon form submission, the system generates a SHA-256 payload hash and stamps it to the `MattysPlaceAudit` Smart Contract on the Polygon Amoy blockchain.
8. **Dashboard Update:** The UI reacts to real-time Supabase subscriptions, immediately reflecting the updated compliance status.

## 2. CI/CD Testing & Defense Gates (Playwright)
To maintain the integrity of the platform, the CI/CD pipeline enforces the following strict gates before any deployment:

* **The Multi-Page Print Assertion:** Verifies the print layout media queries are present for the 8 distinct form wrappers.
* **Strict Database RBAC Guard:** Asserts that non-admin accounts (SupportWorkers) receive a `403 Unauthorized` when attempting a hard tenant deletion.
* **Voice-to-Text Pipeline Hook:** Validates the API endpoints for voice transcription ingestion are active and properly authenticated.

## 3. Blockchain Immutability
To comply with strict auditing requirements, the system prevents any hard deletions of audit logs (`audit_logs_no_delete` rule). Tenant records are soft-deleted (`status = 'inactive'`) to preserve the integrity of the historical cryptographic hashes stamped to Polygon.
