# System-Wide Workflow Audit (Phase 1)

This document maps out every critical user interaction (workflow, button, form save, print action) across the HMO Management Application. It serves as the master checklist for our stabilization effort.

## 1. Authentication & Session Workflows
- [ ] **Login:** User can log in with valid credentials.
- [ ] **Sign Out:** "Sign out" button destroys session immediately and redirects to `/login`.
- [ ] **Session Persistence:** Reloading the app keeps the user logged in.
- [ ] **Role Verification:** Managers vs. Support Workers have correct access limits.

## 2. Dashboard Navigation & Layout
- [ ] **Sidebar Links:** All links navigate to the correct views (`Dashboard`, `Tenants`, `Sessions`, `Ledger`, `Risk`, `Audit`, `Print`, `Settings`).
- [ ] **Mobile Sidebar Toggle:** Hamburger menu opens/closes sidebar correctly.
- [ ] **Global Search:** Finds tenants by name or room number.
- [ ] **Tenant List Panel (Left Sidebar):** Shows correct counts (Active, Total, Owed).
- [ ] **Tenant Selection:** Clicking a tenant loads their context reliably across views.
- [ ] **New Intake Button (`+`):** Navigates to `/intake/new`.
- [ ] **Notifications Bell:** Shows unpaid service charges properly; clicking "View full ledger" works.
- [ ] **Brand Switcher:** Toggling between brands changes context.

## 3. Form Workflows & Data Integrity (The 8 Forms)
Each of the 8 forms must guarantee:
1. **Load:** Populates with existing database data when a tenant is selected.
2. **Edit:** Changes map to local state smoothly.
3. **Save (Action):** "Save Changes" button works.
4. **Save (Feedback):** Clear visual indication of "Saving...", "Saved", or "Error". 
5. **Persistence:** Navigating away and back retains the newly saved data.

Forms to audit:
- [ ] Form 01: Intake Checklist
- [ ] Form 02: Support Checklist
- [ ] Form 03: Personal Details
- [ ] Form 04: Missing Person Risk
- [ ] Form 05: Confidentiality Waiver
- [ ] Form 06: Service Charge Agreement
- [ ] Form 07: Risk Assessment
- [ ] Form 08: Support Plan

## 4. Print Engine
- [ ] **Print Single Form:** Printing while viewing a form prints ONLY that active form.
- [ ] **Print All Forms:** "Print All Forms" button aggregates all 8 forms for the selected tenant and prints them correctly formatted.

## 5. Other Views
- [ ] **Admin Record Management (Manager Only):** Three-dot menu allows deleting a tenant; visually updates the list immediately.
- [ ] **Ledger View:** Displays correct amounts; actions (if any) work.
- [ ] **Risk View:** Displays missing/risk tenants correctly.
- [ ] **Audit View:** Displays blockchain audit logs correctly.
- [ ] **Sessions View:** Displays session history correctly.

## 6. Edge Cases & Resilience
- [ ] **Network Failure during Save:** Form does not silently fail; shows error.
- [ ] **Empty States:** When no tenants exist, prompt to start intake.
- [ ] **Loading States:** No visual flashes of undefined data.

---
*Status: WIP - Proceeding to Phase 2 (Button/Action Verification) and Phase 3 (Form Save Reliability).*
