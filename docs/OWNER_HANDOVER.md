# Owner Handover Guide

This guide details the procedures for rotating credentials, conducting onboarding, and configuring first-time setup states for the owner of the HMO Management Application.

---

## 1. System Handover State

The application has been prepared for real-world production ownership:
* **Pristine Database State:** The database has been purged of test records. The active tenant count is strictly **0**.
* **Clean Configuration:** Hardcoded development flags and credentials have been removed.
* **OpenAI Strict Binding:** The AI engine is bound strictly to production OpenAI endpoints (`gpt-4o`).

---

## 2. Onboarding & First-Time Setup

When deploying to a fresh database:
1. Ensure all environment variables in `docs/DEPLOYMENT.md` are populated.
2. The database should be empty.
3. When the first user logs in via Supabase Magic Link, the system automatically checks if they have a profile in the `users` table.
4. If no users exist, the system triggers the onboarding script `/api/setup` which provisions the first authenticated user as a **Manager** (admin).
5. All subsequent sign-ups will default to the **SupportWorker** role, requiring a Manager to verify and assign them to tenants manually.

---

## 3. Credentials Rotation Checklist

Prior to handover, rotate the following production credentials:

1. **Supabase JWT Secret & API Keys:**
   * Go to Supabase Dashboard > Settings > API.
   * Generate a new JWT Secret.
   * Update the anon public key and service role key in Vercel.
2. **OpenAI API Key:**
   * Revoke existing developer keys in the OpenAI console.
   * Generate a new API Key for the owner's billing account.
3. **Polygon EVM Wallet:**
   * Import the private key into a secure vault (e.g. MetaMask, Vault).
   * Ensure the wallet contains sufficient MATIC to pay for transaction gas.
   * If replacing the wallet, update `POLYGON_PRIVATE_KEY` and redeploy the smart contract.
4. **Vercel Project Ownership:**
   * Transfer the Vercel project to the Ash Shahada Housing Association organization account.

---

## 4. Troubleshooting & Recovery Procedures

### AI Brain Outages / 404 Errors
* **Symptom:** AI Brain displays `404 model not found` or similar errors.
* **Root Cause:** Stale API key or deprecated model identifier.
* **Resolution:** Ensure `OPENAI_API_KEY` is active and check `src/lib/ai/orchestrator.ts` to confirm model strings are aligned with current OpenAI production versions.

### Blockchain Stamp Failures
* **Symptom:** Saving forms succeeds but blockchain stamps time out or fail.
* **Root Cause:** RPC node rate-limiting, network congestion, or zero MATIC balance.
* **Resolution:** 
  1. Inspect transaction logs in the Polygon scan explorer.
  2. Replenish the wallet balance with MATIC.
  3. Verify/replace the `POLYGON_RPC_URL` with a reliable RPC provider (e.g. Infura, Alchemy).
  * *Note: The UI is designed to degrade gracefully — failed blockchain stamps will not block saving form data to the database.*

### Database Permission Blocks (RLS Errors)
* **Symptom:** Support worker gets a `403 Forbidden` or empty data when saving forms.
* **Root Cause:** Support worker is not assigned to the tenant.
* **Resolution:** A Manager must create an assignment entry in the `worker_tenant_assignments` table linking the Support Worker to the target Tenant.
