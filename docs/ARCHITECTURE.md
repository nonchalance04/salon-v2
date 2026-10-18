# Salon Booking and Appointment System

## MVP scope update — 2026-10-18

Audit logging and audit-log viewing are removed from this MVP. Runtime workflows
must not write `AuditLog`, and the audit report is unavailable. Existing audit
rows, the legacy schema and migrations are retained solely to preserve history;
no data cleanup or destructive migration is part of this change. Payments,
receipts, commissions, appointment reschedule history, policy versions and
operational error logging remain. Check-in and completion actor fields remain.
No-show correction still validates the reason and physical presence; its reason
and previous no-show timestamps are no longer retained in a separate audit event.

## Architecture v1.0

This document defines the application architecture for the Salon Booking and Appointment System.

The following documents remain authoritative:

- `SYSTEM_RULES.md` — business and domain behavior
- `DATABASE_MODEL.md` — persistence model, relationships, constraints, and concurrency requirements
- `ARCHITECTURE.md` — application structure and implementation boundaries
- `ROADMAP.md` — implementation sequence
- `DECISIONS.md` — approved architectural and business changes

If this document conflicts with `SYSTEM_RULES.md` or `DATABASE_MODEL.md`, the corresponding authoritative specification must be followed and the architecture corrected.

---

# 1. Architecture Goals

The system architecture must prioritize:

- Correctness
- Maintainability
- Simplicity
- Clear module boundaries
- Security
- Transaction safety
- Testability
- Deployment practicality
- Ease of explanation during capstone defense

The architecture must avoid unnecessary enterprise complexity.

The MVP will not use:

- Microservices
- Kubernetes
- Kafka
- RabbitMQ
- Redis as a required dependency
- Event sourcing
- Complex generic repository frameworks
- Distributed databases
- Unnecessary TypeScript metaprogramming

---

# 2. Overall Architecture

The system uses a:

**Modular Monolith**

The backend is one application containing clearly separated feature modules.

Conceptually:

```text
Backend Application
│
├── Auth
├── Customers
├── Services
├── Staff
├── Scheduling
├── Availability
├── Appointments
├── Payments
├── Commissions
├── Reports
├── Notifications
└── Chatbot
```

Modules run inside the same backend process but must preserve clear responsibilities.

This keeps deployment simple while maintaining clean internal architecture.

---

# 3. Repository Structure

The project uses a single Git repository.

```text
salon-booking-system/
│
├── AGENTS.md
├── README.md
│
├── docs/
│   ├── SYSTEM_RULES.md
│   ├── DATABASE_MODEL.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── DECISIONS.md
│
├── backend/
│
└── frontend/
```

Frontend and backend remain separate applications within the same repository.

---

# 4. Technology Stack

## Backend

Required technologies:

```text
Node.js
TypeScript
Express.js
Zod
Prisma ORM
PostgreSQL
```

TypeScript is required for application source code.

Plain JavaScript should only be used where required by tooling or configuration.

## Frontend

Required technologies:

```text
React
TypeScript
Vite
```

## Database

```text
PostgreSQL
Prisma ORM
```

Custom PostgreSQL migration SQL may be used where approved database constraints cannot be expressed safely through Prisma alone.

---

# 5. TypeScript Philosophy

TypeScript is used for:

- Compile-time safety
- Better refactoring
- Better IDE support
- Stronger API contracts
- Safer domain logic
- Better Prisma integration

The project must avoid unnecessary TypeScript complexity.

Prefer:

```ts
interface CreateServiceInput {
  name: string;
  durationMinutes: number;
}
```

over elaborate generic abstractions that provide little practical benefit.

Use:

- Simple interfaces
- Simple type aliases
- Zod inference
- Prisma-generated types
- Explicit domain types where useful

Avoid building advanced generic frameworks unless there is a demonstrated requirement.

---

# 6. Backend Folder Structure

Recommended structure:

