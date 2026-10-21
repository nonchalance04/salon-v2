# Thesis defense study guide

Prepared from the repository on October 22, 2026, for the October 23 defense. This is an explanation of the inspected implementation, not a replacement for the governing specifications. Example amounts, staff, and times below are illustrative. Check the actual configured policy before demonstrating it.

## 1. Your opening explanation

“Our system manages salon appointments from online booking through final service settlement. Customers select services and qualified staff, view calculated availability, and pay an appointment fee to confirm their reservation. Admins manage salon configuration and monitor operations. Admins and Cashiers handle arrival and service outcomes, receive final service payments, and issue receipts. The backend enforces scheduling, payment, and authorization rules, while PostgreSQL transactions protect related records from partial updates and conflicting requests.”

Be able to explain four things about any feature: its user input, its business rule, the records it changes, and what happens when it fails.

## 2. Actors and current permissions

| Actor | Responsibility |
| --- | --- |
| Customer/Guest | Browse, select services/staff, book, pay the appointment fee, securely retrieve the booking, request eligible changes/cancellation/recovery |
| Admin | Manage accounts, catalog, stylist qualifications, schedules, closures and policies; inspect reports and commissions; handle appointments and settlement |
| Cashier | Record arrival, record service outcomes, correct eligible no-shows, collect final service payment, access receipts and permitted collection summaries |
| Stylist/Staff | Operational resource assigned to services; no separate stylist login/dashboard in this MVP |

`User` means an authenticated Admin/Cashier account. `Staff` means a stylist who performs services. These are different entities even if one real person could fulfill both responsibilities.

Current code permits both Admin and Cashier to settle a positive service charge. Only Admin can finalize an all-not-performed no-service closure. Both roles can record outcomes once; neither can change a saved outcome through the current outcome endpoint. Admin alone can manually mark a no-show. Both roles can perform an eligible no-show correction with the required presence confirmation and reason.

Evidence: `backend/src/modules/settlement/settlement.service.ts`, `settlement.routes.ts`, and `backend/src/modules/appointments/appointment-changes.service.ts`.

## 3. Architecture: how a click reaches the database

```text
React component
  → frontend API helper / fetch
  → HTTP /api endpoint
  → Express middleware and Zod validation
  → route handler acting as a thin controller
  → business service
  → Prisma / parameterized SQL where needed
  → PostgreSQL
  → JSON response
  → React updates the interface
```

Authentication, role checks, and browser-origin protection are applied where appropriate. Their exact order varies by route; guest booking does not require a staff account.

| Technology | Role in THIS system |
| --- | --- |
| React | Booking screens, forms, staff workspace and presentation of responses |
| TypeScript | Compile-time checking of application code and contracts |
| Vite | Frontend development server and production build |
| Node.js + Express | Backend runtime and HTTP routing/middleware |
| Zod | Runtime validation of untrusted inputs; TypeScript alone cannot validate incoming JSON |
| Prisma | Typed persistence access, relationships and transactions |
| PostgreSQL | Durable records, relational constraints, exact numeric storage and concurrency locks |

The backend is a **modular monolith**: one application organized into feature modules. API, hold-worker, and notification-worker are separate running processes sharing the same database. They are not independent microservices.

Why this design: the workflows are closely related and often need one transaction. A modular monolith keeps deployment manageable while separating responsibilities.

The code does not require a separate controller file for every module. For example, `appointments.routes.ts` validates input, calls `service.book`, and returns HTTP 201. The scheduling logic lives in the service and availability engine.

## 4. The core database model

```text
Customer ──< Appointment >── BookingPolicyVersion
                  │
                  ├──< AppointmentService >── Service
                  │           │
                  │           └── assigned Staff identity
                  ├──< Payment ── Receipt
                  ├──< CommissionRecord
                  ├──< AppointmentRescheduleHistory
                  └──< NotificationQueue

Staff ──< StaffService >── Service
Staff ──< StaffSchedule
Staff ──< StaffUnavailability
SalonOperatingHour + SalonClosure → availability inputs
```

`──<` means one-to-many. Payment can have at most one receipt. Staff history also has snapshot and optional current-record linkage fields; inspect the schema for the exact relationships.

The most important distinction:

