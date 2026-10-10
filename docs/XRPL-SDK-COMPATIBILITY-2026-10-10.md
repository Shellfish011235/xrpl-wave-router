# XRPL SDK Compatibility Check — 2026-10-10

Purpose: pre-event infrastructure/tooling compatibility only. This does not implement the judged hackathon Batch application.

## Verified local state
- Branch: `xrpl-sdk53-compat-20261010`
- Base: `b54f532`
- Upgraded `xrpl` from installed 4.6.0 / manifest `^4.3.0` to `^5.3.0`.
- `npm run typecheck`: PASS.
- `npm test`: 79 passed, 0 failed.
- `npm audit --omit=dev`: 0 vulnerabilities after transitive `proxy-addr` update to 2.0.8.
- Local Node: v24.13.0.
- CI uses Node 20; xrpl.js 5.x crypto dependencies require Node >=20.19, so CI should continue resolving a current Node 20 release or be pinned to a sufficiently new 20.x patch.

## Batch state
`BatchV1_1` and `fixBatchV1_2` enabled on XRPL Mainnet on 2026-10-09. `fixBatchV1_2` requires canonical `RawTransaction` wrappers for inner transactions.

xrpl.js 5.3.0 supports Batch and validates the canonical `RawTransactions: [{ RawTransaction: ... }]` shape.

## Known stable-SDK limitation
xrpl.js 5.3.0 still rejects `LastLedgerSequence` on inner Batch transactions. Upstream unreleased history records a fix to allow it and match rippled.

Until a stable xrpl.js release containing that fix is adopted and tested:
- Do not set `LastLedgerSequence` on inner Batch transactions in Wave Router demo/tooling.
- Treat the outer Batch transaction's ledger bounds separately.
- Re-check current stable xrpl.js and run this compatibility gate before the Oct. 24 event branch is frozen.

## Authority boundary
SDK support and route construction do not grant signing/submission authority. Existing Wave/Shellfish authorization, no-custody and Mainnet restrictions remain unchanged.

## Event-day recheck
1. Current stable xrpl.js version and HISTORY.
2. Live XRPL amendment state.
3. Current xrpld advisory/release notes.
4. Clean `npm ci`, typecheck, tests and production audit.
5. Batch inner-transaction compatibility, especially `LastLedgerSequence`.
