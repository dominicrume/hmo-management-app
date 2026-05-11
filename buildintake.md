# /build-intake — Intake Pipeline Command

## Task
Build the complete 5-step tenant intake pipeline.
Reference: /docs/PWD.md Section 4 (Intake Workflow)

## Screens to build (in order)
1. /intake/new — Step 1: Choose entry mode (Manual/OCR/Voice)
2. /intake/ocr-review — Step 2: Review OCR extracted fields
3. /intake/staff-review — Step 3: Staff confirm + blockchain preview
4. /intake/tenant-verify — Step 4: Tenant verification portal
5. /intake/complete — Step 5: Success + blockchain stamp confirmation

## Components needed
- EntryModeCard — 3 selection cards (Manual/OCR/Voice)
- OCRReviewPanel — split: form image left, fields right
- BlockchainStampPreview — purple card, hash preview
- TenantSignatureField — finger-draw or type-name input
- BlockchainConfirmCard — success screen stamp display

## Database operations
- INSERT into tenants table (see /supabase/schema.sql)
- INSERT into audit_logs with SHA-256 hash
- INSERT into tenant_verifications for Step 4 event

## RLS Rules (from /docs/URD.md)
- Manager: full access
- SupportWorker: can create, assigned tenants only
- Tenant: read own record + sign only