- `Service` is the current catalog definition, such as “Haircut, 30 minutes, PHP 300.”
- `Appointment` is the overall visit, customer, status, policy and fee obligation.
- `AppointmentService` is one booked service occurrence: sequence, assigned stylist, historical values, scheduled interval, buffer and outcome.

**AppointmentService is the authoritative staff reservation unit.** A single visit can contain several services assigned to different qualified stylists. Reserving only an Appointment's broad start/end would lose that detail.

`StaffService` is the many-to-many qualification link. It also carries the commission rate used when taking a booking snapshot.

The schema lives in `backend/prisma/schema.prisma`. Migrations additionally define SQL checks and partial unique indexes that Prisma's schema alone cannot fully express. A unique booking code does not by itself prevent overlapping appointments.

## 5. Booking, step by step

1. Load active catalog services and available staff information.
2. Customer selects services and either specific staff or Any Available for each.
3. Reject duplicate services and multiple services in the same normalized category. Haircut, color, and treatment can coexist when they belong to distinct categories.
4. Calendar lookup identifies dates with at least one feasible complete plan; daily lookup returns candidate starting times.
5. Customer submits the exact chosen start and contact information.
6. Backend validates the request again. The submitted request does not set authoritative prices or commission rates.
7. Start a reservation transaction, obtain shared salon coordination and ordered staff locks, then read fresh database time.
8. Select the currently effective booking policy and reload services, qualifications, hours, time off and blocking reservations.
9. Rebuild and validate the entire sequential plan under the locks. Reject an unavailable slot with a conflict response.
10. Create the Customer record, Appointment and AppointmentService rows with historical snapshots. The current booking implementation creates a customer record for the booking; do not claim automatic cross-booking customer deduplication.
11. Set status to `PENDING_PAYMENT` and calculate the hold deadline from policy.
12. Return a booking code and private guest credential. If the transaction fails, its dependent writes roll back.

The service rechecks time/policy/assignment before returning from the protected operation. If the required lock set or assignment becomes stale, it can restart instead of committing an unsafe choice.

Initial documented policy defaults are shown below. These are configurable through policy versions, so do not present them as the current database settings without checking.

| Setting | Initial default |
| --- | --- |
| Fixed appointment fee | PHP 100 |
| Payment hold | 10 minutes |
| Fallback buffer | 15 minutes |
| Minimum booking lead | 60 minutes |
| Advance booking limit | 30 salon-local calendar days |
| Maximum ordinary/recovery changes | 2 |
| Reschedule/cancellation cutoff | 4 hours before scheduled start |
| No-show recovery grace | 72 elapsed hours from missed start |

An explicit service buffer overrides the policy buffer, including an explicit zero. New independent bookings select the effective policy; rescheduling and recovery keep the original governing policy. Policy changes create versions instead of rewriting historical obligations.

Read: `createAppointmentsService().book()` in `backend/src/modules/appointments/appointments.service.ts`.

**Defense answer:** “The calendar is advisory. Final booking repeats availability validation inside a transaction after obtaining locks, because another customer could book between viewing and submitting.”

## 6. Scheduling algorithms you should be able to explain

### A. Full interval coverage

A reservation must fit inside BOTH salon hours and the assigned stylist's working schedule, including its buffer. It must avoid salon closures, stylist unavailability and conflicting reservations. Checking only the start time is insufficient.

Conceptually:

```text
candidate working time = salon hours ∩ stylist schedule
feasible reservation = full duration + buffer inside working time,
                       with no closure, time-off or reservation conflict
```

The implementation tests coverage and overlaps directly; it does not store a permanent table of available time slots.

### B. Overlap detection

```ts
return start < otherEnd && end > otherStart;
```

This treats intervals as `[start, end)`: the start is included, the ending boundary is excluded. A reservation ending at 10:45 allows another to begin exactly at 10:45.

Always use `reservedUntilAt`, including buffer, for scheduling conflicts.

### C. Sequential multi-service scheduling

Illustrative plan with a 15-minute buffer after each service:

| Service | Work interval | Staff reserved until | Next service begins |
| --- | --- | --- | --- |
| Haircut, 30 min | 10:00–10:30 | 10:45 | 10:45 |
| Color, 60 min | 10:45–11:45 | 12:00 | — |

