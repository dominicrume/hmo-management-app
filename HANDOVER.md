# Project Handover Document — Tenant Hub (v1.0.0)

**To:** General Matlub & Ash Shahada Housing Association Ltd  
**From:** Vorem Labs Engineering  
**Date:** May 2026  
**Subject:** Official Handover of the HMO Management System  

---

## 1. Executive Summary

We are pleased to officially hand over **Tenant Hub** (formerly Matty's Place). Over the last 8 weeks, this system has been rebuilt from the ground up to serve as a high-security, automated, and fully digital HMO management platform tailored specifically for the needs of Ash Shahada Housing Association and Reliance Housing.

This platform replaces all paper-based workflows with a highly secure, AI-assisted, and blockchain-audited digital environment.

## 2. Key Capabilities Delivered

### Digital Intake & Form Engine
- **8-Form Digital Pack:** Fully digitized versions of the 53-page paper pack, including Intake Checklists, Support Plans, Risk Assessments, and Missing Person forms.
- **OCR Automation:** Paper forms can be photographed and automatically transcribed.
- **Voice Dictation:** Support workers can dictate notes directly into the system, which automatically maps spoken words to the correct form fields.

### AI & Automation
- **AI Brain (GPT-4o):** Automatically reads support worker session notes and generates tailored follow-up questions to ensure tenants receive optimal care.
- **Automated Red List:** A shared, decentralized database tracking high-risk tenants using only Names and National Insurance numbers.
- **Automated Reconciliation:** The Service Charge Ledger automatically updates when webhooks confirm that Housing Benefit or Bank Transfers have cleared.

### Security & Auditing
- **Role-Based Access Control (RBAC):** Strict isolation between Managers, Support Workers, and Tenants.
- **Immutable Audit Trail:** Every save, edit, and deletion is logged and cryptographically stamped with a SHA-256 hash to prevent tampering.
- **RLS Policies:** Supabase Row Level Security guarantees data is fundamentally impenetrable at the database level.

### The Tenant Portal
- **Mobile First:** Tenants can log in on their phones to view their ledger, see their signed tenancy agreements, and submit maintenance requests, entirely isolated from the staff dashboard.

## 3. Production Deployment Details

- **Live URL:** [https://hmo-management-app.vercel.app](https://hmo-management-app.vercel.app)
- **Hosting Environment:** Vercel (Production)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Magic Links + Passwords)
- **AI Provider:** OpenAI

All environmental variables (`.env.vercel.prod`) have been securely synced to the Vercel production environment.

## 4. Maintenance & Next Steps

The system has been load-tested and all outstanding features are complete. 

As we conclude this sprint:
1. **GitHub Repository:** The `main` branch is the absolute source of truth. Any push to `main` will automatically build and deploy to Vercel within 60 seconds.
2. **Access Control:** You (Manager) possess the master account. You can begin inviting your Support Workers and onboarding Tenants via the `/manager/users` portal.

Thank you for trusting Vorem Labs. We look forward to seeing the positive impact this software brings to your tenants and your team.