```text
backend/
│
├── prisma/
│
├── src/
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── shared/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── services/
│   │   ├── staff/
│   │   ├── scheduling/
│   │   ├── availability/
│   │   ├── appointments/
│   │   ├── payments/
│   │   ├── commissions/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── chatbot/
│   │
│   ├── workers/
│   └── server.ts
│
├── tests/
├── package.json
└── tsconfig.json
```

Modules should only contain files they actually need.

Do not create empty architectural layers merely for consistency.

---

# 7. Backend Request Flow

The standard request lifecycle is:

```text
HTTP Request
      ↓
Route
      ↓
Zod Validation
      ↓
Authentication / Authorization
      ↓
Controller
      ↓
Service
      ↓
Repository / Prisma
      ↓
PostgreSQL
```

Business logic must not be placed inside Express route declarations.

---

# 8. Controller Responsibilities

Controllers handle HTTP concerns.

They may:

- Read validated request data
- Read authenticated user information
- Call application/domain services
- Convert service results into HTTP responses

Controllers must not contain:

- Complex scheduling rules
- Payment calculations
- Commission calculations
- Availability algorithms
- Prisma transaction workflows
- Raw business-state transitions

Controllers should remain thin.

---

# 9. Service Responsibilities

Services contain authoritative application and business logic.

Examples:

```text
AppointmentService
AvailabilityService
PaymentService
CommissionService
SchedulingService
NoShowRecoveryService
```

Services may:

- Validate business rules
- Coordinate multiple repositories
- Start database transactions
- Enforce lifecycle transitions
- Perform calculations
- Raise domain errors
- Create applicable notification outbox records

Services are the primary location for business behavior defined in `SYSTEM_RULES.md`.

---

# 10. Repository and Prisma Strategy

The project will use a pragmatic persistence layer.

Do not create a generic abstraction such as:

```text
BaseRepository<T>
GenericCrudRepository<T>
GenericCrudService<T>
```

Repositories should be introduced where persistence/query complexity justifies them.

Likely examples:

```text
AppointmentRepository
AvailabilityRepository
PaymentRepository
```

Simple modules may use Prisma through their module-specific service or persistence helper when doing so remains clear and testable.

Prisma access must not leak uncontrollably across unrelated modules.

---

# 11. API Architecture

The backend uses REST.

The base URI is:

```text
/api
```

Examples:

```text
/api/auth
/api/services
/api/staff
/api/availability
/api/appointments
/api/payments
/api/reports
```

## No Version Number in API URI

The project must not use:

```text
/api/v1
/api/v2
```

or similar URI-based version numbers.

The approved architecture uses:

```text
/api/...
```

No alternative API-versioning mechanism is introduced at this time.

Any future API-versioning strategy requires an explicitly approved architecture change.

---

# 12. Validation

Zod is used at application boundaries.

Validate:

- Request bodies
- URL parameters
- Query parameters
- Environment variables
- External-provider payloads where appropriate

Example flow:

```text
Request
   ↓
Zod
   ↓
Typed application input
   ↓
Controller / Service
```

Zod validation does not replace database constraints or transaction-level business validation.

---

# 13. Authentication

Admin and Cashier authentication use:

```text
Email
+
Password
+
JWT
+
Secure HttpOnly Cookie
```

The JWT should contain minimal required identity information such as:

```text
userId
role
```

JWTs must have a bounded expiration. Every protected request must validate the signature, expiration, and required claims, then load the current `User` record. The current `User.isActive` and database role are authoritative for access; a stale JWT role cannot retain privileges after deactivation or a role change. This does not require a refresh-token subsystem.

Passwords must be securely hashed.

Authentication cookies should use appropriate production settings such as:

```text
HttpOnly
Secure
SameSite
```

according to the deployed frontend/backend topology.

State-changing Admin/Cashier requests authenticated by the browser cookie require CSRF protection: enforce an exact trusted `Origin` check (or a validated `Referer` fallback when `Origin` is absent), rejecting missing or untrusted origins. Restrict credentialed CORS to explicitly approved frontend origins; `SameSite` is an additional safeguard, not the sole CSRF defense. Payment-provider callbacks do not use browser-cookie authentication and must follow the provider-verification boundary in Section 23.

