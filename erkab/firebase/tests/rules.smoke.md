# Firestore rules smoke checklist (owner)

These tests should be automated with `@firebase/rules-unit-testing` after you connect a project.

## Denied (must fail)

1. Unauthenticated read of `patients/{any}`
2. Patient A read of `patients/{patientB}`
3. Applicant update of own application setting `status: "ACTIVE"`
4. Applicant update of `trustPassport.overall` to `verified`
5. Applicant update of `applicationNotes`
6. Client `create` on `appointments`
7. Client `create` on `auditLogs`
8. Client `write` on `psychiatristPublic`
9. User self-update of `users/{uid}.role` to `ADMIN`
10. Unauthenticated read of `psychiatristApplications`

## Allowed (must succeed)

1. Public read of `psychiatristPublic/{id}` for ACTIVE profiles
2. Owner read/write of own `patients/{uid}`
3. Owner create `psychiatristApplications` with `status: DRAFT` and unverified passport
4. Owner update application DRAFT → UNDER_REVIEW without changing trustPassport
5. Admin read of `auditLogs` (with ADMIN claim)
6. Party read of own appointments

## Emulator command (when configured)

```bash
firebase emulators:exec --only firestore,auth "npx vitest run firebase/tests"
```

Not executed in the pre-Firebase delivery environment.
