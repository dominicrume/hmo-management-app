-- =============================================================================
-- MATTY'S PLACE — Migration v9: Fix Tenant Deletion Foreign Key Constraints
-- Run in Supabase SQL Editor to allow clean cascading tenant deletion.
-- =============================================================================

-- Redefine audit_logs_tenant_id_fkey to ON DELETE SET NULL.
-- Since audit_logs has a DO INSTEAD NOTHING rule on UPDATE, manual updates will fail.
-- An engine-level foreign key action (ON DELETE SET NULL) bypasses the rules,
-- allowing the database engine itself to nullify the reference when a tenant is deleted.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_tenant_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
