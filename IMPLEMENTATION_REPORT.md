# Change log — V5.6 Spark-only

## A. Admin authorization
- AuthContext uses Firestore `users.role` (Console-set ADMIN), not custom claims
- Storage rules use same Firestore role via `firestore.get`
- Clients cannot write role/status

## B. Booking
- Status model: patient creates **REQUESTED** only
- Rules reject PENDING_PAYMENT/CONFIRMED on create
- Slot create requires own patientId; no slot updates
- Cancel: patient only REQUESTED→CANCELLED; provider/admin REQUESTED→CONFIRMED|CANCELLED

## C. Payments
- `payment.ts`: Firebase mode returns NOT_CONFIGURED; no patient payment writes
- Rules: payments create/update admin only

## D. Verification
- “Record checks (local)” gated to `mode === 'local'` only

## Guarantees tested in code design
- Self-promotion blocked by rules (role immutable for clients)
- Self-approval blocked (trustPassport frozen for applicants; public write admin only)
- Patient cannot mark paid
