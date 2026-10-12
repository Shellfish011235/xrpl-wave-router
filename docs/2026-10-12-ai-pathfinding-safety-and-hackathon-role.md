# Wave Router — 2026-10-12 Hackathon Role

## Current role
Wave Router is **supporting infrastructure**, not the whole hackathon product.

The current architecture is:

`persistent knowledge brain → AI plan → permission/capability checks → Wave Router candidate paths → PathInvariantVerifier → Shellfish assurance/policy → bounded XRPL action → receipt → brain update`

## What the router is allowed to do
- generate or rank candidate routes;
- compare price, latency, liquidity, quality, privacy, and availability;
- expose settlement/action path structure;
- return a canonical route object and route receipt;
- remain simulation/quote-only when required state or authority is missing.

## What the router must not decide by itself
- whether value is conserved;
- whether fees/qualities were applied correctly;
- whether an issuer substitution is acceptable;
- whether trust/capacity limits are safe;
- whether delegated authority is sufficient;
- whether Mainnet or signing authority exists;
- whether execution is permitted.

Those decisions belong to deterministic verification and Shellfish policy/authority boundaries.

## PathInvariantVerifier requirement
Historical XRPL payment-path bugs are now direct regression inputs for the router safety boundary.

Primary references live in:
`Shellfish011235/xrpl-xahau-native-supply-forensics/investigations/ledger-32570-path-forensics/`

Required pre-execution checks include:
- canonical route normalization + stable route hash;
- exact asset + issuer identity per edge;
- transfer-fee / quality / spread / slippage annotation;
- capacity safety margin;
- cycle and repeated-role detection;
- stale-state invalidation;
- forward/reference simulation agreement;
- route/grant/receipt binding;
- post-execution reconciliation.

## Hackathon integration
The judged demo should use Wave Router as prior-work infrastructure. New event-window logic should sit above/around it and may include:
- current amendment/feature-state resolver;
- Permissioned Domain / Credential / PermissionDelegation eligibility checks;
- lending/vault scenario adapter;
- PathInvariantVerifier integration;
- `ALLOW_PLAN / DENY / SIMULATION_ONLY / HUMAN_REVIEW` verdict;
- Control Room explanation and evidence receipt.

## Design rule
**Optimization happens only after safety.**

A cheaper or faster route never outranks a route whose semantics and authority can actually be proven.
