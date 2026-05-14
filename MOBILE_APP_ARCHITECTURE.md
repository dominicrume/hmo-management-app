# Matty's Place - Mobile App Architecture & Scaling Strategy

## Executive Summary
As an MIT/Silicon Valley/Apple-tier engineering team, we recognize that a mission-critical HMO platform requires more than just a simple web-wrapper to scale securely on iOS and Android. This document outlines our robust strategy for taking **Matty's Place** to the App Store and Google Play, ensuring high performance, blockchain integrity, and military-grade security.

## 1. System Debugging & Stress Testing
We have completed our final rigorous debugging passes on the codebase:
- **Type Safety Enforcement:** We resolved configuration mismatches with Hardhat and deployment modules, ensuring 100% strict TypeScript compilation (`tsc --noEmit`).
- **Static Analysis:** ESLint rules have been enforced, passing flawlessly across the entire Next.js architecture.
- **Dependency Sandboxing:** Verified the integrity of external libraries (React Phone Number Input, Ethers, Supabase) mitigating any node engine discrepancies.

## 2. Capacitor Integration (The Bridge)
We are leveraging **Capacitor** by Ionic to bridge the Next.js web application to native iOS and Android environments.
- **Why Capacitor over React Native?** Next.js handles complex server-side operations (like AI Brain processing and Supabase SSR). Capacitor allows us to wrap the highly optimized responsive web build inside a native shell, utilizing native device features (Camera for OCR, Biometrics for auth) via plugins, without rewriting the business logic.

## 3. Deployment Architecture

### Phase A: The Web-View Shell (Current Implementation)
Since the application relies heavily on Next.js Server Actions and API routes (e.g., `/api/forms/save`, `/api/ai/brain`), the mobile app will be configured in a "Hybrid Cloud" model.
- The core Web App is deployed on Vercel/AWS.
- The Capacitor mobile app is configured with a `server.url` pointing to the production domain, essentially acting as a secure, full-screen native browser.
- **Pros:** Immediate parity between Web and Mobile; zero dual-maintenance of code.

### Phase B: Full Native Export (Future Scaling)
To achieve offline-first capabilities (crucial for support workers in areas with poor cellular service):
1. **API Decoupling:** We will migrate all `/api` routes into standalone serverless functions (or direct Supabase RPC calls) executed directly from the client.
2. **Static Export:** We will change `output: 'standalone'` to `output: 'export'` in `next.config.mjs`.
3. **Local DB Sync:** Implement RxDB or WatermelonDB to store form data locally, syncing to Supabase via background tasks when a connection is restored.

## 4. App Store & Play Store Publishing Strategy
To successfully pass the stringent reviews of Apple and Google:

- **Apple App Store Review Guidelines:**
  - *Guideline 4.2 - Minimum Functionality:* We must ensure the mobile app feels native. We will integrate Capacitor plugins for native push notifications, biometric login (FaceID/TouchID), and native haptic feedback.
  - *Guideline 5.1 - Privacy:* Because the app handles highly sensitive tenant data (PII, Medical, Missing Persons), we must strictly define Privacy Nutrition Labels and implement App Tracking Transparency (ATT) if any analytics are used.
  - *Camera Usage:* The OCR Upload Field requires precise permissions text.

- **Google Play Store Guidelines:**
  - Requires strict scoping of permissions.
  - Need to implement Android-specific back-button navigation hooks within the Next.js router.

## 5. Next Steps
1. Finish the installation of `@capacitor/core`, `@capacitor/ios`, and `@capacitor/android`.
2. Initialize the Capacitor configuration (`npx cap init`).
3. Add native platforms (`npx cap add ios` and `npx cap add android`).
4. Set up iOS provisioning profiles via Xcode and Android Keystores via Android Studio.
5. Deploy the backend to production and link the native shell.

*Authored by the Senior Engineering & Product Team.*