A complex refresh-token subsystem is not required for the initial MVP unless later approved.

---

# 14. Guest Customer Access

Guest customers do not use Admin/Cashier authentication.

Guest appointment access uses a secure random token.

The database stores:

```text
guestAccessTokenHash
```

rather than the raw access token.

The raw token is presented only to the customer where required.

Guest-access validation must happen on the backend.

Possession of a booking code alone must not authorize private appointment operations.

---

# 15. Authorization

Authorization is enforced by the backend.

Architecture:

```text
Request
   ↓
Authentication Middleware
   ↓
Role Authorization
   ↓
Controller
   ↓
Service-level business authorization
```

Example:

```text
POST /api/services

Authenticated
      ↓
ADMIN required
      ↓
Controller
      ↓
Service
```

Frontend visibility controls are convenience/UI behavior only.

Hiding a button does not provide authorization.

---

# 16. Database Transaction Strategy

Business operations involving multiple dependent database changes must use Prisma transactions.

Important transactional workflows include:

- Booking
- Appointment-fee confirmation
- Rescheduling
- Cancellation
- No-show recovery
- Service settlement
- No-service closure
- Commission finalization
- Availability-affecting configuration changes

The complete operation must either commit successfully or roll back.

---

# 17. Concurrency Architecture

The implementation must follow the concurrency rules defined in `DATABASE_MODEL.md`.

The approved architecture uses:

- PostgreSQL transaction-level advisory coordination
- PostgreSQL row-level locking
- Prisma transactions
- Fresh validation after locks are acquired

Deadline-sensitive decisions must use fresh wall-clock time after potentially blocking coordination, Staff, and transaction-specific row locks. PostgreSQL `clock_timestamp()` supplies that fresh database clock inside the protected transaction; `now()` and `CURRENT_TIMESTAMP` reflect the transaction start and must not decide a hold or cutoff after a lock wait. If a later wait precedes finalization, refresh the clock again as required by the frozen deadline rules.

Conceptual ordering:

```text
Salon Coordination
        ↓
Staff Locks
        ↓
Appointment / Payment Locks
        ↓
Fresh Validation
        ↓
Mutation
        ↓
Commit
```

---

# 18. Salon-Wide Coordination

Reservation workflows participate in a salon-wide shared coordination mechanism.

Examples:

- New booking
- Appointment-fee confirmation
- Rescheduling
- No-show recovery

Salon-wide availability configuration writes use the exclusive counterpart.

Examples:

- Salon closure creation
- Salon operating-hour modification
- Service activation/deactivation (`Service.isActive`)
- BookingPolicyVersion creation/activation

Conceptually:

```text
Reservation workflow
→ SHARED salon coordination

Salon-wide configuration change
→ EXCLUSIVE salon coordination
```

PostgreSQL transaction-level advisory locks are the approved implementation approach.

Locks automatically release when the transaction completes.

`Service.isActive` writes use EXCLUSIVE salon-wide coordination and fresh affected-reservation validation before committing. Staff-specific schedule, unavailability, active-status, and qualification writes follow the SHARED salon coordination and ordered affected-Staff locking protocol in `DATABASE_MODEL.md`.

Creating or activating a BookingPolicyVersion uses EXCLUSIVE salon-wide coordination so a new independent booking cannot finalize policy selection concurrently with that write. The new version applies prospectively; existing appointments keep their governing policy and are not rewritten.

---

# 19. Staff Locking

After salon coordination is obtained, affected Staff records must be locked consistently.

Staff locks are acquired in ascending Staff ID order.

Example:

```text
Staff 15
Staff 27
Staff 42
```

not in arbitrary order.

This reduces deadlock risk.

Availability must then be recalculated using fresh database state.

---

# 20. Availability Architecture

Availability is calculated dynamically.

Do not permanently generate or store:

```text
AvailabilitySlot
TimeSlot
CalendarSlot
```

Availability derives from:

