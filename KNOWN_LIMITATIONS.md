# Erkab Psychiatry — Complete limitations (V5.7.3)

This document states what is **not** guaranteed, **not** implemented, or **not** verified, so the project is not misread as production-ready.

---

## 1. Install / build verification (delivery environment)

**Status:** Not reliably completed in the automated delivery sandbox.

| Check | Typical owner command | Delivery environment |
|-------|----------------------|----------------------|
| Clean install | `cd erkab && npm ci` | Often stalls or fails with filesystem I/O errors |
| Typecheck | `npm run lint` (`tsc --noEmit`) | Depends on successful install |
| Unit tests | `npm test` | Depends on successful install |
| Production build | `npm run build` | Depends on successful install |

**What you must do**

```bash
cd erkab
npm ci
npm run lint
npm test
npm run build
```

Only after these pass on **your** machine should you point a real Firebase project at the app.

**Why it matters:** Without a green local build, TypeScript errors, missing exports, or broken routes may still exist even if the source was edited carefully.

---

## 2. Firestore Security Rules / Emulator tests

**Status:** Rules are present in `firebase/firestore.rules` and designed for Spark (Auth + Firestore only). They have **not** been executed against the Firebase Emulator in this delivery environment.

**What is enforced by design (must still be proven on Emulator)**

- Clients cannot set `users.role` to `ADMIN`
- Applicants cannot write `review` or self-approve
- Public profiles cannot contain `driveEvidenceUrl` / review notes
- Appointments require a matching open `availability` slot
- Patients cannot create payment records
- Slot claim is `open` → `booked` with fixed provider/times; release only when `appointmentId` matches

**What you must run**

```bash
# After firebase-tools login and project select
firebase emulators:start --only firestore,auth
# In another terminal: rules unit tests if you add @firebase/rules-unit-testing
```

Until Emulator (or live test project) checks pass, treat authorization as **implemented in source, unverified in runtime**.

---

## 3. Payment — explicitly unconfigured

**Status:** No payment gateway is integrated.

| Behavior | Detail |
|----------|--------|
| Patient `startPayment()` | Returns `NOT_CONFIGURED` in Firebase mode |
| Client payment writes | Denied by Firestore rules (admin-only) |
| Appointment after book | Stays `REQUESTED`, not paid/confirmed |
| Card data | Never collected or stored |

**Not included:** Stripe/PayPal/M-Pesa capture, webhooks, refunds, payouts, receipts, or “paid” UI states that imply money moved.

**Later (optional):** Add a real provider behind a server you control; do not enable patient self-mark-paid in rules.

---

## 4. Video consultations — explicitly unconfigured

**Status:** No Zoom, Google Meet, or WebRTC provider is wired.

| Behavior | Detail |
|----------|--------|
| Meeting create | Throws / returns not-configured |
| Fake meeting links | Not generated |
| Session “completed” | Not inferred from a video provider |

Booking and messaging must not claim a live session exists.

---

## 5. Google Drive credential review — manual only

**Status:** Manual human workflow by design (Spark-compatible, no Drive API / no Storage).

| Step | Who | Automated? |
|------|-----|------------|
| Applicant pastes HTTPS Drive/Docs folder URL | Applicant | URL host validation only |
| Share folder with verification Google account | Applicant | Manual in Google Drive UI |
| Open link and read documents | Admin | Manual |
| Tick evidence categories, notes, approve/reject | Admin | App records decision; no auto-verify |
| Prove Drive permissions or file authenticity | — | **Not possible** in this app without a Drive API integration |

**Configurable:** `VITE_VERIFICATION_GOOGLE_ACCOUNT` (display/instruction only).

**Privacy:** `driveEvidenceUrl` stays on private applications; must never appear on `psychiatristPublic`.

**If evidence changes after approval:** Application should return to pending review and public profile must not stay bookable (source aims for this; verify on a test project).

---

## 6. Booking concurrency (honest guarantee)

| Guaranteed | Not guaranteed |
|------------|----------------|
| Same published `availability` slot cannot be booked twice if transaction + rules hold | Global prevention of all possible overlapping free-form time ranges outside published slots |
| Patient can only create `REQUESTED` for self | Multi-region extreme race testing |

Cancellation releases a slot only if it is still `booked` with the **same** `appointmentId`.

---

## 7. First admin (Spark)

No Cloud Functions / custom claims required for bootstrap.

1. Register normally.  
2. Firebase Console → Firestore → `users/{uid}` → set `role` to `ADMIN`.  
3. Sign out and sign in.

Clients cannot self-assign `ADMIN` via the app (rules).

---

## 8. What “complete” does **not** mean

This project is **not**:

- Certified for clinical, legal, or regulatory use
- A substitute for licensed credential verification processes
- Guaranteed free of remaining bugs until your `npm ci` / test / build / Emulator runs succeed
- Connected to your Firebase project (you connect it)

---

## Owner checklist before real users

1. [ ] `npm ci && npm run lint && npm test && npm run build` pass  
2. [ ] Deploy `firestore.rules` + indexes to a **test** project  
3. [ ] Emulator or test-project checks: self-promote denied, self-approve denied, book open slot, cancel releases slot  
4. [ ] First admin via Console  
5. [ ] Verification Google account created; `VITE_VERIFICATION_GOOGLE_ACCOUNT` set  
6. [ ] Payment and video remain off until you integrate real providers  
7. [ ] Legal/privacy review of Drive evidence handling and retention  

