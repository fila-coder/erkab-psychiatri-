# Erkab Therapy

Book verified therapists for secure video consultations. React + Vite +
TypeScript, Firebase Auth, and Cloud Firestore — with one deliberate
difference from a standard Firebase app: **all Firestore access goes
through the plain REST API**, never through the Firestore client SDK.

## Why REST instead of the Firestore SDK?

In the previous codebase, the Firestore client SDK's `getDoc` /
`setDoc` calls hung for 15+ seconds with no error on real phones,
while Firebase Auth worked fine. Auth uses plain HTTPS; the SDK uses a
streaming connection that never answers in this deployment. So this
rebuild talks to Firestore the same way Auth does — plain `fetch()`
requests with the signed-in user's ID token — against
`https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/...`.
There is no `firebase/firestore` import anywhere in `src/`, and no
`initializeFirestore` / `getFirestore` anywhere. See
`src/lib/firestoreRest.ts`.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Firebase web config values
npm run dev            # local development server
npm run build          # type-check + production build
npm run preview        # serve the production build locally
```

## Firebase config

Copy `.env.example` to `.env` and fill in the values from the Firebase
Console (Project settings > Your apps > Web app):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The app is Firebase-only. There is no local/demo mode and no
`VITE_DATA_MODE` fallback — do not add one.

## Deploy on Vercel

1. Push this folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Erkab Therapy — fresh rebuild (Firestore REST)"
   git branch -M main
   git remote add origin https://github.com/<your-account>/<your-repo>.git
   git push -u origin main
   ```
2. In Vercel, import the repository.
3. Under Settings > Environment Variables, set the five
   `VITE_FIREBASE_*` variables above for Production, Preview and
   Development.
4. Deploy. The build command is `npm run build` and the output
   directory is `dist`.

## Firestore rules

`firestore.rules` in the project root matches the collections the app
writes. Publish it in the Firebase Console (Firestore > Rules >
Publish):

- `users/{uid}` — a user reads their own doc; creates only their own
  doc with role `PATIENT` or `PSYCHIATRIST` and status `active`.
  Roles are never changed by users themselves.
- `psychiatristPublic/{uid}` — readable by anyone, writable only by
  admin. Only approved (ACTIVE) therapists appear on `/find`.
- `appointments/{id}` — readable by its patient, provider or admin.
- `supportTickets/{id}`, `auditLogs/{id}` — see the rules file.

Admin accounts are created directly in the Firebase Console: create
the Auth user, then a `users/{uid}` document with `role: 'ADMIN'`.
Never create an admin by signing up through the site.

## How sign-up / sign-in work (the part that used to break)

- The role lives **only** in the `users/{uid}` Firestore document. It
  is never guessed.
- **Sign-up:** the Auth user is created, then the profile document is
  written immediately via REST — no read before the write, ever. The
  chosen role is saved in localStorage as
  `erkab-pending-role:{uid}` first, and cleared on success. The write
  is then verified with a REST read; if that read fails, the write is
  trusted and sign-up proceeds.
- **Sign-in:** the profile is read via REST. If it is missing and a
  pending role is saved for that uid, the document is repaired with
  that known role. If there is no document and no known role, sign-in
  shows a clear on-screen error and does **not** create a PATIENT
  document.
- Routing by role: patient → `/patient`, therapist → `/provider`,
  admin → `/admin`. `/account` redirects to the right portal.
- Every failure shows its exact message on screen. No silent
  redirects, no fake "saved" states.

## Booking and video calls

Therapists publish availability slots in the provider portal. Patients
request an open slot (status `REQUESTED`); the therapist confirms it
(`CONFIRMED`) or cancels it. Each confirmed appointment gets a Jitsi
room named `erkab-{appointmentId}`; both sides see a "Join video
call" button linking to `https://meet.jit.si/erkab-{appointmentId}`.
No Jitsi SDK or iframe is used — a plain link is the reliable path.

## What is intentionally not here

- No payment integration (per the client's need — that is the only
  integration still to come).
- No demo accounts, no fake data, no invented testimonials or pricing.
- Legal pages (`/terms`, `/privacy`, `/cancellation-policy`) are
  marked "Draft — not a legal document. Final terms must be
  counsel-reviewed."