```text
SalonOperatingHour
+
StaffSchedule
-
SalonClosure
-
StaffUnavailability
-
blocking ACTIVE AppointmentService reservations
```

`AppointmentService` is the authoritative reservation unit.

The public booking calendar uses `POST /api/availability/calendar` with a month
and the same ordered service/staff plan as daily availability. It loads one
salon-local month of closures, time off, and reservations under the existing
coordination and staff locks, then uses the same availability engine to report
whether each date has at least one complete bookable plan. Calendar results
remain advisory; daily time lookup and final transactional booking validation
remain authoritative. No availability slots are persisted.


---

# 21. Booking Architecture

Booking flow conceptually:

```text
Customer booking request
        ↓
Validate input
        ↓
Load preliminary BookingPolicyVersion
        ↓
Construct sequential service plan
        ↓
Determine preliminary staff candidates / feasibility
        ↓
Acquire concurrency locks
        ↓
Freshly select effective policy and rebuild policy-dependent values
        ↓
Fresh availability and complete-plan validation
        ↓
Finalize specific / any available staff assignment
        ↓
Create Appointment
        ↓
Create AppointmentService rows
        ↓
PENDING_PAYMENT
        ↓
Commit
```

The booking process must not trust availability results calculated before acquiring the final reservation locks.

Preliminary staff choices are advisory. Under the protected transaction, recompute the complete candidate set, reserved workload, and deterministic assignment across the entire sequential service plan. If newly required Staff locks were not included in the ordered lock set, roll back and restart with the expanded set in canonical order; never lock new Staff out of order or commit a stale pre-lock choice.

For a new independent appointment, the preliminary BookingPolicyVersion is advisory too. After the required locks and fresh time evaluation, select the latest version effective at that time and rebuild the appointment fee, hold deadline, buffer fallback, lead/advance checks, and any other policy-dependent values before final validation and mutation. Repeat this selection on a transaction restart. If a changed policy requires Staff locks outside the ordered lock set, restart with the complete lock set. Ordinary rescheduling and no-show recovery instead retain the existing/original appointment's governing BookingPolicyVersion; neither selects a newer policy.

---

# 22. Any Available Staff

`ANY_AVAILABLE` assignment must remain deterministic.

Conceptually:

```text
Active qualified staff
        ↓
Schedule coverage
        ↓
Remove unavailable staff
        ↓
Remove conflicting staff
        ↓
Compare reserved workload
        ↓
Lowest workload
        ↓
Staff ID tie-breaker
```

For multi-service appointments, choose a feasible combination across the complete sequential plan before finalizing the deterministic assignment; an earlier greedy choice must not make a later service impossible.

AI must not determine authoritative staff assignments.

---

# 23. Payment Architecture

Payment integration uses a provider boundary.

Conceptual interface:

```ts
interface PaymentProvider {
  createPayment(...): Promise<...>;
  verifyPayment(...): Promise<...>;
  getPaymentStatus(...): Promise<...>;
}
```

Possible implementations:

```text
Manual/Test Payment Provider
GCash Payment Provider
```

Appointment business logic must not directly depend on GCash-specific implementation details.

This allows development and testing even without production merchant credentials.

Before `PaymentService` recognizes external payment success, it must authenticate the provider event or obtain authoritative server-to-server verification through `PaymentProvider`. It must match the verified provider transaction identity and reference, appointment association, expected amount and currency, and successful capture status to the obligation. Client-submitted data or an unauthenticated callback alone cannot establish payment success. Manual payment recording uses a separately authorized Cashier/Admin application workflow; test providers must be disabled in production.

---

# 24. Payment Idempotency

All payment attempts require stable identity.

Payment processing must handle:

- Duplicate callbacks
- Repeated client requests
- Late appointment-fee captures
- Reconciliation cases
- Prevention of duplicate settlement

`SERVICE_PAYMENT` remains limited to one successful payment per Appointment under the MVP rules.

Payment-provider callbacks must enter the normal PaymentService transaction workflow.

They must not directly mutate Appointment records.

