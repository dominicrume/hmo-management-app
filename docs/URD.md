
MATTY'S PLACE
Ash Shahada Housing Association Ltd  ·  Reliance Housing  ·  Matty's Place



UPDATED WITH USER JOURNEY ROLES
User Role Document
Access Rights, Workflows & Responsibilities — All Three Roles

Version
Prepared By
Programme Week
v2.0
Rume Dominic UririeMCKI Solutions Ltd
Week 2 of 8May 2026


OFFICIAL USE ONLY — CONFIDENTIAL — NOT FOR DISTRIBUTION

1. Purpose
This document defines the three user roles within the Matty's Place system — Manager, Support Worker, and Tenant — including their access rights, responsibilities, workflows, and interaction with the User Journey pipeline. All roles are updated to reflect the blockchain-stamped audit trail, OCR/voice input modes, and AI Brain features confirmed in the User Journey diagram of 10 May 2026.

2. Role Architecture Overview
Role
Primary Users
Entry Mode
Blockchain Stamp
AI Brain Access
Manager
General Matlub, Ahsan Rehman
Manual, OCR, Voice
Full — all records
Full — all functions
Support Worker
Key workers, housing officers
Manual, OCR, Voice
Own entries only
Assigned tenants — session AI only
Tenant
Resident (self-entry portal)
Verify & sign only
Signature stamp only
None


3. Role 1 — Manager
3.1 Identity
General Matlub (Primary Operator)
Ahsan Rehman (Signatory — Ash Shahada Housing Association)
Any appointed deputy manager

3.2 Manager in the User Journey
The Manager sits at the top of the user journey. They can initiate any step, override any entry, and access the complete output layer (print daily/weekly/monthly).

Journey Step
Manager Action
Step 1
Opens new tenant intake. Chooses entry mode: manual type, OCR upload, or voice. Can pre-load Google Form data.
Step 2
Reviews OCR extraction — confirms or corrects field readings from scanned Ash Shahada forms.
Step 3 (Blockchain)
Entry is automatically blockchain-stamped with Manager's name, role, and exact timestamp. Manager can view the hash.
Step 4
Hands tablet to tenant for verification, OR sends portal link. Reviews tenant signature confirmation.
Step 5 (AI Brain)
Activates AI Brain for any tenant: generate session questions, produce council report, flag risks, summarise month.
Step 6 (Print)
Prints daily, weekly, or monthly outputs. Selects tenant(s), date range, and format. Output is council-ready.


3.3 Exclusive Manager Permissions
Issue eviction notices
Delete or archive tenant records
Switch letterhead between Matty's Place, Ash Shahada, and Reliance
Export monthly council support plans
View blockchain audit trail for any user or tenant
Manage user accounts — add/remove support workers
Configure service charge rates and property settings
Access AI Brain for full open agent tasking
Print daily, weekly, and monthly reports across all tenants

3.4 Manager Workflow — Full Day
Login via secure Manager portal (Supabase Auth)
Dashboard: view flagged tenants, pending verifications, payments due, blockchain alerts
Open new tenant intake — choose OCR upload or manual entry
Review OCR extraction — approve or correct field readings
Confirm entry — blockchain stamp auto-applied
Tenant portal verification — review tenant signature confirmation
Open AI Brain — review 3 suggested questions for today's sessions
Process service charge payments — toggle Paid/Unpaid in ledger
Issue any eviction notices or print required reports
End of day — print daily summary if needed

4. Role 2 — Support Worker
4.1 Identity
Assigned key workers
Housing support officers
Visiting case managers and probation liaison staff

4.2 Support Worker in the User Journey
Journey Step
Support Worker Action
Step 1
Enters data on behalf of tenant. Uses manual entry OR uploads physical form for OCR extraction. Can use voice-to-text for session notes.
Step 2
Reviews OCR output — corrects any misread handwriting. Confirms all fields before saving.
Step 3 (Blockchain)
Entry blockchain-stamped automatically with support worker's name and timestamp. Immutable — cannot be deleted.
Step 4
Hands tablet to tenant. Tenant reads and verifies data. Support worker witnesses digital signature.
Step 5 (AI Brain)
Reviews AI-generated follow-up questions before starting the session. Uses suggestions as session agenda.
Step 6
Cannot initiate print output. Can view own session records. Exports handled by Manager.


