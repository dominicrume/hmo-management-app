
MATTY'S PLACE
Ash Shahada Housing Association Ltd  ·  Reliance Housing  ·  Matty's Place



UPDATED WITH USER JOURNEY & INTAKE WORKFLOW
Product Working Document
Matty's Place — HMO Tenant Management System

Version
Prepared By
Programme Week
v2.0
Rume Dominic UririeMCKI Solutions Ltd
Week 2 of 8May 2026


OFFICIAL USE ONLY — CONFIDENTIAL — NOT FOR DISTRIBUTION

1. Executive Summary
Matty's Place is a paperless, AI-augmented tenant management system built for General Matlub — a Birmingham-based HMO operator managing approximately 100 tenants across three housing brands over 9 years. The system digitises a 53-page physical form pack used by Ash Shahada Housing Association Limited, replacing manual paper workflows with a structured digital pipeline that includes OCR extraction, voice-to-text input, blockchain-stamped audit records, AI-driven session intelligence, and council-ready report exports.
This version (v2.0) incorporates the User Journey diagram produced by General Matlub on 10 May 2026, which maps the complete data flow from initial form entry through to admin print output, and the updated Intake Workflow covering Forms 1–8 (uploaded to date).

2. The User Journey — Matlub's Vision
The following is the exact user journey drawn by General Matlub on 10 May 2026. Every node in this diagram is a product requirement.

2.1 Journey Overview

STEP1
Support Worker or Owner enters data
Via premade Google Forms (structured input), OR upload of physical form (handwritten/printed)


STEP2
Two input modes available simultaneously
Mode A: OCR Extract — system reads uploaded physical form and auto-extracts all fieldsMode B: Voice-to-Text Input — verbal entry, system transcribes in real time


STEP3
Data enters the system
All fields populate the tenant record. System captures: WHO entered the data, WHAT TIME it was entered. A BLOCKCHAIN STAMP is applied — creating an immutable, tamper-proof record of data entry.


STEP4
Tenant verifies and signs
Tenant reviews their own record via the self-entry portal. They confirm accuracy and apply a digital signature. This verification is also blockchain-stamped.


STEP5
AI BRAIN activates
The AI Agent Brain reads all session and form data. It generates: (a) 3 follow-up questions from last week's session, (b) Suggested questions for this week's session. The Agent Brain can be tasked to do anything — summarise, flag, report, remind.


STEP6
Admin prints output
Manager can print all data that has been entered — filtered by Daily, Weekly, or Monthly. Output is council-ready and pre-formatted.


2.2 Matlub's Verbatim Requirements — User Journey



Fill premade Google Forms — OR — OCR Extract / Voice-to-text input




Data enters into the system. Who entered the data, what time data was entered. Sign — Blockchain Stamp.




Tenant verify & sign that the data is accurate. (Blockchain)




AI BRAIN → What 3 questions from last week & what questions this week. Agent Brain to do anything.




Admin can print out data that has been entered either daily, weekly, or monthly.


3. Intake Workflow — Forms 1–8
The intake workflow defines how every tenant enters the Matty's Place system. Forms 1–8 have been uploaded and are the active scope. Forms 9–53 will follow in Weeks 3–4.

3.1 The Five-Step Intake Pipeline

STEP1
Type in details OR upload physical form
Staff opens the tenant intake screen. They can manually type into the pre-structured digital form (fields already mapped from Forms 1–8), OR upload a photo/scan of the physical Ash Shahada form.


STEP2
OCR extracts all fields
If a physical form is uploaded, the OCR engine reads the handwritten or printed text and auto-populates every corresponding field in the digital form. Staff can correct any OCR errors before proceeding.


STEP3
Staff reviews and confirms
The support worker or manager reviews the extracted/typed data field by field. They confirm accuracy. Any corrections are made. The confirming staff member's name and timestamp are logged.


STEP4
Tenant verifies their own data
The tablet is handed to the tenant (or a portal link is sent). The tenant reads their own profile and confirms it is accurate. They apply a digital signature. This event is blockchain-stamped.


STEP5
Record saved to database with full audit stamp
The completed record is saved. The audit stamp records: staff member name, role, timestamp, tenant verification signature, blockchain hash, and OCR/voice/manual entry method used.


3.2 Forms 1–8 — Field Inventory
Form
Name
Key Fields
Intake Step
1
Intake Checklist
7 items: Housing Benefit Claim, Personal Details, Missing Person, Initial Assessment, Service Charge, Confidentiality Form, Risk Assessment/Support Plan
Step 1 — tick on arrival
2
Support Checklist
On Arrival, Within 3 Days, After 3 Days workflow. All interactions must be recorded.
Step 1 — workflow trigger
3
Personal Details
Title, Full Name, DOB, NINO, Nationality, Address, Room No., Email, UK Entry Date, Move-in Date, Mobile, Languages, Benefits, Next of Kin, Doctor, Probation
Steps 1–4 — primary record
4
Missing Person Form
Physical descriptors, employer/college, vehicle, next of kin, benefits, marital status, place of birth, authority signature
Step 1–3 — on admission
5
Confidentiality Waiver
Full authorisation text, resident rights, declaration, resident + Ahsan Rehman signature
Step 4 — tenant signs
6
Service Charge Agreement
Weekly rate, payment method, start date, tenant acknowledgement
Step 3–4 — financial setup
7
Risk Assessment
Risk categories, severity, mitigation actions, support worker sign-off
Step 3 — staff completes
8
Initial Support Plan
Goals, needs, actions, assigned worker, review date, council format header
Steps 3–5 — saved to DB