---

# 25. Background Worker

Background processing remains inside the same backend codebase.

Conceptually:

```text
backend/src/workers/
```

Production may run:

```text
API Process
Worker Process
```

Both use the same PostgreSQL database.

The MVP does not require Redis, RabbitMQ, or another message broker.

---

# 26. Booking Hold Cleanup

Availability correctness does not depend solely on the cleanup worker.

A PENDING_PAYMENT Appointment blocks only while its hold remains logically active according to the authoritative rules.

Therefore:

```text
hold expired
→ reservation no longer blocks
```

even if a worker has not yet changed the stored Appointment status to `EXPIRED`.

The worker may subsequently normalize stored state.

---

# 27. Notification Architecture

Notifications use the existing `NotificationQueue`.

Flow:

```text
Business transaction
        ↓
Create NotificationQueue record
        ↓
Commit transaction
        ↓
Worker atomically claims due queue record
        ↓
NotificationProvider
        ↓
SMS / Email; record outcome or schedule retry
```

Notification-provider failure must not roll back a successfully committed booking or payment.

Workers claim due `PENDING` rows atomically in a short database transaction, marking them `PROCESSING`, incrementing `attemptCount`, and recording claim time in `updatedAt` before calling the provider outside that transaction. Concurrent workers must not claim the same live attempt. A bounded processing lease allows another worker to reclaim an abandoned `PROCESSING` row after a crash, incrementing the claim generation. Completion or retry updates must be conditional on the current claim generation (`attemptCount` and `PROCESSING` status), so a stale worker cannot overwrite a newer attempt's result. Delivery errors record `lastError` and return the row to `PENDING` with a future `scheduledAt` for a bounded retry, or end in `FAILED` when retries are exhausted.

Delivery attempts are at least once: if a provider accepts a message but the worker crashes before recording `SENT`, recovery may deliver it again. Use the stable `NotificationQueue.id` as a provider idempotency key where supported; do not promise exactly-once external delivery. Notification retries and failures remain independent of the committed business transaction. No new queue entity or message broker is required.

---

# 28. Notification Provider Boundary

External communication should use provider abstractions.

Conceptually:

```text
NotificationProvider
├── Email Provider
└── SMS Provider
```

Provider-specific implementation details must remain outside core booking logic.

---

# 29. AI Chatbot Architecture

The chatbot exists as a separate backend module.

Conceptually:

```text
Customer
   ↓
Chatbot UI
   ↓
/api/chatbot
   ↓
ChatbotService
   ↓
Approved domain services
```

The chatbot may retrieve:

- Services
- Prices
- Operating information
- Booking policies
- Availability

The chatbot must not directly call:

```text
prisma.appointment.create(...)
```

or equivalent direct transaction code.

Any action that changes authoritative business data must go through the same domain service used by the normal application.

---

# 30. Frontend Architecture

The frontend uses the Component Folder Pattern, with separate component, page,
layout, and authentication-context folders.

React Router owns client-side navigation through the route table in
`frontend/src/app/router.tsx`. The public layout shares catalog and salon data across
its child pages. Staff routes retain the lightweight authentication context and
role-specific workspace; `/staff/:page` and query parameters represent workspace
navigation. Form values and private guest tokens remain in component memory.
Use router links and navigation APIs for internal pages, with ordinary anchors
for contact links, document fragments, and hosted payment checkout. Production
hosting must serve the SPA index for frontend deep links while preserving `/api`.

Source organization:

```text
frontend/src/
├── main.tsx
├── app/router.tsx
├── components/
│   ├── BookingForm/
│   │   ├── BookingForm.tsx
│   │   └── index.ts
│   ├── Chatbot/
│   │   ├── Chatbot.tsx
│   │   ├── Chatbot.css
│   │   ├── chatbot-history.ts
│   │   ├── chatbot-session.ts
│   │   └── index.ts
│   └── ...
├── contexts/AuthProvider/
├── layouts/
│   ├── PublicSite/
│   └── WorkspaceLayout/
├── pages/
├── lib/api.ts
├── styles/
├── types/
└── utils/
```

