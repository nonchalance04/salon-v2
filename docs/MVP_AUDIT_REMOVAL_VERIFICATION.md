# MVP audit removal — 2026-10-18

The MVP no longer creates AuditLog entries or exposes audit reports. Removed
writes cover account/bootstrap operations, configuration, booking/expiration,
appointment changes/check-in/no-shows, payment/receipt flows and settlement.
The Admin audit card and audit report kind are removed. An authenticated Admin
request to `/api/reports/audit` now fails report-kind validation with HTTP 400.

The legacy Prisma model, database table, existing rows and migration history are
retained. No migration or historical-data deletion is needed. Domain records,
financial snapshots, reschedule history, actor fields, authorization, transaction
locks and notification outbox remain in place. Audit-only before/after details
and correction reasons are no longer recorded in a separate event.

Validation completed:

- Backend typecheck and production build passed.
- Backend unit/API suite: 120 passed.
- Full disposable PostgreSQL integration suite: 159 passed.
- Configuration integration rerun: 21 passed, including preservation of an existing
  legacy audit row during configuration changes.
- Frontend suite: 46 passed; production build passed with existing dependency
  directive and bundle-size warnings.
- Audit report rejection and no-write assertions passed. No-show marking and
  correction succeed when legacy audit inserts are blocked by database triggers.
- No runtime AuditLog access remains in backend or frontend source.
- `git diff --check` passed.

The local test PostgreSQL instance was started for disposable-database testing.
No production database was changed. Browser interaction was not repeated for the
removed report card; frontend compilation and source inspection verified it.

Earlier phase verification documents describe their original implementation;
this scope change supersedes their audit-related requirements.