4. Blockchain Stamp — Architecture
The blockchain stamp is a core product requirement stated explicitly by General Matlub. It creates an immutable, verifiable record of every data entry and tenant verification event.

4.1 What the Blockchain Stamp Records
Who entered the data (user ID, name, role)
Exact timestamp of data entry (to the second)
Which form/field was populated
Entry method: manual type / OCR extract / voice-to-text
Tenant verification signature and timestamp
Any post-entry edits (diff logged, not overwritten)

4.2 Implementation Approach
Phase 1 (MVP)
Cryptographic hash of each record saved to Supabase — SHA-256 immutable audit trail


Phase 2 (Full)
On-chain stamp via Polygon blockchain (ERC-721 pattern) — Matlub's blockchain expertise applied


Verification
Each record displays a hash. Anyone with the hash can verify the record was not altered.


Tenant Signature
Digital signature linked to tenant record — verified at intake and stored with hash


5. AI Brain — Specification
The AI Brain is the intelligent agent layer of Matty's Place. It reads all session and form data for a tenant and generates actionable intelligence for support workers and managers.

5.1 Core AI Functions
Function
Description
Week
3 Questions from Last Week
Reads previous session notes → generates 3 follow-up questions to ask this week. Ensures continuity of care.
Week 5
Questions for This Week
Based on support plan goals and risk assessment → suggests session agenda questions.
Week 5
Agent Brain — Open Tasking
Manager or worker can instruct the AI to do anything: summarise a month, flag a risk, draft a letter, prepare a council report.
Week 6
Session Auto-Summary
After a voice-to-text or typed session, AI produces a structured summary automatically.
Week 7
Risk Flag
AI reads session notes across time → flags patterns suggesting deterioration or safeguarding concern.
Week 7
Council Report Draft
Formats a month of sessions into a council-ready support plan narrative.
Week 6


6. Input Methods — Three Modes
6.1 Mode 1: Manual Form Entry
Staff types directly into pre-structured digital fields. All 53 form pages are mapped to digital equivalents. Fastest for staff who know the tenant well. One-time entry auto-populates across all forms.

6.2 Mode 2: OCR Extract from Physical Form
Staff uploads a photo or scan of the physical Ash Shahada paper form. The OCR engine (Google Vision API or Tesseract) reads handwritten and printed text and auto-populates every corresponding digital field. Staff reviews the extraction for accuracy before confirming.

6.3 Mode 3: Voice-to-Text Input
Staff (or the tenant) speaks. The system listens and transcribes in real time. Ideal for session recording on the floor — no keyboard needed. Uses Web Speech API (browser-native) with OpenAI Whisper as a high-accuracy fallback. Week 7/8 delivery.


The system's listening and it's typing automatically. Verbal question, system types. Khallas. You walk away. — General Matlub


7. Admin Print Output
Matlub's final requirement in the user journey: the admin can print any data entered, filtered by time period.

Filter
What is Printed
Use Case
Daily
All sessions, entries, payments, and events logged today
End-of-day manager review, safeguarding incident log
Weekly
Compiled weekly summary per tenant — sessions + service charge + checklist progress
Key worker review, line manager oversight
Monthly
Full monthly support plan per tenant — council-ready format, all sessions, outcomes, goals
Birmingham City Council submission, internal audit
Custom
Manager selects date range and tenant(s) — bespoke report
Tribunal preparation, legal proceedings, inspection


8. Full Requirements Register
REQ
Pri
Requirement
Source
Week
Status
001
P0
One-time data entry — auto-populate all 53 pages
Matlub verbatim
1–2
Done
002
P0
Multi-brand letterhead switching (3 brands)
Product req
2
Done
003
P0
Daily / Weekly / Monthly session types
Council req
2
Done
004
P0
Service charge ledger — paid/unpaid, print
Matlub verbatim
2
Done
005
P0
Five-step intake pipeline (Forms 1–8)
Intake workflow
2–3
In Progress
006
P0
Blockchain stamp on every data entry
Matlub sketch
4
Planned
007
P0
Tenant verify & sign (blockchain-linked)
Matlub sketch
4
Planned
008
P0
Eviction notice generator
Product req
6
Planned
009
P0
Monthly support plan export (council format)
Matlub verbatim
6
Planned
010
P1
OCR extract from physical form upload
User Journey
3
Planned
011
P1
Voice-to-text session recording
Matlub verbatim
7
Planned
012
P1
AI Brain — 3 questions from last week
Matlub sketch
5
Planned
013
P1
AI Brain — open agent tasking
Matlub sketch
6
Planned
014
P1
Admin print: daily / weekly / monthly
Matlub sketch
6
Planned
015
P1
AI risk flagging across session history
MCKI initiative
7
Planned
016
P2
Photo capture — tablet camera
Product req
4
Planned
017
P2
Offline mode — service worker
Ops req
7
Planned
018
P2
Forms 9–53 digitisation
Form pack
3–4
Planned


9. Commercial Model
MVP (15 properties)
£8,000 – £12,000 one-time build fee


Full System (100+ tenants)
£18,000 – £25,000 — includes AI, voice, offline, full PDF suite


Monthly Retainer
£200 – £400 per client — maintenance and updates


SaaS Licence
£300/month per Birmingham HMO operator — white-label


Target ARR (20 licences)
£72,000/year recurring revenue


10. Delivery Team
AI Strategist
Rume Dominic Uririe — MCKI Solutions Ltd, Birmingham


Frontend Engineer
Faith Okogbo — React, Next.js, Python — MCKI Solutions Ltd


Client / Owner
General Matlub — Ash Shahada HA / Matty's Place / Reliance


Office
Revenhurst House, Ravenhurst Street, Digbeth, Birmingham B12 0HD


