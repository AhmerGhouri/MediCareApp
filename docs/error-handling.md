# Error handling

## Upcoming appointments backend contract

The sibling MediCareApp-API checkout now returns HTTP 200 with an empty collection
for nine list endpoints, including `{"appointments": []}`. Those backend edits
require deployment before live behavior changes. The owner explicitly deferred
the missing patient-ownership checks and authorization of the legacy
`/auth/reset-password` endpoint; this update is not a security sign-off.

The client accepts successful empty lists, null payloads and null appointments.
For compatibility it also treats the exact 403 detail or message
`No Upcoming Appointments found for this MR Number` as an empty list, only for
the upcoming-appointments operation. This case produces no error banner or error
diagnostics. It does not convert arbitrary 403 responses into empty data.
An appointments-specific 403 uses neutral Unavailable wording. Development-only
`[ApiDiagnostic]` entries record the operation, status, authentication-header
presence and profile-membership boolean. Only fixed allowlisted backend codes
and exact no-data message classifications are logged; all other response text is
redacted. These classifications are diagnostics only, not success conditions.

All user-facing errors use application-owned text. Never display an arbitrary
server message, Axios error, stack trace, URL, credential, or patient record.

## API and UI

- `src/errors/AppError.ts` normalizes unknown failures into typed errors with a
  safe title/message, optional HTTP status and safe validation-field messages.
- The Axios interceptor normalizes HTTP/network failures. Endpoint adapters
  reject malformed response envelopes instead of treating them as empty lists.
- Mutations call `reportError(error)` in `onError`; `ErrorProvider` presents a
  deduplicated popup. Keep local validation and success UI separate.
- Queries render `QueryError` with their error and refetch callback. Retain
  cached data on refresh failures and pass `hasData` to explain that it is stale.
- Read requests retry transient failures at most twice. Mutations never retry
  automatically; an uncertain booking asks the patient to check appointments.
- Authenticated 401 responses expire the current session once, clear query
  caches, and return to Login. Session versions discard old responses after a
  logout or new login. Login 401 means incorrect credentials, not session expiry.
- Missing password-recovery endpoints produce an error, never mock success or
  a hardcoded verification code.
- Recovery uses `/auth/request-otp` with mobile/email and
  `/auth/verify-otp-and-reset` with mobile/email/otp_code/new_password. The screen
  accepts six digits and verifies the code on final password submission, not on
  the intermediate Continue step. It no longer calls the legacy reset endpoint.

## Local and runtime failures

Use `reportError(error, context)` for user-triggered storage, permission,
download, or file-opening failures. Background notification failures use
`logError` without interrupting the user. Diagnostics contain only a category,
context and status in development; they never include the original error.

Report downloads verify HTTP status and a PDF signature before success. Opening
and sharing reports handle missing files and native-operation failures.
`AppErrorBoundary` provides recovery UI for React render failures; it does not
replace explicit handling of asynchronous operations or native crashes.

## Checks

Run `npx jest __tests__/errorHandling.test.ts __tests__/errorUI.test.tsx
__tests__/reportFiles.test.ts __tests__/passwordRecovery.test.tsx --runInBand --watchman=false` on one line.
These tests use mocked network/native boundaries, not the live hospital API.
Device QA should cover offline login, failed refresh with cached data, expired
sessions, denied permissions, unavailable PDF viewers, and uncertain bookings.
