# Deployment Guide

This document provides step-by-step instructions for deploying and configuring the HMO Management Application in a production environment.

---

## 1. Hosting Environment (Vercel)

The frontend and API layer are built with **Next.js 14** and are optimized for deployment on **Vercel**.

### Configuration
1. Connect your GitHub repository to Vercel.
2. Select the repository `dominicrume/HMO-management-app`.
3. Set the **Framework Preset** to **Next.js**.
4. Configure the **Build Command** to:
   ```bash
   NODE_OPTIONS=--dns-result-order=ipv4first next build
   ```
5. Ensure the production branch tracks `main`. Every push to `main` will trigger a production deployment, while pushes to `staging-hardening` trigger a staging preview deployment.

---

## 2. Database Environment (Supabase)

Persistence and authentication are powered by **Supabase**.

### Initialization Steps
1. Create a new project in the Supabase Dashboard.
2. Run database migrations to provision the schema tables:
   * `users`
   * `tenants`
   * `sessions`
   * `service_charges`
   * `audit_logs`
   * `tenant_verifications`
   * `worker_tenant_assignments`
3. Enable **Row-Level Security (RLS)** on all tables.
4. Apply the security policies specified in `docs/SYSTEM_ARCHITECTURE.md`.
5. Enable the **Postgres Realtime** replication channel for the `tenants` table to support live dashboard updates.

---

## 3. Blockchain Deployment (Polygon)

Audit hashing utilizes the `MattysPlaceAudit` smart contract deployed to the **Polygon** network.

### Contract Compilation & Deployment
1. Verify compiler settings in `hardhat.config.js`.
2. Compile the smart contract:
   ```bash
   npx hardhat compile
   ```
3. Deploy the contract to Polygon Amoy Testnet (or Mainnet):
   ```bash
   npx hardhat run scripts/deploy.ts --network polygon_amoy
   ```
4. Copy the deployed contract address and bind it to the `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variable.

---

## 4. Environment Variables Specification

The following variables must be configured in Vercel and your local `.env.local` file:

| Variable Name | Type | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Your Supabase project API URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Anon public key for database connection. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Service role key bypasses RLS for critical operations (e.g. initial setup). |
| `OPENAI_API_KEY` | Server-only | API key for OpenAI GPT-4o orchestrator. |
| `POLYGON_RPC_URL` | Server-only | RPC endpoint URL for the Polygon node. |
| `POLYGON_PRIVATE_KEY` | Server-only | Wallet private key to stamp hashes on-chain. |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Client | Deployed `MattysPlaceAudit` contract address. |

---

## 5. Continuous Integration (CI/CD)

The repository uses Playwright for End-to-End testing.

To run tests locally prior to pushing code:
```bash
npx playwright test
```
The test suite validates:
1. **Multi-Page Printing Layouts**
2. **Strict RLS / Database RBAC guards**
3. **Voice-to-Text pipelines**
