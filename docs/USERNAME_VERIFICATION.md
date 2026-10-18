# Independent staff usernames — 2026-10-19

Admin and Cashier login and recovery now use the required unique User.username.
Accounts exposes username independently from email. Seed and first-Admin bootstrap
accept explicit usernames. Existing accounts retain lowercase email local parts
when migrated. Duplicate legacy names stop the transaction without partial changes.
No application database was migrated, reset or seeded during verification.

Validation:

- Backend schema validation, client generation, type checking and build passed.
- All 131 backend unit/API tests passed with local HTTP socket access.
- Frontend build and all 46 frontend tests passed (existing bundler warnings).
- 23 database/auth/recovery/migration tests passed against disposable databases.
- The first-Admin bootstrap integration test passed separately.
- git diff --check passed.

A broader release acceptance run passed bootstrap but failed at its existing
Admin settlement expectation: release.test.ts expects POST /settlement/pay by an
Admin to return 403, while the current settlement service authorizes that action
and returns 200. Settlement authorization was not changed in this task.

Apply checked-in migrations and regenerate the client before restarting the
updated application. No reset or reseed is required. Existing recovery codes need
to be requested again after deployment because they now bind to username too.
