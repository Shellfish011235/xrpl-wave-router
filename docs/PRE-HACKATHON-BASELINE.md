# Pre-Hackathon Baseline Disclosure — XRPL Wave Router

Date captured: 2026-10-05
Event: Ripple Swell XRP Ledger Hackathon 2026
Branch: `assurance-router-boundary-v1`
Baseline commit: `891bcadd037db51dadafcb1b82ef97e1421517d4`

## Purpose
This file records Wave Router capabilities that existed before the judged build window.

## Pre-existing capabilities
- Provider/capability filtering and weighted route scoring.
- Route receipts with integrity binding.
- HMAC-SHA256 execution grant verification.
- Grant expiry, nonce consumption and replay rejection.
- Task/provider/capability/receipt/cost-ceiling binding.
- In-memory reserve/post/void accounting.
- Read-only XRPL adapter and pathfinding inspection.
- Testnet/devnet unsigned transaction intent/draft and build-authorization boundaries.
- Open Payments sandbox boundary disabled for real payment execution.
- Explicit non-custodial project boundaries.

## Verified baseline
On 2026-10-05:
- `npm run typecheck` passed.
- `npm test` passed **79/79 tests**.
- `npm audit --omit=dev` reported **0 known production vulnerabilities**.

## Judged work reserved for the event
- New XRPL feature/amendment-state resolver used by Control Plane.
- Event-specific state normalization and dependency outputs.
- Integration contract that feeds ledger state into Shellfish control decisions.

## Boundary
Route quality and ledger capability must never create authorization by themselves.
