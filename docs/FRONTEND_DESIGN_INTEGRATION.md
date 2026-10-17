# Frontend2 design integration

The runnable application remains `frontend/`. The customer interface adapts the
layout, colors, cards, calendar, booking steps and CSS supplied in `frontend2/`.
The source reference in `frontend2/` is retained unchanged. No backend schema,
business rule, seed data or payment provider configuration was changed.

## Run locally

Start `npm run dev` in `backend/` and in `frontend/`, using the existing configured
database. Open `http://127.0.0.1:5173/`. The existing Vite `/api` proxy remains in use.
For production, continue serving the frontend and `/api` on the same origin and
provide the SPA index fallback for frontend routes.

| Route | Behavior |
| --- | --- |
| `/` | Customer homepage and live service cards |
| `/services` | Searchable backend service catalog |
| `/about` | About layout with backend salon contact information |
| `/booking`, `/availability` | Four-step booking using live qualified staff and availability |
| `/manage` | Secure guest lookup, payments, receipts and appointment changes |
| `/booking-confirmed`, `/appointment` | Restore guest access and verify pending PayMongo checkout before displaying the actual booking state |
| `/help` | Existing salon guide, presented in the new public layout |
| `/staff`, `/login`, `/admin` | Existing authenticated Admin/Cashier workspace |
| `/staff/:page` | Workspace deep links; query parameters retain section, report kind, filters, and booking selection |
| `/payment`, `/confirmation/:reference` | Secure appointment lookup; a reference alone does not authorize access |

Booking permits ordered service occurrences and per-service staff assignment,
including Any Available. Calendar dates use the backend salon timezone; exact
starting instants come from `/api/availability`. Changing selections invalidates
previous availability, including in-flight searches. Booking uses the existing
contact form and `/api/appointments`, then displays the actual server reservation,
hold countdown and payment controls. Confirmation requires the backend payment
transition. Existing cancellation/rescheduling, recovery and receipt handling are
reused. Guest tokens stay in memory; saved private links carry tokens in fragments.

The demo's hardcoded prices, staff, add-on charges, illustrative slots, browser
appointment storage and simulated confirmation are not used. The backend catalog
is authoritative, including any separately configured blow-dry services. Notes
and arbitrary payment choices were omitted because the booking API does not
accept those fields.

The reference did not include its six photo assets. CSS salon artwork fills the
hero/about areas until real photographs are supplied. Styles are scoped to the
public customer shell to preserve staff screens and receipt printing. The implementation uses React and TypeScript in `frontend/`, with React Router
providing client-side navigation (added on 2026-10-17).

## Verification

- `cd frontend && npm run build` checks TypeScript and the production bundle.
- `cd backend && npm test` checks existing backend contracts.
- Browser checks: homepage catalog, service search and booking preselection;
  ordered selections, qualified staff, salon-local calendar and real availability;
  contact form, secure guest lookup and staff login; narrow and wide layouts.
- Actual external payment collection still requires the existing configured
  provider and its acceptance testing. The integration does not configure or
  certify a live payment account.

Verified locally on 2026-10-08: frontend TypeScript/production build passed and
all 54 backend unit/API tests passed. Browser checks confirmed the live catalog,
service search, qualified staff, salon-local calendar, actual available times,
assigned staff summary, contact form, secure guest lookup screen and staff login
screen. Narrow (390px) and wide (1366px) layouts were inspected; the mobile homepage
has no horizontal overflow and its navigation opens/closes correctly. No real
reservation or external payment was submitted during these browser checks.

## React Router verification — 2026-10-17

The frontend build and all 24 unit tests pass, including private-fragment parsing
regressions. Browser checks with mocked API responses verify navigation without
document reload, catalog search URL synchronization, booking preselection,
refresh and Back navigation, missing pages, authentication, admin deep links,
cashier role restrictions, short and legacy private-link fragment replacement,
and cashier cancel/discard behavior for internal navigation and browser Back.
No live appointments or payments were changed. The production build reports
non-fatal React Router `use client` directive and bundle-size warnings.

## Component Folder Pattern verification — 2026-10-17

Components, pages, layouts, and authentication context now use named folders
with local entry points. Shared contracts and non-UI helpers have separate
locations; unit test imports follow the moved helpers. See `frontend/README.md`.
The TypeScript/production build and all 24 frontend unit tests pass. Browser
checks with mocked APIs pass for public navigation, catalog search, booking
preselection, refresh/history, authentication, staff deep links, role access,
private-link replacement, and cashier navigation guards. The production CSS
is byte-for-byte identical to the build before this folder refactor. The
existing non-fatal bundler warnings remain; no business data was changed.

## Checkout return verification — 2026-10-17

The return screen shows “Checking your payment…” until session restoration and
any pending PayMongo verification finish, then displays the confirmed booking
directly. Missing sessions require OTP; network errors and delayed verification
provide retry/recovery controls. The production build and all 32 frontend unit
tests pass. Mocked browser checks cover both return URLs, absence of intermediate
lookup/reservation screens, delayed verification, failed checkout, expired
sessions, restoration and verification retries, and navigation away during an
in-flight check. No live payment was collected or changed during verification.

## Booking calendar availability — 2026-10-17

Select Date and Time now enables only dates with a complete available service
plan for the current selections. The calendar checks one month at a time via
`POST /api/availability/calendar`; loading and failed checks disable unverified
dates and errors offer retry. Month/professional changes discard stale data,
and a time search returning no slots disables that date and clears selection.
Backend type checking, all 105 backend tests, and all 32 frontend tests passed.
Mocked browser checks verified loading/past/unavailable dates, enabled-date time
search, month changes, stale responses, professional-specific dates, retry, empty
months, and dates becoming unavailable. No bookings were submitted.