`scheduledEndAt` is the service's work end. `reservedUntilAt` adds buffer. The Appointment's `endAt` is the final service work end, while the last stylist remains reserved through the final buffer.

The same customer's services are sequential, including buffers. Different customers may be served simultaneously by different available stylists. Do not claim parallel services within one visit.

### D. Any Available staff

For each fixed service interval:

1. Keep active, qualified staff.
2. Require complete schedule coverage.
3. Remove time-off and reservation conflicts.
4. Rank by existing reserved workload on the target salon day.
5. Break equal workloads by staff ID.

Workload is reserved time clipped to the day, not a count of customers. It includes live pending-payment and confirmed reservations. Completed reservations can still protect a remaining buffer, but do not add assignment workload.

The engine validates candidate lists for ALL services before choosing staff. Because this MVP fixes non-overlapping sequential intervals, staff choices cannot create cross-service time conflicts within the new plan. It does not need recursive backtracking under these assumptions. Do not claim an AI scheduler, machine learning, or an implemented exponential search.

Daily offered starts are spaced at 15-minute intervals. Exact-start validation also exists; the spacing is a UI offering rule, not proof that every stored time is rounded.

Read: `backend/src/modules/availability/availability.engine.ts` and `backend/src/modules/scheduling/coverage.ts`.

## 7. Appointment states and blocking rules

```text
PENDING_PAYMENT ── timely verified fee ──> CONFIRMED ── settlement/closure ──> COMPLETED
       │                                      ├── eligible cancellation ──> CANCELLED
       └── hold expires ──> EXPIRED            └── missing arrival ──> NO_SHOW
```

Ordinary rescheduling changes an existing eligible confirmed appointment and records history. `RESCHEDULED` is not a status. Check-in also leaves status `CONFIRMED`.

| Status | Does its active service interval block staff? |
| --- | --- |
| PENDING_PAYMENT | Yes while current time is at or before hold expiry |
| CONFIRMED | Yes |
| COMPLETED | Retains protection until that service's reserved end passes |
| CANCELLED / NO_SHOW / EXPIRED | No |

Removed service occurrences do not block. Even if the worker is temporarily down, a pending hold past its deadline is excluded by availability calculation.

`COMPLETED` means handling is closed. It can represent successful performed-service settlement or an all-not-performed closure.

## 8. Payments: separate money movement from reservation status

There are two payment purposes:

| Payment | Purpose |
| --- | --- |
| APPOINTMENT_FEE | Confirms the reservation when received within the active hold |
| SERVICE_PAYMENT | Collects the full sum of performed-service charges at settlement |

The appointment fee is separate and is **not deducted** from the final service charge. With an illustrative PHP 100 fee and PHP 800 performed-service total, service settlement is PHP 800; total collections are PHP 900.

Online fee checkout uses a provider boundary. The PayMongo adapter verifies the callback signature over the raw body and retrieves merchant-side checkout information to validate identity, amount, currency, payment source/mode and paid status. A browser success page alone is not proof of payment. Final service collection is a verified manual staff workflow; recording GCash here does not mean the backend automatically transferred money.

**Late payment case:** Hold expires at 10:10. Verified success is processed at 10:12. Record the financial success, flag reconciliation, and leave the reservation expired. An earlier provider payment timestamp cannot displace another customer's reservation.

**Duplicate case:** A webhook is delivered twice or staff retries after a network error. Idempotency keys, provider transaction references, state checks and database uniqueness prevent the same identified operation from duplicating its payment/receipt/commissions. Reusing an identity with different details must be rejected. Unrelated successful captures must still be recorded accurately and reviewed.

PayMongo checkout creation has special recovery for ambiguous provider responses; do not assume every external API call supports automatic idempotent retry.

Read: `payments.service.ts`, `paymongo-provider.ts`, `payment-provider.ts`, and `payments.routes.ts` in `backend/src/modules/payments/`.

## 9. Arrival, outcomes, settlement and commissions

### Arrival

Admin/Cashier confirms physical presence. The server records the first check-in time and authenticated actor atomically. Ordinary check-in requires the visit's salon-local date and an eligible confirmed visit without recorded service activity. Repeating check-in preserves the first arrival. It does not create payment, performance or completion.

