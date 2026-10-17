# Firebase Spark setup — V5.7

## Services used

- Authentication (Email/Password)
- Cloud Firestore + Rules + Indexes

## Not used

- Cloud Storage
- Cloud Functions
- Blaze (not required for core)

## First admin

1. Register in the app.
2. Firestore → `users` → your document → `role`: `ADMIN`.
3. Sign out and sign in.

## Verification Google account

1. Create a dedicated Google account for Erkab credential review.
2. Set `VITE_VERIFICATION_GOOGLE_ACCOUNT=that@email.com` in `.env`.
3. Applicants share Drive folders with that address (Viewer is enough).
4. Admins open links from the admin UI (private application data only).

## Deploy

```bash
cd erkab
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

`firebase.json` points at `firebase/firestore.rules` and indexes.
