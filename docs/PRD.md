
MATTY'S PLACE
Ash Shahada Housing Association Ltd  ·  Reliance Housing  ·  Matty's Place



UPDATED: USER JOURNEY + INTAKE PIPELINE + BLOCKCHAIN + AI BRAIN
Master Working Document
Single Source of Truth — All Systems, Decisions & Sprint Records

Version
Prepared By
Programme Week
v2.0 — LIVE DOCUMENT
Rume Dominic UririeMCKI Solutions Ltd
Week 2 of 8May 2026


OFFICIAL USE ONLY — CONFIDENTIAL — NOT FOR DISTRIBUTION

1. Document Control
Status
LIVE — Updated Week 2, May 2026


New in v2.0
User Journey diagram (10 May 2026) · Blockchain stamp architecture · AI Brain specification · Three input modes · Forms 1–8 intake pipeline · Admin print output spec


Programme
MCKI Solutions 8-Week AI Training Programme — Birmingham


Update Cycle
End of every sprint week — all team members responsible for flagging changes


2. Project Charter
2.1 The Problem
General Matlub manages approximately 100 tenants across three Birmingham HMO brands. Every tenant admission, session, payment, safeguarding event, and council submission currently runs through 53 pages of physical forms. The Matty's Place system eliminates this entirely.