Each public React component has a PascalCase folder, a matching `.tsx` file,
and an `index.ts` that exports that component and its associated public types.
Consumers import the component folder; avoid an application-wide component
barrel. Keep component styles and private helpers beside their owner. Shared
contracts live in `types`, reusable non-UI functions in `utils`, API transport
in `lib`, and global styles in `styles`. The public layout retains the shared
customer stylesheet imports in their established cascade order. Existing
frontend unit tests remain in `frontend/tests`.

Shared presentation primitives use source-owned shadcn/ui components under
`components/ui/<Component>/<Component>.tsx`, with folder exports. Feature
components compose these primitives and keep their domain state, API calls,
and workflow-specific CSS. `@/` resolves to `frontend/src` in Vite and TypeScript;
`lib/utils.ts` owns utility-class merging. Semantic tokens in `styles/tailwind.css`
retain the public and staff themes without a global Preflight reset. Modal
portals remain inside their current theme root and use Radix focus management.
UI primitives do not decide availability, appointment state, or payment outcomes.

See `frontend/README.md` for the component-folder convention and validation.

---

# 31. Frontend State Strategy

The frontend should use the simplest suitable state-management approach.

Use:

```text
Server state
→ query/cache layer

Form/component state
→ React local state

Authentication state
→ lightweight auth context
```

Redux is not required initially.

It may only be introduced later if the application develops a concrete state-management problem that justifies it.

---

# 32. API Error Architecture

The backend uses centralized error handling.

Recommended response structure:

```json
{
  "error": {
    "code": "APPOINTMENT_SLOT_UNAVAILABLE",
    "message": "The selected appointment slot is no longer available."
  }
}
```

Examples of domain error codes:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
APPOINTMENT_SLOT_UNAVAILABLE
BOOKING_HOLD_EXPIRED
RESCHEDULE_NOT_ALLOWED
PAYMENT_ALREADY_SETTLED
SERVICE_NOT_AVAILABLE
```

Internal stack traces must not be exposed to normal clients.

---

# 33. Logging Architecture

Two different logging concerns must remain separate.

## Operational Logging

Used for:

- Debugging
- Errors
- Request failures
- Provider failures
- Worker problems
- Deployment troubleshooting

## Legacy Audit History

Audit logging is outside the current MVP. Application services do not create
`AuditLog` records and reports do not expose them. The legacy table is retained
for existing history. Operational error logging remains independent.

---

# 34. Environment Configuration

Configuration must be environment-driven.

Typical production configuration may include:

```text
DATABASE_URL
JWT_SECRET
APP_URL
API_URL
PAYMENT_PROVIDER credentials
EMAIL provider credentials
SMS provider credentials
AI provider credentials
```

Environment variables must be validated at startup using Zod.

Secrets must never be committed to Git.

A `.env.example` may document required variable names without real secret values.

---

# 35. Testing Architecture

The project uses multiple testing levels.

Conceptual strategy:

```text
Unit Tests
    ↓
Business/Service Tests
    ↓
API Integration Tests
    ↓
Database/Concurrency Tests
    ↓
Critical Workflow Tests
```

Critical scenarios include:

```text
Two customers booking the same staff interval
Payment confirmation versus hold expiration
Lock wait crossing a hold deadline (fresh post-lock clock)
Booking versus salon closure creation
Booking versus service activation/deactivation
Policy becoming effective during a booking lock wait or transaction restart
Rescheduling versus competing booking
Multi-service Any Available Staff assignment after candidate changes
Duplicate payment callbacks
Forged or mismatched provider callbacks
No-show recovery credit reuse
Duplicate service settlement
Commission finalization
Authorization violations
CSRF and stale JWT role/deactivation checks
Concurrent notification claims, abandoned PROCESSING recovery, and crash after provider delivery
```

Concurrency-sensitive tests should use PostgreSQL rather than mocking away the database behavior being tested.

---

# 36. External Service Failure Principle

External providers must not become authoritative for core system state.

Examples:

```text
SMS provider unavailable
→ booking still succeeds if booking transaction succeeded

