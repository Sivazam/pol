# Polavaram Irrigation Project — R&R Portal: Complete Context Document

> **Last Updated:** 2025-06-27  
> **Version:** v1.2.0  
> **Status:** 🟡 FUNCTIONAL BUT NOT PRODUCTION-READY FOR GOVERNMENT DEPLOYMENT

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [API Routes](#5-api-routes)
6. [Frontend Components](#6-frontend-components)
7. [State Management](#7-state-management)
8. [Business Rules & Terminology](#8-business-rules--terminology)
9. [DEPLOYMENT READINESS AUDIT](#9-deployment-readiness-audit)
10. [Security Audit Findings](#10-security-audit-findings)
11. [Legal & Compliance Audit](#11-legal--compliance-audit)
12. [Data Privacy & PII Audit](#12-data-privacy--pii-audit)
13. [Government Standards Compliance](#13-government-standards-compliance)
14. [Critical Fixes Required Before Deployment](#14-critical-fixes-required-before-deployment)
15. [Recommended Improvements](#15-recommended-improvements)
16. [How to Run](#16-how-to-run)
17. [Key Files Reference](#17-key-files-reference)

---

## 1. Project Overview

**Name:** Polavaram Irrigation Project — Rehabilitation & Resettlement Portal  
**Purpose:** Government of Andhra Pradesh portal tracking the rehabilitation of 13,961 families across 3 mandals and 30 villages affected by the Polavaram Dam project on the Godavari River.

**Core Functionality:**
- Track displaced families and their R&R eligibility
- Manage SES (Socio-Economic Survey) status for each family
- Track First Scheme compensation packages
- Manage Plot Allotment pipeline (PENDING → ALLOTTED → POSSESSION_GIVEN)
- Provide analytics, reports, and comparison tools
- Interactive map visualization of the project area
- AI-powered chat assistant for data queries

**Data Scale:**
- 3 Mandals: VR Puram, Chintoor, Kunavaram
- 30 Villages across the 3 mandals
- 13,961 Families
- 36,293 Family Members
- ~9,773 First Scheme compensation records
- ~4,593 Plot Allotments

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | ^16.1.1 |
| Language | TypeScript | 5.x |
| Runtime | Bun | latest |
| Styling | Tailwind CSS 4 + shadcn/ui | New York style |
| Database | SQLite via Prisma ORM | ^6.11.1 |
| State Management | Zustand | ^4.5.x |
| Server State | TanStack React Query | ^5.x |
| Authentication | NextAuth.js v4 (INSTALLED but NOT WIRED) | ^4.24.11 |
| Charts | Recharts | ^2.x |
| Maps | MapLibre GL JS | ^4.x |
| Animations | Framer Motion + GSAP | latest |
| 3D Globe | globe.gl | ^2.x |
| AI | z-ai-web-dev-sdk (LLM chat) | latest |
| Icons | Lucide React | latest |
| PDF | HTML-to-print (no dedicated lib) | N/A |
| Password Hashing | bcryptjs | latest |
| Validation | Zod (installed, minimally used) | latest |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────┐
│                  Caddy (Port 81)                  │
│         Reverse Proxy + XTransformPort            │
└───────────────────┬──────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────┐
│              Next.js App (Port 3000)              │
│  ┌────────────────────────────────────────────┐  │
│  │            App Router (page.tsx)           │  │
│  │  - Single-page app with 13 views          │  │
│  │  - Dynamic imports for code splitting     │  │
│  │  - ErrorBoundary per view                 │  │
│  └────────────┬───────────────────────────────┘  │
│               │                                   │
│  ┌────────────▼──────────┐ ┌──────────────────┐  │
│  │   API Routes (18+)    │ │   Prisma ORM     │  │
│  │   /api/*              │ │   SQLite DB      │  │
│  │   No auth middleware  │ │   /db/custom.db  │  │
│  └───────────────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Key Architecture Decisions:**
- Single route (`/`) — all navigation via Zustand state
- No middleware.ts — no server-side auth checks
- SQLite for development — NOT suitable for production
- `output: "standalone"` configured for Docker deployment
- Caddy reverse proxy on port 81 with dynamic port forwarding

---

## 4. Database Schema

### Models (7 total):

**Mandal** — id, name, nameTelugu, code (unique), lat/lng, color  
**Village** — id, name, nameTelugu, code (unique), mandalId→Mandal, lat/lng, totalFamilies  
**Family** — id, pdfId (unique), hhsid, beneficiaryName, fathersName, husbandName, gender, villageId→Village, sesNo, caste, subCaste, houseType, doorNo, annualIncome, farmerCategory, bplApl, rationCardNo, occupation, rrEligibility, aliveOrDied, maritalStatus, bank details, aadharNo, voterIdNo, periodOfResidence, photoUploaded, residencePhoto, housingProvision, landForLand, landSurveyNo, landExtent, offerDevelopedLand → members[], firstScheme?, plotAllotment?  
**FamilyMember** — id, familyId→Family, beneficiaryName, fathersName, husbandName, wifeBirthSurname, relation, gender, age, agePnLaAct, aliveOrDied, maritalStatus, caste, subCaste, schoolRecords, dobSscTc, occupation, aadharNo, voterIdNo, isPhysicallyHandicapped, isWidow, isDivorced, bank details  
**FirstScheme** — id, familyId→Family (unique), rrUnit, sesNo, ageAsOnDate, community, profession, extentOfLandAcCts, structureValue, residingPreceding3Years, schemeProposedHouseOneTime, extentLandToLandAcr, developedLandUrban20pct, choiceAnnuityEmploymentOneTime, subsistenceAllowance, scStAdditionalAllowance, transportCharges, cattleShedPettyShop, artisanSmallTraderGrant, oneTimeResettlementAllowance, totalCompensation, remarks  
**PlotAllotment** — id, familyId→Family (unique), plotNumber, colonyName, lat/lng, areaSqYards, allotmentStatus, allotmentDate  
**User** — id, email (unique), password (bcrypt hashed), name, role (default "VIEWER")

### Critical Terminology:
- **pdfId** — Unique family identifier (format: PDF + 6 digits). This is THE primary key for families in the UI/API, NOT the database `id`.
- **SES** — Socio-Economic Survey. `sesNo` is a sequential number per village. SES completion is 100% for ALL families.
- **R&R Eligibility** — Separate from SES. Values: "Eligible" or "Ineligible". ~70% eligible in seed data.
- **First Scheme** — Compensation package for R&R Eligible families only. Contains structure value, subsistence allowance, SC/ST additional allowance, transport charges, etc.
- **Plot Allotment** — Pipeline: PENDING → ALLOTTED → POSSESSION_GIVEN

---

## 5. API Routes

| Route | Method | Purpose | Auth Required? |
|-------|--------|---------|----------------|
| `/api` | GET | Health check | ❌ No |
| `/api/stats` | GET | Aggregate stats | ❌ No |
| `/api/mandals` | GET | All mandals with stats | ❌ No |
| `/api/villages` | GET | Villages by mandalId or all=true | ❌ No |
| `/api/village/[id]` | GET | Village detail with demographics | ❌ No |
| `/api/families` | GET | Paginated family search/filter/sort | ❌ No |
| `/api/families/search` | GET | Quick family search by PDF ID or name | ❌ No |
| `/api/family/[pdfId]` | GET | Full family detail with ALL fields (PII!) | ❌ No |
| `/api/family/[pdfId]/pdf` | GET | HTML report for print/PDF | ❌ No |
| `/api/member/[id]` | GET | Member detail with family context | ❌ No |
| `/api/reports` | GET | KPIs, charts data (some mock) | ❌ No |
| `/api/relocation/[familyId]` | GET | Family relocation + plot data | ❌ No |
| `/api/compare` | GET | Side-by-side mandal/village comparison | ❌ No |
| `/api/activity` | GET | Activity timeline (synthetic from DB) | ❌ No |
| `/api/map` | GET | GeoJSON FeatureCollection | ❌ No |
| `/api/chat` | POST | AI chat using z-ai-web-dev-sdk | ❌ No |
| `/api/search` | GET | Basic search | ❌ No |
| `/api/search/advanced` | GET | Advanced search with scoring | ❌ No |
| `/api/export` | GET | CSV/JSON export | ❌ No |
| `/api/import` | GET/POST | CSV template download / bulk upload | ❌ No |
| `/api/admin/families` | GET/POST/PUT/DELETE | Full CRUD for families | ❌ No |
| `/api/geojson/river` | GET | Godavari river GeoJSON | ❌ No |
| `/api/geojson/mandals` | GET | Mandal boundaries with stats | ❌ No |
| `/api/geojson/villages` | GET | Village points with stats | ❌ No |

**⚠️ NONE of the 24 API endpoints require authentication.**

---

## 6. Frontend Components

### 13 Views (loaded via dynamic imports in page.tsx):

| View | Component | Description |
|------|-----------|-------------|
| globe | GlobeLanding.tsx | 3D globe landing with GSAP animations |
| dashboard | DashboardView.tsx | Stats, maps, charts, progress tracking |
| mandal | MandalView.tsx | SVG maps, village pins, statistics |
| village | VillageView.tsx | Family listings, demographics, search/filter |
| family | FamilyView.tsx | Detail mode, timeline, member lists, export |
| member | MemberView.tsx | Personal info, family context |
| relocation | RelocationView.tsx | Pipeline, colony charts, plot map |
| reports | ReportsView.tsx | 6+ chart types, village comparison |
| compare | ComparisonView.tsx | Side-by-side comparison with radar chart |
| activity | ActivityView.tsx | Timeline with filtering |
| map | MapView.tsx | MapLibre GL interactive map |
| admin | AdminView.tsx | CRUD operations for families |
| login | LoginView.tsx | MOCK-ONLY login (hardcoded credentials) |

### Shared Components:
- **ViewLayout** — Master layout with tricolor bar, sticky nav, sidebar, breadcrumb, content, footer
- **SidebarNav** — 10 nav items, slim icon rail, mobile drawer
- **GlobalSearch** — Advanced search with Ctrl+K, type filters, text highlighting
- **NotificationCenter** — 10 mock notifications, mark read/clear
- **HelpCenter** — 4 tabs (Tour, Shortcuts, FAQ, Contact)
- **AIChatAssistant** — z-ai-web-dev-sdk chat with DB context
- **SettingsPanel** — Display/Data/Notifications/About sections
- **ThemeToggle** — Light/dark with smooth transition
- **ErrorBoundary** — Generic error catch with retry
- **GovFooter** — Government-branded footer
- **DataImportPanel** — CSV import interface
- **DataTableView** — Reusable table component
- **Breadcrumb** — Navigation breadcrumb
- **MobileMenuButton** — Mobile sidebar toggle
- **NotificationBanner** — Top banner notifications

---

## 7. State Management

**Zustand Store** (`src/lib/store.ts`):

- **view**: Current AppView (13 views)
- **selectedMandalId/selectedVillageId/selectedFamilyPdf/selectedMemberId**: Navigation state
- **isAuthenticated**: ⚠️ **Hardcoded `true`** — authentication is completely bypassed
- **bookmarkedFamilies**: localStorage-persisted family bookmarks
- **dashboardWidgets**: 8 toggleable widget sections, localStorage-persisted
- **Settings**: compactMode, animationsEnabled, defaultPageSize, defaultSortOrder, defaultStartupView, notificationSoundEnabled — all localStorage-persisted
- **Navigation**: view history stack with goBack()

---

## 8. Business Rules & Terminology

### Critical Business Concepts:

1. **SES (Socio-Economic Survey) is 100% COMPLETE** — Every family has a `sesNo`. SES is a survey step, not an eligibility determination. Do NOT confuse SES completion with R&R eligibility.

2. **R&R Eligibility is SEPARATE from SES** — After SES, families are determined as "Eligible" or "Ineligible" for R&R benefits. This is stored in `rrEligibility` field.

3. **First Scheme is for Eligible families ONLY** — Only families with `rrEligibility === "Eligible"` have First Scheme compensation records.

4. **Plot Allotment Pipeline**: PENDING → ALLOTTED → POSSESSION_GIVEN — Only some eligible families have been allotted plots.

5. **pdfId as Family Identifier** — The `pdfId` field (e.g., "PDF101715") is the primary family identifier used in URLs and UI. NOT the database `id` (which is a CUID).

6. **Caste Categories**: St (Scheduled Tribe), Sc (Scheduled Caste), Bc (Backward Class), Oc (Open Category) — with sub-castes. This is a tribal area so ST is dominant (~50%).

7. **Land Holdings**: Not all families own land. `extentOfLandAcCts` in FirstScheme can be null for landless families.

8. **Compensation Components** (First Scheme):
   - Structure Value
   - Choice of Annuity / Employment One Time
   - Subsistence Allowance (₹36,000)
   - SC/ST Additional Allowance (₹50,000 for ST/SC only)
   - Transport Charges (₹50,000)
   - Cattle Shed / Petty Shop
   - Artisan Small Trader Grant
   - One Time Resettlement Allowance (₹50,000)
   - **Total Compensation** = Sum of all above

---

## 9. DEPLOYMENT READINESS AUDIT

### Overall Verdict: 🟡 NOT READY for State Government Production Deployment

The application is **feature-rich and functionally complete** as a development/demo prototype, but has **critical security, compliance, and infrastructure gaps** that must be addressed before deployment on a State Government server.

### ✅ READY / WORKING (Strengths)

| # | Area | Status |
|---|------|--------|
| 1 | Standalone build configured | ✅ `output: "standalone"` in next.config.ts |
| 2 | Caddy reverse proxy | ✅ Port 81→3000 configured |
| 3 | Prisma ORM with seed | ✅ 13,961 families seeded successfully |
| 4 | 18+ API endpoints functional | ✅ All return 200 with correct data |
| 5 | 13 views fully functional | ✅ Globe, dashboard, mandal, village, family, member, relocation, reports, compare, activity, map, admin, login |
| 6 | Full dark mode support | ✅ All views, tooltips, charts |
| 7 | Responsive design | ✅ Mobile sidebar, touch-friendly |
| 8 | Government branding | ✅ Tricolor, Ashoka elements, navy/amber theme |
| 9 | Data export (CSV/JSON/PDF) | ✅ Working |
| 10 | AI chat with DB context | ✅ z-ai-web-dev-sdk LLM |
| 11 | Interactive map | ✅ MapLibre GL with mandals, villages, river, dam |
| 12 | Error boundaries | ✅ Per-view wrapping |
| 13 | Anonymized seed data | ✅ No real PII in seed file |
| 14 | Admin CRUD API | ✅ Create, Read, Update, Delete families |
| 15 | CSV import/export | ✅ Working with validation |
| 16 | Lint clean | ✅ 0 ESLint errors |
| 17 | Accessibility basics | ✅ ARIA roles on search, keyboard shortcuts |

---

## 10. Security Audit Findings

### 🔴 CRITICAL (Must Fix Before Deployment)

| # | Issue | Detail | Impact |
|---|-------|--------|--------|
| S1 | **No Authentication** | `isAuthenticated: true` hardcoded in Zustand store. LoginView is mock-only with hardcoded credentials (`admin@polavaram.ap.gov.in` / `admin123`). No NextAuth.js integration despite package being installed. | **Anyone can access the entire portal without login** |
| S2 | **No Authorization / RBAC** | User model has `role` field (ADMIN/VIEWER) but it's completely unused. No middleware checks any role. All API routes are publicly accessible. | **Anyone can DELETE families, import data, access admin panel** |
| S3 | **No API Route Protection** | Zero middleware.ts file. Zero server-side auth checks. All 24 API endpoints are completely open. | **Complete data exposure** |
| S4 | **Admin DELETE Without Auth** | `DELETE /api/admin/families` permanently deletes families and all related members, schemes, and plots with no auth check. | **Irreversible data destruction by anyone** |
| S5 | **Import Without Auth** | `POST /api/import` accepts CSV uploads and creates families in the database with no auth. | **Anyone can inject arbitrary data** |
| S6 | **No HTTPS** | Caddyfile has zero TLS configuration. All traffic is HTTP only. | **Data transmitted in cleartext** |
| S7 | **Hardcoded Credentials in Client** | LoginView.tsx line 21: `if (email === 'admin@polavaram.ap.gov.in' && password === 'admin123')` — credentials visible in client-side JavaScript. | **Credentials exposed to anyone viewing source** |
| S8 | **Skip Login Button** | LoginView.tsx line 106: "Skip login — Enter as viewer" bypasses all auth entirely. | **Auth is completely optional** |

### 🟠 HIGH (Should Fix Before Deployment)

| # | Issue | Detail | Impact |
|---|-------|--------|--------|
| S9 | **PII in API Responses** | `/api/family/[pdfId]` returns ALL family fields including aadharNo, bankAccountNo, bankIfsc, bankBranch, bankName, voterIdNo, rationCardNo, annualIncome. No field-level access control. | **Privacy violation — sensitive data exposed** |
| S10 | **SQLite in Production** | SQLite doesn't handle concurrent writes, has no built-in replication, and locks the entire database during writes. Government deployment with multiple users will experience data corruption or locking issues. | **Data integrity risk under concurrent access** |
| S11 | **No CSRF Protection** | No CSRF tokens on any POST/PUT/DELETE endpoints. | **Cross-site request forgery attacks possible** |
| S12 | **No Rate Limiting** | Chat API, import API, and all other endpoints have no rate limiting. | **Denial of service / abuse** |
| S13 | **No Input Sanitization on Chat** | User messages sent to LLM have no sanitization. System prompt is visible in client network tab. | **Prompt injection attacks possible** |
| S14 | **No CORS Configuration** | No explicit CORS headers — relies on same-origin via Caddy proxy. | **Cross-origin data access possible** |

### 🟡 MEDIUM (Should Fix Soon After Deployment)

| # | Issue | Detail |
|---|-------|--------|
| S15 | `ignoreBuildErrors: true` in next.config.ts — TypeScript errors suppressed during build |
| S16 | `noImplicitAny: false` in tsconfig — reduced type safety |
| S17 | No audit logging for admin CRUD operations |
| S18 | In-memory chat history (lost on restart, memory leak potential) |
| S19 | `reactStrictMode: false` — reduced React safety checks |
| S20 | No Content-Security-Policy headers |
| S21 | No X-Frame-Options headers (clickjacking possible) |
| S22 | No X-Content-Type-Options headers |

---

## 11. Legal & Compliance Audit

### 🇮🇳 Indian IT Act & Government Compliance

| # | Requirement | Status | Detail |
|---|-------------|--------|--------|
| L1 | **IT Act 2000, Section 43A** — Reasonable security practices for sensitive personal data | ❌ FAIL | Aadhar numbers, bank account numbers, and other PII stored and transmitted without encryption, access control, or data masking |
| L2 | **Aadhaar Act 2016** — Aadhar data protection | ❌ FAIL | Aadhar numbers stored in plaintext in database and returned in API responses without masking. No access logging for Aadhar data views. |
| L3 | **Digital Personal Data Protection Act 2023** (DPDP) | ❌ FAIL | No consent management, no data minimization, no purpose limitation, no data retention policy, no data subject access rights, no breach notification mechanism |
| L4 | **Government IT Security Policy** — HTTPS mandatory for all government web applications | ❌ FAIL | No HTTPS configured |
| L5 | **Authentication & Access Control** — Mandatory for government portals | ❌ FAIL | No real authentication, no RBAC |
| L6 | **Audit Trail** — Mandatory for government data systems | ❌ FAIL | No audit logging for data modifications |
| L7 | **Data Backup** — Mandatory for government data | ❌ FAIL | No backup strategy |
| L8 | **MeitY Guidelines** — Mandatory compliance | ❌ FAIL | No security audit certificate, no vulnerability assessment |

### ⚖️ R&R Specific Legal Framework

| # | Requirement | Status | Detail |
|---|-------------|--------|--------|
| R1 | **RFCTLARR Act 2013** — Right to Fair Compensation and Transparent Land Acquisition | ⚠️ PARTIAL | First Scheme compensation components are tracked, but no audit trail for changes, no transparency on how eligibility was determined |
| R2 | **AP R&R Policy** — State-specific rehabilitation policy | ⚠️ PARTIAL | Data structure supports the policy but there's no way to verify data integrity or track when eligibility decisions were made |
| R3 | **Grievance Redressal** — Required under R&R frameworks | ❌ FAIL | No grievance submission system, no complaint tracking |
| R4 | **Public Disclosure** — R&R data should be accessible to affected families | ⚠️ PARTIAL | Data is viewable but there's no citizen-facing portal or self-service lookup |

---

## 12. Data Privacy & PII Audit

### Personally Identifiable Information in Database:

| Field | Model | Sensitivity | Currently Exposed via API? |
|-------|-------|-------------|---------------------------|
| aadharNo | Family, FamilyMember | 🔴 CRITICAL | ✅ YES — returned in full |
| bankAccountNo | Family, FamilyMember | 🔴 CRITICAL | ✅ YES — returned in full |
| bankIfsc | Family, FamilyMember | 🟠 HIGH | ✅ YES — returned in full |
| bankName | Family, FamilyMember | 🟡 MEDIUM | ✅ YES — returned in full |
| bankBranch | Family, FamilyMember | 🟡 MEDIUM | ✅ YES — returned in full |
| voterIdNo | Family, FamilyMember | 🟠 HIGH | ✅ YES — returned in full |
| rationCardNo | Family | 🟠 HIGH | ✅ YES — returned in full |
| annualIncome | Family | 🟠 HIGH | ✅ YES — returned in full |
| beneficiaryName | Family, FamilyMember | 🟡 MEDIUM | ✅ YES — returned in full |
| fathersName | Family, FamilyMember | 🟡 MEDIUM | ✅ YES — returned in full |
| husbandName | Family, FamilyMember | 🟡 MEDIUM | ✅ YES — returned in full |
| doorNo | Family | 🟠 HIGH | ✅ YES — returned in full |
| dobSscTc | FamilyMember | 🟠 HIGH | ✅ YES — returned in full |

### Required Privacy Measures:

1. **Aadhar Masking**: Show only last 4 digits (XXXX-XXXX-1234) for non-admin users
2. **Bank Account Masking**: Show only last 4 digits for non-admin users
3. **Field-Level Access Control**: Admin-only fields should require role verification
4. **Access Logging**: Every view of PII should be logged with user ID and timestamp
5. **Data Minimization**: API responses should only include fields necessary for the current operation
6. **Consent Management**: Affected families should consent to data processing

### Seed Data Note:
The seed file (`prisma/seed.ts`) uses **anonymized** data with explicit disclaimers:
> "DO NOT use real PDF IDs, Aadhar, bank details, or ration card numbers"

The generated Aadhar numbers use a `maskedAadhar()` function that creates 12-digit random numbers (not real Aadhar format). This is good practice for development but the **database structure and API allow real PII to be stored and exposed without protection**.

---

## 13. Government Standards Compliance

### GIGW (Guidelines for Indian Government Websites) Compliance:

| # | Requirement | Status | Detail |
|---|-------------|--------|--------|
| G1 | Bilingual support (English + Hindi/Regional) | ⚠️ PARTIAL | Village names have Telugu variants (nameTelugu), but the entire UI is English-only. No Hindi/Telugu language toggle. |
| G2 | Accessibility (WCAG 2.0 AA) | ⚠️ PARTIAL | Basic ARIA roles on search, keyboard shortcuts exist. Missing: skip navigation links, proper heading hierarchy, form labels, screen reader testing |
| G3 | Sitemap | ❌ FAIL | No sitemap.xml |
| G4 | Search functionality | ✅ PASS | Global search with Ctrl+K |
| G5 | Consistent navigation | ✅ PASS | Sidebar nav across all views |
| G6 | Contact information | ✅ PASS | Help Center Contact tab |
| G7 | Disclaimer/Privacy Policy | ❌ FAIL | No privacy policy page, no terms of use, no disclaimer |
| G8 | Accessibility Statement | ❌ FAIL | No accessibility statement |
| G9 | Screen Reader Compatibility | ⚠️ PARTIAL | Basic ARIA but no full screen reader testing |
| G10 | National Portal Integration | ❌ FAIL | No integration with india.gov.in or ap.gov.in |

### Color Scheme Compliance:
- ✅ Uses government-appropriate navy (#1E3A5F) and amber (#D97706) colors
- ✅ Tricolor bar (saffron, white, green) at top of all views
- ✅ No indigo/blue colors (as per project styling rules)
- ✅ Dark mode support

---

## 14. Critical Fixes Required Before Deployment

### Phase 1 — BLOCKING (Must do before any deployment):

| # | Fix | Effort | Detail |
|---|-----|--------|--------|
| F1 | **Implement NextAuth.js Authentication** | 2-3 days | Wire up NextAuth.js with the existing User model. Use Credentials provider. Add login API route. Add session management. |
| F2 | **Create middleware.ts for Route Protection** | 1 day | Protect all `/api/admin/*`, `/api/import`, and DELETE endpoints. Require authentication for sensitive routes. |
| F3 | **Implement RBAC** | 1-2 days | Use the existing User.role field. ADMIN: full CRUD, import/export. VIEWER: read-only, no PII fields. |
| F4 | **Mask PII in API Responses** | 1 day | Add field-level access control. Mask Aadhar (last 4 digits only), bank account (last 4 digits), ration card, voter ID for non-admin users. |
| F5 | **Configure HTTPS** | 1 day | Add TLS to Caddyfile. Obtain SSL certificate from government CA or Let's Encrypt. |
| F6 | **Remove Hardcoded Credentials** | 0.5 day | Remove `admin123` from LoginView. Remove "Skip login" button. Server-side auth verification only. |
| F7 | **Add Security Headers** | 0.5 day | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security |

### Phase 2 — HIGH PRIORITY (Should do before production):

| # | Fix | Effort | Detail |
|---|-----|--------|--------|
| F8 | **Migrate to PostgreSQL** | 1-2 days | Update prisma schema datasource, update connection string, test with pg data |
| F9 | **Add Audit Logging** | 1 day | Log all admin CRUD operations with user ID, timestamp, old/new values |
| F10 | **Add Rate Limiting** | 0.5 day | Rate limit chat API, import API, and all write endpoints |
| F11 | **Remove `ignoreBuildErrors: true`** | 1 day | Fix all TypeScript errors properly |
| F12 | **Add Privacy Policy & Terms** | 0.5 day | Create privacy policy page, terms of use, data handling disclaimer |
| F13 | **Add CSRF Protection** | 0.5 day | CSRF tokens on all mutation endpoints |
| F14 | **Database Backup Strategy** | 0.5 day | Automated daily backups, point-in-time recovery for PostgreSQL |

### Phase 3 — IMPORTANT (Should do soon after deployment):

| # | Fix | Effort | Detail |
|---|-----|--------|--------|
| F15 | Replace mock data in reports | 1-2 days | Wire monthly progress and notifications to real DB events |
| F16 | Add grievance redressal system | 2-3 days | Complaint submission, tracking, resolution workflow |
| F17 | Bilingual UI (Telugu toggle) | 3-5 days | Full Telugu language support with i18n |
| F18 | Accessibility audit & fixes | 2-3 days | Full WCAG 2.0 AA compliance, screen reader testing |
| F19 | Performance optimization | 1-2 days | Lazy load recharts, reduce bundle size, add loading skeletons for slow queries |
| F20 | Add sitemap.xml and robots.txt | 0.5 day | For government portal discoverability |

---

## 15. Recommended Improvements

### Already Implemented Well:
- ✅ Government branding with tricolor, Ashoka Chakra elements
- ✅ Anonymized seed data with explicit disclaimers
- ✅ Comprehensive data model matching R&R requirements
- ✅ Full dark mode support
- ✅ Interactive map with real geographic data
- ✅ AI chat with database context
- ✅ Export functionality (CSV, JSON, PDF)
- ✅ Responsive mobile design
- ✅ Error boundaries on all views
- ✅ Skeleton loading states
- ✅ Keyboard shortcuts and accessibility basics
- ✅ Settings panel with localStorage persistence

### Still Needed:
- 🔴 Real authentication with NextAuth.js
- 🔴 Role-based access control
- 🔴 PII masking/encryption
- 🔴 HTTPS/TLS
- 🔴 Audit logging
- 🟠 PostgreSQL migration
- 🟠 Privacy policy, terms of use
- 🟠 Grievance redressal system
- 🟡 Bilingual UI (Telugu)
- 🟡 Full WCAG 2.0 AA accessibility
- 🟡 Performance optimization
- 🟡 Content Security Policy
- 🟡 Automated testing

---

## 16. How to Run

```bash
# Start development server (port 3000)
bun run dev

# Push Prisma schema changes to database
bun run db:push

# Generate Prisma client
bun run db:generate

# Seed the database (destroys existing data!)
bun run db:seed

# Run lint
bun run lint

# Build for production (standalone output)
bun run build

# Start production server
bun run start
```

**External access:** Via Caddy on port 81 → localhost:3000  
**Database:** SQLite at `/home/z/my-project/db/custom.db`

---

## 17. Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main SPA entry — loads all 13 views via dynamic imports |
| `src/app/layout.tsx` | Root layout — fonts, ThemeProvider, QueryProvider, Toaster |
| `src/lib/store.ts` | Zustand store — all app state, navigation, settings, bookmarks |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/constants.ts` | App constants |
| `src/lib/utils.ts` | Utility functions (cn, formatters) |
| `src/components/shared/ViewLayout.tsx` | Master layout for all views |
| `src/components/shared/SidebarNav.tsx` | Navigation sidebar |
| `prisma/schema.prisma` | Database schema (7 models) |
| `prisma/seed.ts` | Database seeder (anonymized data) |
| `Caddyfile` | Reverse proxy configuration |
| `next.config.ts` | Next.js configuration (standalone output) |
| `globals.css` | ~1500 lines of CSS including custom utilities and dark mode |

---

## Summary

**The Polavaram R&R Portal is a feature-rich, visually polished application that serves as an excellent DEMONSTRATION PROTOTYPE.** However, it has **8 critical security vulnerabilities** and **8 legal compliance failures** that make it **unsuitable for deployment on a State Government server in its current state.**

The most urgent fixes are:
1. 🔴 Implement real authentication (NextAuth.js)
2. 🔴 Add role-based access control (RBAC)
3. 🔴 Mask PII fields (Aadhar, bank accounts)
4. 🔴 Enable HTTPS
5. 🔴 Remove hardcoded credentials and skip-login bypass
6. 🔴 Add audit logging for data modifications
7. 🔴 Add privacy policy and terms of use
8. 🔴 Migrate from SQLite to PostgreSQL

**Estimated time to make deployment-ready:** 2-3 weeks with a focused development effort.