2.2 The Vision (Matlub's Own Words)


You just do one time but it's showing in 10, 15 different pages automatically in the background.




The system's listening and it's typing automatically. Verbal question, system types. Khallas. You walk away.




He paid 150 pound, he owes 350 pound. Print it out.




The council asks: can you send us one month support plan for Mr David? You click monthly, print off, send it.




Who entered the data, what time data was entered. Sign — Blockchain Stamp.




AI BRAIN → What 3 questions from last week & what questions this week. Agent Brain to do anything.




Admin can print out data that has been entered either daily, weekly, or monthly.


2.3 Success Criteria
All 53 physical form pages replaced with digital equivalents
New tenant fully onboarded in under 10 minutes
Support session recorded in under 2 minutes (with voice mode)
Monthly support plan exported for council in one click
Zero duplicate data entry — name entered once, appears everywhere
Every record immutably blockchain-stamped — legally defensible
AI Brain generates session questions before every interaction
System operates on a tablet, offline if required

3. User Journey — Master Reference
The User Journey diagram produced by General Matlub on 10 May 2026 defines the complete product flow. This section is the canonical reference.

3.1 Full Journey Map
Step
Node
Detail
System Response
1
Entry Point
Support Worker or Owner fills premade Google Forms
Digital form fields populate in real time
1b
Alternative A
Upload physical form → OCR Extract
OCR reads handwriting, auto-populates all fields
1c
Alternative B
Voice-to-Text Input
System transcribes speech into form fields in real time
2
Data Entry
Data enters the system
Blockchain stamp: WHO entered, WHAT TIME, WHICH fields
3
Verification
Tenant verifies & signs data is accurate
Second blockchain stamp: tenant identity + signature hash
4
AI Brain
AI reads all data, generates 3 questions from last week + questions for this week
AI Brain available for any further agent task
5
Output
Admin prints daily / weekly / monthly output
Print-ready PDF in council format or internal format


4. Intake Workflow — Forms 1–8
General Matlub has uploaded Forms 1–8 to date. The five-step intake pipeline applies to these forms and will extend to Forms 9–53 in Weeks 3–4.

4.1 The Five Steps
Step
Action
Detail
Who
1
Type or Upload
Type into pre-structured digital form (Forms 1–8 fields pre-mapped) OR upload photo of physical Ash Shahada form
Manager or Support Worker
2
OCR Extraction
System reads uploaded form. Extracts all handwritten/printed text. Auto-populates digital fields. Staff corrects any OCR errors.
System + Staff review
3
Staff Review & Confirm
Staff reviews all extracted/typed fields. Makes any corrections. Confirms. Staff name + role + timestamp logged.
Manager or Support Worker
4
Tenant Verification
Tenant reviews own record. Confirms accuracy. Applies digital signature. EVENT IS BLOCKCHAIN-STAMPED.
Tenant (assisted by Staff)
5
Save with Audit Stamp
Complete record saved to database. Audit stamp: staff name, role, timestamp, tenant signature, blockchain hash, input method.
System — auto


4.2 Forms 1–8 Status
Form
Name
Fields Mapped to Digital
Status
1
Intake Checklist
7 checklist items — all mapped and interactive
Complete
2
Support Checklist
On Arrival / Within 3 Days / After 3 Days workflow
Complete
3
Personal Details
18 fields including NINO, DOB, benefits, next of kin, doctor, probation
Complete
4
Missing Person Form
Physical descriptors, employer, vehicle, next of kin, authority signature
Complete
5
Confidentiality Waiver
Full auth text, resident rights, dual signature block (resident + Ahsan Rehman)
Complete
6
Service Charge Agreement
Weekly rate, payment method, start date, tenant acknowledgement
In Progress
7
Risk Assessment
Risk categories, severity, mitigation, worker sign-off
In Progress
8
Initial Support Plan
Goals, needs, actions, assigned worker, review date, council format
In Progress


5. Architecture Decisions Log
ADR
Decision
Rationale
Status
001
localStorage for v3 prototype
Zero infrastructure, instant demo, offline by default
Accepted — v3
002
Supabase for production database
Real-time sync, row-level security, PostgreSQL, built-in Auth
Planned — Week 4
003
React / Next.js frontend
Faith's existing skills, SSR for PDF generation, component reuse
Planned — Week 4
004
Google Cloud Run deployment
Serverless, scales to zero cost, familiar from Eagles Den project
Planned — Week 8
005
SHA-256 hash as Phase 1 blockchain stamp
Immutable audit trail without on-chain cost — MVP viable
Planned — Week 4
006
Polygon ERC-721 for Phase 2 blockchain
Matlub's blockchain expertise, soulbound token pattern, verifiable externally
Planned — Post-MVP
007
Web Speech API + Whisper for voice
Browser-native for speed, Whisper for accuracy on difficult audio
Planned — Week 7
008
Google Vision API / Tesseract for OCR
Handles handwritten text — essential for Ash Shahada physical forms
Planned — Week 3
009
Premade Google Forms as entry option
Familiar to staff, mobile-friendly, submissions pipe into backend
Planned — Week 4
010
Audit trail is immutable — policy decision
Legal and safeguarding requirement — no exceptions, no deletions
Core policy


6. Data Model — Full Entity Reference
6.1 Tenant Record
Field
Type
Notes
id
UUID
System-generated — primary key
title
Enum
Mr / Mrs / Ms / Miss / Dr
full_name
String
Auto-populates ALL forms — entered once only
dob
Date
Date of Birth
nino
String
National Insurance Number
nationality
String


address
String
Full postal address
room_number
String
Room within property
moved_in
Date
Date resident moved in
mobile
String


email
String


languages
String
Spoken and written
date_entry_uk
Date
Date of Entry to UK
benefit_type
Enum
Universal Credit / Housing Benefit / PIP / ESA / JSA / Other
benefit_frequency
Enum
Monthly / Fortnightly / Weekly
benefit_amount
Decimal
Amount in GBP
nok_name
String
Next of Kin name
nok_relationship
String


nok_phone
String


nok_address
String


doctor
String
GP name and surgery
probation_officer
String
If applicable
photo_url
String
Storage reference — tablet camera
brand
Enum
mattys_place / ash_shahada / reliance
entry_method
Enum
manual / ocr / voice — how data was first entered
blockchain_hash
String
SHA-256 hash of record at time of creation
tenant_signature_hash
String
Hash of tenant verification event
created_by_user_id
UUID
FK → users table
created_at
Timestamp
Auto — immutable
last_updated_by
UUID
FK → users table
last_updated_at
Timestamp
Auto


7. Full Requirements Register (v2)
REQ
Pri
Requirement
Source
Wk
Status
001
P0
One-time data entry — auto-populate all 53 pages
Matlub verbatim
1–2
Done ✓
002
P0
Multi-brand letterhead switching
Product req
2
Done ✓
003
P0
Daily / Weekly / Monthly session types
Council req
2
Done ✓
004
P0
Service charge ledger — paid/unpaid, balance, print
Matlub verbatim
2
Done ✓
005
P0
Five-step intake pipeline (Forms 1–8 active)
Intake workflow
2–3
In Progress
006
P0
SHA-256 blockchain stamp — data entry event
User Journey sketch
4
Planned
007
P0
Blockchain stamp — tenant verification/signature event
User Journey sketch
4
Planned
008
P0
Google Forms pre-made entry option
User Journey sketch
4
Planned
009
P0
OCR extract from uploaded physical form
User Journey sketch
3
Planned
010
P0
Eviction notice generator — one click, auto-populated
Matlub verbatim
6
Planned
011
P0
Monthly support plan export (council format)
Matlub verbatim
6
Planned
012
P1
AI Brain — 3 questions from last week's session
User Journey sketch
5
Planned
013
P1
AI Brain — suggested questions for this week
User Journey sketch
5
Planned
014
P1
AI Brain — open agent tasking (any request)
User Journey sketch
6
Planned
015
P1
Admin print output — daily
User Journey sketch
6
Planned
016
P1
Admin print output — weekly
User Journey sketch
6
Planned
017
P1
Admin print output — monthly (council)
User Journey sketch
6
Planned
018
P1
Voice-to-text session recording
Matlub verbatim
7
Planned
019
P1
Forms 9–53 digitisation
Form pack
3–4
Planned
020
P1
AI session auto-summary after voice recording
MCKI initiative
7
Planned
021
P1
AI risk flagging across session history
MCKI initiative
7
Planned
022
P2
Polygon ERC-721 on-chain stamp (Phase 2)
Matlub's blockchain expertise
Post-MVP
Future
023
P2
Photo capture — tablet camera
Product req
4
Planned
024
P2
Offline mode — service worker
Ops req
7
Planned


8. HMO Regulatory Compliance Map
Regulation
Matty's Place Feature
Status
All tenant interactions must be recorded
Session logging with blockchain stamp — immutable
Done ✓
HMO licence compliance — Birmingham City Council
Monthly Support Plan Export (council format)
Week 6
Safeguarding duty of care
Audit trail, AI risk flagging, session note policy
Partial — Week 7
Data protection — tenant confidentiality
Confidentiality Waiver with digital signature + blockchain
Done ✓
Financial records — service charges
Service Charge Ledger — weekly, paid/unpaid, printable
Done ✓
Missing person protocol
Missing Person Form (Form 4) — full descriptor fields
Done ✓
Right-to-rent documentation
NINO, DOB, nationality, date of UK entry — Personal Details Form
Done ✓
Eviction process compliance
Eviction Notice Generator — pre-populated, print-ready
Week 6
Data accuracy verification
Tenant verification portal + blockchain signature stamp
Week 4


9. Weekly Sprint Log
Week 1 — Discovery (Complete)
Full audit of 53-page physical form pack
Requirements session with General Matlub — verbatim transcript
Wireframe sketches on sketch.io/sketchpad
v1 HTML prototype — basic structure

Week 2 — Core Build (Current)
v2 prototype: intake pipeline, three roles, audit trail
v3 prototype: ledger, sessions, forms panel, letterhead switching
User Journey diagram produced by General Matlub — 10 May 2026
Blockchain stamp architecture confirmed as core requirement
AI Brain specification confirmed — 3 questions from last week + open agent tasking
Forms 1–8 uploaded — intake pipeline mapped to all 8 forms
All three product documents updated to v2.0 (this document)

Weeks 3–8 — Planned
Week 3: OCR integration (Google Vision), Forms 9–53 begin, all five intake steps live
Week 4: React/Next.js rebuild, Supabase DB, blockchain hash, Google Forms integration
Week 5: AI Brain (session questions, follow-up, risk flagging)
Week 6: PDF exports, eviction notice, council report, open agent tasking, print output
Week 7: Voice-to-text (Whisper), offline mode, AI auto-summary
Week 8: Google Cloud Run, Polygon blockchain Phase 2 scoping, staff training, handover

10. Open Items — v2
#
Open Item
Context
Owner
Week
01
Upload Forms 6–8 field details to confirm mapping
Forms 6–8 are in progress — need full field list
General Matlub
Week 2
02
Upload Forms 9–53 to extend intake pipeline
Only 1–8 uploaded so far
General Matlub
Week 3
03
Confirm Google Forms URL/template for staff entry
Premade Google Forms option needs form template created
Rume / Faith
Week 3
04
Supabase schema sign-off with Faith
Data model needs approval before Week 4 migration
Faith Okogbo
Week 3
05
Council export format specification
Confirm exact format Birmingham City Council requires
General Matlub
Week 5
06
Confirm service charge weekly rate per tenant
Is £150/week standard or variable?
General Matlub
Week 2
07
Eviction notice legal template review
Must be reviewed by solicitor before production use
General Matlub
Week 6
08
Polygon blockchain Phase 2 scoping
Matlub to confirm preferred wallet/chain approach
General Matlub
Week 8
09
Voice-to-text language requirements
Does system need non-English transcription support?
General Matlub
Week 6
10
Licensing model for other HMO operators
Define onboarding process for external licensees
Rume Dominic
Week 8


11. Commercial Framework
MVP Build (15 properties)
£8,000 – £12,000 one-time


Full System (100+ tenants)
£18,000 – £25,000 — AI, voice, offline, PDF, blockchain


Monthly Retainer
£200 – £400 per client


SaaS Licence
£300/month per Birmingham HMO operator


Year 1 Target (20 licences)
£72,000/year ARR


12. Version History
Version
Date
Changes
Author
v1.0
May 2026 Wk 2
Initial creation — all three documents produced from sketch and system prompt
Rume Dominic
v2.0
May 2026 Wk 2
User Journey diagram integrated · Blockchain stamp architecture · AI Brain spec · Three input modes · Forms 1–8 intake · Admin print spec · 24 requirements registered
Rume Dominic


13. Team & Contacts
AI Strategist
Rume Dominic Uririe — Senior Consultant, MCKI Solutions Ltd


Frontend Engineer
Faith Okogbo — Junior AI Engineer (React, Next.js, Python)


Client / Product Owner
General Matlub — Ash Shahada HA / Matty's Place / Reliance


Signatory
Ahsan Rehman — Ash Shahada Housing Association


Office
Revenhurst House, Ravenhurst Street, Digbeth, Birmingham B12 0HD