Check-in prevents automatic no-show marking and allows operational waiting-queue follow-up. The queue does not automatically allocate a new stylist time or extend the reservation.

### Outcomes and settlement

1. Look up the booking and receive a revision representing the reviewed state.
2. Submit every active service exactly once as `PERFORMED` or `NOT_PERFORMED`.
3. Performed charges use the historical price snapshot; not-performed charges are zero.
4. Saved outcomes are locked against changes by both roles.
5. Submit full payment with the reviewed revision and a stable idempotency identity.
6. Backend rejects a stale review or incorrect amount.
7. One transaction creates the successful service payment, receipt and commission rows, finalizes outcomes, completes the appointment, and queues applicable notification events.

The revision is a hash of relevant appointment/service state. It detects someone else changing the record after the screen loaded. It complements database locking.

If all services are not performed, Admin uses no-service closure: no fabricated zero-value payment, no service-payment receipt, and no commissions. Existing fee history is preserved. Partial/split payments and discretionary price overrides are outside this settlement flow.

### Commission worked example

Assume two performed services: PHP 300 at 20% and PHP 700 at 30%, with PHP 100 eligible appointment fee.

```text
Total service charge = 300 + 700 = 1,000
First service fee share = 100 × 300 / 1,000 = 30
Second service fee share = 100 × 700 / 1,000 = 70
First commission = (300 + 30) × 0.20 = 66
Second commission = (700 + 70) × 0.30 = 231
Final service collection = 1,000; total collections including fee = 1,100
```

This allocation is for commission calculation; it does not collect the fee a second time. Not-performed services receive no allocation/commission. The algorithm uses Decimal arithmetic, rounds half-up to two decimal places, and assigns any fee-allocation rounding remainder to the largest service charge, with sequence and ID tie-breakers.

Read: `backend/src/modules/settlement/settlement.service.ts` and `commissions.ts`.

## 10. Changes, cancellation and no-shows

**Ordinary reschedule:** Authenticate guest access, check original policy/cutoff/change count and eligibility, lock affected state, validate the complete replacement schedule, and update atomically with history. Ignore only this appointment's own old reservation while testing its replacement. A failed change preserves the original booking.

Retained services keep their booked name, price, duration, buffer and commission snapshots. Added services receive current values. Removed rows remain historical. Rescheduling uses the appointment's original policy, not today's new version.

**Cancellation:** Eligible confirmed appointments can be cancelled before their governing cutoff. This releases availability while retaining history. Cancellation is not an automatic refund.

**Automatic no-show:** The hold worker checks approximately every five seconds. At or after 15 minutes from the scheduled start, it can mark an otherwise eligible confirmed visit with no check-in, completion or active service outcome. Worker timing is approximate and catches up after downtime.

**Recovery:** An eligible customer gets one linked replacement booking within the original policy's grace window, measured from the missed start. The original stays `NO_SHOW`. Recovery retains the original policy and increments the effective change count. Valid unused fee credit can directly confirm the replacement; it references the original payment without creating a second collection. Otherwise the replacement needs a normal fee hold/payment.

**Correction:** Admin/Cashier may correct an eligible same-day no-show with reason and physical-presence confirmation before the original visit ends. The backend must revalidate the full original service intervals against current availability. A successful correction restores confirmation and checks the person in; it does not move/extend the visit. A replacement booking or conflict prevents this shortcut.

Read: `backend/src/modules/appointments/appointment-changes.service.ts`.

## 11. Why simultaneous requests do not simply overwrite each other

Booking and related workflows use a consistent coordination order:

```text
salon advisory coordination → sorted Staff row locks → appointment/payment locks as needed
  → fresh time and state validation → writes → commit or rollback
```

Reservations use shared salon coordination. Salon-wide availability configuration writes use exclusive coordination. Staff-specific changes follow the relevant ordered staff-lock protocol. Shared coordination does not mean “no locks”: bookings for the same staff still serialize on staff rows.

The current booking implementation locks all existing staff, a deliberately conservative approach for a small salon. This simplifies complete-plan and Any Available comparisons but limits throughput; do not claim maximum parallel booking performance.

Illustration: Customers A and B both see the same slot. A obtains the relevant staff lock and commits. B obtains it afterward, reloads committed reservations, and gets `SLOT_UNAVAILABLE` if no feasible plan remains.