4.3 Support Worker Restrictions
Cannot issue eviction notices
Cannot delete or archive any record
Cannot access tenants assigned to other workers
Cannot override financial data or service charge rates
Cannot switch letterhead or export council reports
Cannot view other workers' blockchain audit entries
Cannot initiate print reports — view only

4.4 Support Worker Workflow — Session Day
Login to Support Worker portal
Select assigned tenant from sidebar
AI Brain displays 3 follow-up questions from last session — review before going to room
Conduct session: type notes OR activate voice-to-text
Save session — blockchain stamp auto-applied
Tick off any completed intake checklist items
Hand tablet to tenant for any required signature or verification
Session submitted — Manager notified

4.5 Safeguarding Obligations
ALL interactions with any resident must be recorded. This is a legal and organisational obligation — not optional. The blockchain stamp provides proof of compliance.
If tenant appears distressed: note explicitly in session, flag to Manager immediately
If tenant is missing: complete Missing Person Form (Form 4) within the same day
If safeguarding concern identified: include verbatim description in session notes — AI Brain will flag pattern if it recurs

5. Role 3 — Tenant
5.1 Identity
The tenant is the resident of the HMO property. In the Matty's Place system, the tenant has a limited but critical role in the user journey — they are the final verifier of the accuracy of their own data. Their digital signature creates the blockchain verification event.

5.2 Tenant in the User Journey
Journey Step
Tenant Action
Step 1–2
Not involved. Staff fills in Google Form OR uploads physical form. OCR extracts data.
Step 3
Not involved in entry. Data has been blockchain-stamped by staff. Tenant's record is now in the system.
Step 4 — TENANT ACTIVE
Tenant receives tablet or portal link. Reads all fields of their own record. Confirms accuracy. Applies digital signature. This event is blockchain-stamped — creating an immutable verified record that the tenant confirmed their data.
Step 5–6
Not involved. AI Brain and print outputs are staff functions.


5.3 Tenant Access Rights
View own personal profile — read only
Confirm accuracy of data via portal verification
Apply digital signature to own record and Confidentiality Waiver
Access copies of their own signed documents

5.4 Tenant Restrictions
Cannot modify any field — corrections must be requested from and made by staff
Cannot view any other tenant's record
Cannot view session notes written by staff
Cannot view service charge ledger details
Cannot access the blockchain hash or audit trail

6. Full Access Control Matrix
Action / Feature
Manager
Support Worker
Tenant
Manual data entry (intake forms)
YES
YES
NO
OCR form upload
YES
YES
NO
Voice-to-text session recording
YES
YES
NO
View own blockchain audit stamp
YES (all)
YES (own only)
YES (signature only)
Tenant verification portal
Initiates
Assists
COMPLETES
Apply digital signature
YES
NO
YES
Record session notes
YES
YES
NO
Delete session notes
YES
NO
NO
AI Brain — session questions
YES
YES
NO
AI Brain — open agent tasking
YES
NO
NO
View service charge ledger
YES
YES (view)
NO
Edit service charge payments
YES
NO
NO
Issue eviction notice
YES
NO
NO
Complete Missing Person Form
YES
YES
NO
Export council support plan (monthly)
YES
NO
NO
Print daily/weekly/monthly output
YES
NO
NO
Switch letterhead brand
YES
NO
NO
View all tenants across all brands
YES
NO
NO
Manage user accounts
YES
NO
NO
Photo capture
YES
YES
NO


7. Blockchain Audit Policy
Every blockchain stamp in the system is immutable. No user — including the Manager — can alter or delete a stamped record. The stamp contains:
User full name and role
Exact timestamp (date, time, second)
Action type: CREATE / EDIT / VERIFY / SIGN / EXPORT / DELETE-REQUEST
Tenant record affected
Input method used (manual / OCR / voice)
SHA-256 hash of the record at time of stamp

This policy satisfies the safeguarding compliance requirement that all interactions with residents are recorded and defensible in legal proceedings.

8. User Onboarding
8.1 Adding a Support Worker
Manager: Settings > User Management > Add Support Worker
Enter name, email, and assigned tenants
System generates secure login and sends onboarding email
Support worker logs in, completes profile, receives training on OCR and voice input

8.2 Tenant Onboarding
Staff completes intake (Steps 1–3 of pipeline)
Staff activates tenant portal — one-time access code sent or tablet handed over
Tenant verifies and signs — portal access closes after signature
Blockchain stamp confirms verification event
Tenant receives PDF copy of their signed record
