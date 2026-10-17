# Erkab Psychiatry V5.7.2 (Firebase Spark)

Auth + Firestore. No Storage. No Cloud Functions.

## Install

```bash
cp .env.example .env   # VITE_DATA_MODE=firebase + web config
npm ci
npm run dev
```

## Booking model

Providers publish **`availability`** documents (`status: open`).  
Patients book via a transaction that creates a **`REQUESTED`** appointment and sets the slot to **`booked`**.

## Google Drive verification

Applicants store a private Drive folder URL on their application.  
Admins open the link, record checks/notes, approve or reject.  
Drive URLs never go to public profiles.

## First admin

Firestore → `users/{uid}.role = "ADMIN"` → sign out/in.

## Scripts

`npm run lint` · `npm test` · `npm run build`