The transactions use Read Committed plus explicit locks and revalidation. Do not call this a globally serializable isolation implementation. The guarantee relies on all scheduling writers following the same protocol.

Database `clock_timestamp()` gives fresh time after a lock wait. PostgreSQL `now()` is tied to transaction start and could incorrectly treat an expired hold as active after waiting.

Read: `backend/src/modules/scheduling/coordination.ts` and `reservationTransaction()` in `appointments.service.ts`.

## 12. Security and data integrity

- Staff sign in with **username and password**. Passwords are bcrypt-hashed, not stored in plain text and not reversibly encrypted.
- A bounded JWT is placed in an HttpOnly cookie. Protected requests reload the active account and current database role. Password recovery increments `sessionVersion` to invalidate earlier sessions.
- Browser cookie operations use trusted-origin/Referer checks with appropriate cookie settings. Hiding a frontend button is not authorization.
- Guests use a cryptographically random private token; the database stores its SHA-256 hash. A booking code alone is not authorization for private customer actions.
- Private links use fragments; fragments are not included in the initial HTTP URL request. The frontend still sends the credential where required for backend validation. Whoever possesses a private link can use it, so it must be kept private.
- Email/SMS OTP access is separately configurable. Challenges have expiry, attempt/request limits and hashed code verification; successful verification issues a bounded appointment guest session.
- Validation occurs at request boundaries; business rules and SQL constraints provide additional protection.
- Persisted money uses Decimal/Numeric values and exact amount strings at relevant API boundaries. Financial arithmetic does not rely on ordinary floating-point multiplication.
- Absolute instants use timezone-aware database columns; salon-local dates/hours determine scheduling and reporting boundaries.
- Transactional snapshots preserve booked financial/timing values and issued receipt content after catalog changes.

Do not claim the system is “100% secure.” Explain the controls and their scope.

## 13. Notifications, reports and chatbot

### Notifications

Business transactions enqueue notification records; a separate worker contacts providers. This transactional outbox approach avoids a committed booking with a lost event due to an immediate process crash between two independent writes.

The worker claims due rows with `FOR UPDATE SKIP LOCKED`, uses processing leases, bounded attempts and exponential retry delays. It checks whether reminders are still relevant. Gmail/TextBee adapters and test/disabled modes exist; configuration determines actual delivery.

Provider acceptance (`SENT`) does not prove inbox/handset receipt. Delivery is at least once: a crash after external acceptance can cause a retry and duplicate external delivery. Do not claim exactly-once SMS/email.

### Reports

Admins access detailed operational/financial reports and commission information; Cashiers access permitted aggregate collections. Collection periods use payment `paidAt`; appointment counts use scheduled times; payment-attempt reports can use attempt creation time. These are different questions and can produce different totals for the same dates.

Collections are not profit. Carried fee credit is not a new cash receipt. Recorded financial adjustments affect net movement. This is not full payroll, inventory, tax accounting or cash-drawer reconciliation software.

### Chatbot

Guided mode responds using public salon information. Optional Gemini mode uses salon guidelines, current public catalog/policy facts and bounded conversation context, validates structured output, and falls back to guided behavior when needed.

The chatbot assists with consultation and navigation. It does not inspect private appointments, verify payment, assign authoritative staff, or mutate bookings. Actual booking still goes through validated backend services. Do not describe this as a custom-trained scheduling AI or claim you trained Gemini on a proprietary model.

Temporary chat context is different from a permanent backend chat-history database. The frontend includes session restoration; avoid claiming that no browser-side conversation state exists.

## 14. Code-reading route: follow the feature instead of memorizing files

Paths are relative to the repository root. Search for the listed function to begin.

