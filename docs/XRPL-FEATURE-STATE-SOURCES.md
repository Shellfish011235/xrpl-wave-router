# XRPL Feature-State Source Hierarchy — Swell Prep

Prepared: 2026-10-05
Status: planning/documentation only; no judged resolver implementation

## Goal
Define the evidence hierarchy the event-built resolver should follow so it does not confuse proposal status, server support, voting status, and actual activation.

## Primary runtime source
Use XRPL `feature` public API against the selected network/server.

What it can prove:
- amendment ID / short name known by that server;
- `enabled`: whether the amendment is enabled in the latest ledger visible to that server;
- `supported`: whether that server knows how to apply the amendment.

Critical rule:
- `supported: true` does NOT mean `enabled: true`.
- `enabled: true` with `supported: false` is a server-safety problem and must fail closed.

## Server health corroboration
Use `server_info` or `server_state` to capture:
- server build version;
- validated ledger context when available;
- `amendment_blocked` when present.

If the selected server is amendment blocked, the control plane must not treat its output as sufficient execution evidence.

## Canonical documentation source
Use XRPL.org Known Amendments for:
- canonical amendment names/descriptions;
- whether an item is enabled, open for voting, or in development;
- links to related XLS specifications and release notes.

This documentation is explanatory evidence, not a substitute for runtime `feature.enabled` when deciding whether a capability exists on the selected ledger.

## Voting / majority semantics
XRPL amendment activation requires more than 80% trusted-validator support maintained for two weeks. Support can fall below threshold and restart the window.

Therefore the event state model should distinguish:
- `PROPOSED` / in development;
- `VOTING` / available for validator voting but not in a current majority window;
- `MAJORITY_WINDOW` / threshold reached but not yet activated;
- `ENABLED` / runtime `feature.enabled === true`;
- `UNSUPPORTED` / selected server does not know the feature;
- `DISABLED` / known but not enabled and intentionally unavailable for current execution;
- `UNKNOWN` / evidence missing, stale, contradictory, or server unhealthy.

## Decision mapping
- `ENABLED` + healthy server + required policy authorization → may continue to route/policy checks.
- `MAJORITY_WINDOW`, `VOTING`, `PROPOSED` → simulation only for actions that require the feature.
- `UNSUPPORTED` → deny execution; optionally simulate with explicit label if a safe fixture/model exists.
- `UNKNOWN` → fail closed for financial execution.
- amendment-blocked server → fail closed; switch to another trusted source/server before making a runtime claim.

## Evidence fields to persist
- network identifier;
- server endpoint label (not secrets);
- server build version;
- validated ledger index/hash if available;
- amendment ID;
- amendment short name;
- `enabled`;
- `supported`;
- normalized lifecycle state;
- source type (`feature`, `server_info`, `known_amendments`, fixture);
- retrieval timestamp;
- fixture flag / simulation flag;
- conflict notes.

## Event fallback
If live network access fails during judging:
1. show the last verified live state with timestamp;
2. switch visibly to a labeled fixture;
3. never present fixture state as live XRPL state;
4. keep the decision engine deterministic so judges can still reproduce ALLOW / DENY / SIMULATION_ONLY behavior.
