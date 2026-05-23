# User Role Document (URD)

## Role Access Matrix

### 1. Manager (e.g. General Matlub, Ahsan Rehman)
- **Tenants:** Can view, edit, and create all tenants.
- **Ledger:** Full access to view and manage service charges.
- **Audit/Risk:** Can view all audit logs and system-wide risk flags.
- **Settings:** Full access to manage system configuration and staff.

### 2. SupportWorker
- **Tenants:** Can only view and edit tenants assigned to them.
- **Ledger:** Hidden/Read-only.
- **Audit/Risk:** Can only view risk flags for assigned tenants.
- **Settings:** No access.

### 3. Tenant
- **Tenants:** Can only read their own record.
- **Forms:** Can only sign completed forms and review provided documentation.
- **System:** No access to sidebars, dashboards, or tenant lists.