| Order | File | What to explain aloud |
| --- | --- | --- |
| 1 | `frontend/src/app/router.tsx` | Public pages versus staff workspace routes |
| 2 | `frontend/src/components/PublicBooking/PublicBooking.tsx` | Selection state, staff/date selection and availability request |
| 3 | `frontend/src/components/BookingForm/BookingForm.tsx` | Contact form and POST to create booking |
| 4 | `frontend/src/lib/api.ts` | `/api` fetch wrapper, JSON, cookies, errors/session notifications |
| 5 | `backend/src/server.ts`, `app/routes.ts` | Dependency/config setup and feature-router composition |
| 6 | `backend/src/modules/appointments/appointments.routes.ts` | Zod boundary and thin request handlers |
| 7 | `backend/src/modules/appointments/appointments.service.ts` | `book`, transaction, policy, snapshots and hold |
| 8 | `backend/src/modules/availability/availability.engine.ts` | `planAt`, `calculateAvailability`, `isBlocking` |
| 9 | `backend/src/modules/scheduling/coverage.ts`, `coordination.ts` | Overlaps, coverage, ordered locks and fresh database time |
| 10 | `backend/src/modules/payments/payments.service.ts` | Checkout, verified capture, confirmation, reconciliation, receipts |
| 11 | `backend/src/modules/appointments/appointment-changes.service.ts` | `change`, `cancel`, `checkIn`, no-show marking/correction |
| 12 | `backend/src/modules/settlement/settlement.service.ts`, `commissions.ts` | Outcomes, full settlement, closure and fee allocation |
| 13 | `backend/prisma/schema.prisma`, `backend/prisma/migrations/` | Relationships, snapshots, checks and unique identities |
| 14 | `backend/src/hold-worker.ts`, `notification-worker.ts` | Background expiration/no-show/provider cleanup and delivery |

Code vocabulary:

- `async`/`await`: wait for asynchronous work without treating it as a finished result.
- `create...Service(prisma, config)`: factory receiving dependencies; useful for configuration and tests.
- `schema.parse(input)`: runtime validation; invalid input throws before business mutation.
- `tx`: the transaction-scoped database client; related writes must use it to participate in the same transaction.
- `select`: choose returned database fields. `include`: load related records.
- `throw new ApiError(...)`: stop the operation with a controlled public failure.
- `map` transforms items; `filter` selects items; `reduce` combines items such as totals.
- `??` uses the fallback only for null/undefined, preserving an explicit zero-minute buffer.

Explain a booking function in this order: validate → lock → read fresh facts → calculate → persist snapshots → return. You do not need to recite every import.

## 15. Likely panel questions and concise answers

**What is the main contribution?**
“An integrated workflow connecting qualified-staff scheduling, fee-confirmed reservation, arrival, service settlement, receipts and commissions, with safeguards against schedule conflicts and inconsistent financial records.” Describe this as your system's integration; do not claim worldwide novelty without research evidence.

**Why PostgreSQL? Why Prisma?**
“The data has strong relationships and multi-record consistency requirements. PostgreSQL provides transactions, constraints, exact numeric types and locks. Prisma provides typed access and transaction APIs; specialized locking/checks use SQL where needed.”

**What is the main algorithm?**
“Dynamic interval-based availability with full-duration and buffer checks, sequential service planning, and deterministic least-reserved-workload staff selection. Transactional revalidation protects that result against concurrent requests.”

**Why not store all time slots?**
“Availability depends on current schedules, durations, buffers, closures and live reservations. Calculating it avoids treating stale generated slots as authoritative.”

**Why store price snapshots?**
“A later catalog change must not rewrite the agreed price or historical commission basis of an existing booking.”

**What if payment succeeds but the browser closes?**
“The browser is not the authority. Verified server-side provider processing records the payment. If the hold is still valid it can confirm; otherwise it records success for reconciliation.”

**What if payment is received after expiry?**
“We preserve the successful financial transaction and flag it for review, but do not restore released staff time or displace another booking.”

**Why can two customers book the same clock time?**
“Time is reserved per assigned stylist and service interval. Different qualified free stylists can handle different customers simultaneously.”

**Does check-in mean the service was performed?**
“No. Arrival, service outcome, payment and completion are separate facts with separate validation.”

**Why is a completed appointment still unavailable for a short time?**
“Its remaining reserved buffer still protects staff preparation/cleanup time.”

**Can an Admin bypass all restrictions?**
“No. Admin authorization permits actions, but services still enforce scheduling and financial integrity rules.”

**How does the chatbot affect booking accuracy?**
“It provides guidance and recommendations. Authoritative availability and writes stay in deterministic backend services.”

