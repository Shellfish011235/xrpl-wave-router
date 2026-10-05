# Ripple Swell XRPL Hackathon 2026 — Wave Router Role

Status: pre-event design note; no judged feature implementation yet.

## Project
**XRPL Control Plane** — amendment-aware authorization and preflight infrastructure for autonomous finance.

Primary track: Protocol Innovation.
Agentic Finance is the use case.

## Wave Router's pre-existing role
Wave Router already provides:
- capability/provider routing;
- quote and route selection;
- integrity-bound route receipts;
- signed execution-grant verification;
- expiry, replay, cost, provider, capability and receipt binding;
- XRPL pathfinding inspection;
- non-custodial / no-unilateral-signing boundaries.

These capabilities are prior work and must be disclosed as such.

## New hackathon integration
During the 36-hour event, the new control-plane feature will consume a Wave Router quote/route as one input to an external authorization decision. The route never grants its own authority.

Expected event flow:

`objective -> required capabilities -> XRPL feature state -> policy check -> Wave Router quote/route -> ALLOW_PLAN / DENY / SIMULATION_ONLY -> receipt`

## Boundaries
- No automatic Mainnet settlement.
- No wallet-key custody.
- No payment authority inferred from route quality.
- Unknown or unavailable ledger dependencies fail closed or remain simulation-only.
- Existing Wave Router code is not judged work; only the new event integration and control-plane feature may be submitted as hackathon implementation.

Canonical design spec lives in the Shellfish repo:
`docs/superpowers/specs/2026-10-05-ripple-swell-xrpl-control-plane-design.md`
