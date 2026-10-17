# Audit Report — V5.6

## Build/test (delivery environment)

| Check | Result |
|-------|--------|
| npm ci / full test suite | Environment limited — **NOT fully verified here** |
| Emulator rules tests | **NOT RUN** |

Run locally: `cd erkab && npm ci && npm test && npm run build`

## Security guarantees (by design + rules)

| Attempt | Expected |
|---------|----------|
| User sets own role ADMIN | Denied by rules |
| Applicant sets ACTIVE / verified passport | Denied by rules |
| Patient creates CONFIRMED appointment | Denied by rules |
| Patient creates payment | Denied by rules |
| Non-owner reads other patient | Denied by rules |

## Remaining limitations
- Overlap of different start times under concurrent clients is best-effort
- Credential authenticity = human admin review on Spark
- No payment gateway / video