**What if a notification provider is unavailable?**
“The booking transaction can commit its notification event. The worker retries eligible failures; provider acceptance and actual receipt are distinguished.”

**What are the limitations?**
“The MVP has fixed appointment fees, sequential services, full manual final settlement, and no stylist accounts. Production/provider/device acceptance and broader load evidence must be stated according to what we actually verified.”

**How did you test the system?**
“We separate pure business-rule tests, API/security tests, database integration/concurrency tests and browser acceptance. Passing unit tests alone does not prove live payment delivery or full deployment readiness.” Give the real date, environment and result you can demonstrate.

## 16. Documentation conflicts and claims to avoid

Some older documents describe earlier phases. In the inspected code:

- Staff login uses independent usernames, although an older architecture passage says email/password.
- Admin and Cashier can collect a positive service payment; no-service closure is Admin-only. Older Phase 8 descriptions differ.
- Saved outcomes cannot be edited by either role; older passages mention Admin correction.
- Audit logging/viewing was removed from the MVP. Legacy `AuditLog` schema/history exists, but do not claim current audit-event recording. Arrival/completion actor fields and reschedule/financial histories are separate.
- The implemented sequential planner does not perform recursive backtracking, despite the algorithm report's conceptual discussion.
- Historical test counts and acceptance notes are dated evidence. Some acceptance-backlog entries still refer to removed audit behavior or older chatbot modes.

These are preparation notes, not permission to silently redefine business rules. If asked about a discrepancy, distinguish the intended specification, later approved changes, current implementation and remaining documentation maintenance.

Do not claim deployment, real provider delivery, physical printer acceptance, a refund workflow, penetration testing, statistical user satisfaction, or production-scale performance unless you have corresponding evidence.

## 17. Tonight's rehearsal plan

| Time | Activity | You are ready when… |
| --- | --- | --- |
| 25 min | Explain actors, architecture and entities | You can distinguish User/Staff and Appointment/AppointmentService without notes |
| 40 min | Trace one booking in the code | You can show request → validation → locks → plan → snapshots → hold |
| 30 min | Practice overlap, buffer, fee and commission examples | You can calculate the example and explain every boundary |
| 30 min | Rehearse payment, arrival and settlement | You can explain duplicate/late payments, outcome locking and closure |
| 25 min | Rehearse changes, no-show/recovery and security | You can distinguish reschedule, replacement and correction |
| 30 min | Run the demo with a teammate asking panel questions | Everyone can explain their module and the whole system overview |

Use a known demo/test environment. Before the defense verify the correct Node 24 runtime, database connectivity, applied migrations, API/frontend, both required workers, and the chosen test/provider configuration. Never depend on an unverified external provider for the only demonstration path.

Suggested demo narrative: show active catalog → select qualified staff → inspect time availability → book → demonstrate configured fee confirmation → view private appointment → staff check-in → save outcomes → collect full service payment → receipt → Admin commissions/report. Use separate prepared records for rescheduling, cancellation and no-show recovery; checked-in visits cannot use normal customer changes.

For an error demonstration, show an unavailable interval or a rejected invalid/stale action in the test environment, then explain why the rejection protects data.

Practice without looking: “A PHP 100 booking fee is paid, two services of PHP 300 and PHP 700 are performed, and their rates are 20% and 30%. Explain the reservation, final amount due, commission amounts, and records created.” Correct financial results: PHP 1,000 service payment; PHP 1,100 total collections; PHP 66 and PHP 231 commissions.

## 18. Verification performed for this guide

On October 22, 2026, using the locally bundled Node v24.19.0:

- Backend unit/API suite: 140 tests passed. Localhost access was needed for test HTTP/SMTP servers; the sandboxed attempt could not bind them.
- Frontend suite: 50 tests passed.
- No database integration suite, browser demonstration, live provider delivery or production deployment was performed during this preparation. Existing verification documents are separate historical evidence.
- Only this study guide was added; application logic and business rules were not changed.

The shell initially selected Node v22.23.2, which cannot run the frontend script's `--test-isolation=none` option. Use the project's required Node 24 runtime when rehearsing. The successful commands used the bundled Node executable with backend `--import tsx --test tests/*.test.ts` and frontend `--experimental-strip-types --test --test-isolation=none tests/*.test.ts`.