Email provider unavailable
→ payment remains valid

AI provider unavailable
→ normal booking functionality continues
```

External integration failures should be isolated, logged, and retried where appropriate.

---

# 37. Deployment Architecture

The initial production topology should remain simple.

```text
                Browser
                   │
                   ▼
             React Frontend
                   │
                 HTTPS
                   │
                   ▼
            Express Backend
               │       │
               │       └── Worker
               │
               ▼
            PostgreSQL
```

External integrations may include:

```text
Payment Provider
Email Provider
SMS Provider
AI Provider
```

The MVP does not require Kubernetes or microservices.

---

# 38. Production Deployment Responsibilities

Before production launch, deployment must include:

- Production PostgreSQL
- Production environment variables
- Prisma migrations
- Secure secrets
- HTTPS
- Correct cookie security configuration
- CORS/trusted-origin configuration
- Initial Admin provisioning
- Database backups
- Application logs
- Health checks
- Provider credentials
- Production regression testing

Detailed deployment procedures belong to the later Deployment Phase.

---

# 39. Security Principles

The architecture must enforce:

- Password hashing
- Backend authorization
- Secure cookies
- Guest-token hashing
- Input validation
- Least privilege
- Restricted administrative endpoints
- No secrets in source control
- Safe database transactions
- Idempotent payment handling
- Appropriate rate limiting where needed

Frontend checks do not replace backend security.

---

# 40. Historical Preservation

Application architecture must respect the historical-preservation rules defined by the database model.

Normal application behavior should favor:

```text
deactivate
```

rather than:

```text
delete
```

for historically referenced entities.

Historical Appointment, AppointmentService, Payment, Receipt, CommissionRecord, and audit data must not be casually removed.

---

# 41. Feature Removal and Future Changes

Features may be changed or removed later.

Examples include:

- Appointment cancellation
- Notification channels
- Particular reports
- External integrations

Changes must follow a controlled process:

```text
Proposed change
      ↓
Clarify requirements
      ↓
User approval
      ↓
Update SYSTEM_RULES if needed
      ↓
Assess DATABASE_MODEL impact
      ↓
Update ARCHITECTURE if needed
      ↓
Modify implementation
      ↓
Regression tests
```

Historical data should remain understandable even when a feature is no longer available for new transactions.

---

# 42. Architecture Change Control

Do not introduce significant new:

- Frameworks
- Infrastructure
- Services
- Database entities
- Authentication mechanisms
- Payment workflows
- Messaging systems
- API conventions
- User-facing workflows

without an approved architecture or system change.

The project should remain flexible, but changes must be deliberate.

---

# 43. Source of Truth

Implementation must conform to:

```text
SYSTEM_RULES.md
        ↓
DATABASE_MODEL.md
        ↓
ARCHITECTURE.md
        ↓
Implementation
```

Codex must not silently change system rules or architecture merely to make implementation easier.

When implementation exposes a legitimate design problem:

```text
Finding
   ↓
Discuss
   ↓
Approve change
   ↓
Update specification
   ↓
Implement
```

---

# 44. Approved Architecture Summary

The approved architecture is:

```text
Modular Monolith

Frontend:
React
TypeScript
Vite

Backend:
Node.js
TypeScript
Express.js
Zod

Database:
PostgreSQL
Prisma ORM

API:
REST
/api/...
NO version number in URI

Authentication:
JWT
Secure HttpOnly cookie

Authorization:
Backend role enforcement
+
Service-level authorization

Concurrency:
Prisma transactions
+
PostgreSQL transaction advisory coordination
+
Row-level locks

Background processing:
Database-backed worker
No Redis/RabbitMQ requirement

Payments:
PaymentProvider abstraction

Notifications:
NotificationQueue
+
Provider abstraction
+
Worker

AI:
Separate chatbot module
No direct authoritative database writes

Errors:
Centralized domain-error handling

Logging:
Operational logs omit credentials and personal payloads

Testing:
Unit
Integration
Database
Concurrency
Critical workflow testing

Deployment:
Frontend
Backend API
Worker
PostgreSQL
External provider adapters
```

The system intentionally favors a straightforward, maintainable architecture over unnecessary infrastructure complexity.

## TextBee and appointment OTP access

`AppointmentOtpService` owns code generation, digest comparison, durable rate limits, atomic consumption and appointment session issuance. `NotificationProvider` supplies the TextBee SMS transport. Controllers validate inputs and set/clear HttpOnly cookies. Guest service authorization accepts either the original private token or an unexpired appointment-scoped session; both retain existing booking/payment business rules. TextBee keys never enter frontend assets. See `TEXTBEE_SETUP.md`.


### Public staff profiles

Admin configuration exposes `PUT /api/configuration/staff/:id/profile` using the same admin authentication, origin checks, scheduling locks, transaction conventions as other staff changes. The strict profile schema bounds text and collection sizes, restricts image URLs to HTTPS without credentials, and accepts ratings from 1 to 5. It updates only `Staff.publicProfile`; basic staff edits preserve it.

`GET /api/availability/staff` returns saved public profiles and derived counts of distinct completed appointments and clients where that staff member performed an active service. Staff phone numbers and commission data are excluded. Inactive staff remain hidden. The booking picker renders saved content, empty states for unpublished sections, and an illustrated fallback for unavailable portrait images. Testimonials are labeled as shared by the salon, rather than presented as independently verified reviews. Profile photos and portfolio images are externally hosted URLs; file upload/storage is not part of this editor.

### Automatic PayMongo customer receipts

PaymentService owns automatic receipt issuance inside the verified capture transaction and idempotent legacy receipt recovery. Guest-authorized POST /api/payments/customer-receipt validates booking access and payment ownership before accepting only successful PayMongo appointment-fee payments. System receipts have nullable issuedByUserId. React renders the immutable receipt snapshot in the shared branded receipt layout; a customer dialog supports preview and browser Print / Save as PDF.


### Date-only salon closure input

Closure POST/PUT requests accept `{ date, reason? }` in addition to the existing
strict interval format. The configuration service converts a validated date
into salon-local midnight-to-next-midnight instants before writing within the
existing exclusive salon coordination transaction. Conflict checks use the normalized period. The Admin UI creates date-only closures
and recognizes exact single-day intervals when displaying/editing existing
records; custom-hours/multi-day records continue to use their original interval
editor. No database schema change is required.


### Weekly opening-hours editor

The Admin opening-hours screen presents Monday through Sunday with Open/Closed
controls and salon-local opening/closing time inputs. Existing split hours
remain separate ranges. Each day saves through authenticated, admin-only
`PUT /api/configuration/hours/day/:dayOfWeek`, validating the day, state, ranges,
and record identities. The configuration service saves the whole day in one
exclusive salon transaction, checks reservation coverage including buffers before
mutation, retains unchanged records and deactivates removed
periods instead of deleting them. The existing individual-period endpoints stay
compatible. There are no new models or database migrations.

### PayMongo QR Ph booking checkout

Hosted Checkout V2 requests gcash and qrph. The provider adapter retrieves the
merchant session and returns its verified capture source as providerMethod.
PaymentService stores GCASH or QRPH atomically with settlement and automatic
receipt issuance; pending checkout uses OTHER while the method is unknown.
Collection method totals include QRPH. QR generation/display remains hosted by
PayMongo. Existing manual payment inputs and Cashier settlement are unchanged.

### PayMongo return origin

The checkout route passes its browserSecurity-validated request origin through
PaymentService to PaymentProvider. The PayMongo adapter requires an exact
TRUSTED_ORIGINS match and builds /booking-confirmed on that origin, preserving the
host-only guest-session cookie when several development/staging origins are in use.
Missing request origin in internal calls falls back to PAYMONGO_RETURN_URL's origin.
Neither browser JSON nor forwarding headers select a return destination.
