# Wave Router XRPL Feature-State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hackathon-only read-only XRPL feature-state service to Wave Router so Shellfish can reason about what the target ledger supports without granting execution authority.

**Architecture:** Wave Router reports ledger capability state and continues to quote routes. It never converts feature availability or route quality into authorization. Shellfish consumes this data and owns the allow/deny/simulation decision.

**Tech Stack:** TypeScript 5.8, Node.js, Express 5, xrpl.js 4.3, Node test runner.

**Spec:** `docs/SWELL-HACKATHON-2026.md` and Shellfish design spec.

## Global Constraints
- Read-only XRPL calls only.
- No private key, wallet signing, transaction submission, or Mainnet execution authority.
- Unknown or failed state resolution must be represented explicitly.
- Existing `/quote` behavior remains backward compatible.

## Review Focus
- RPC/network failure must return `UNKNOWN`, not enabled.
- Feature identifiers must be canonical and stable.
- Stale fixture/cache data must expose `lastVerifiedAt`.
- Unsupported proposed features must not appear enabled.
- New endpoint must not weaken `/jobs` assurance checks.

---

### Task 1: XRPL Feature-State Types
**Files:**
- Modify: `src/types/domain.ts`
- Create: `test/xrpl-feature-state.test.ts`

- [ ] Write failing tests for allowed state enum and required provenance fields.
- [ ] Add `XrplFeatureState` and `XrplFeatureStateRecord` interfaces.
- [ ] Run `npm test` and verify PASS.
- [ ] Commit: `feat: define XRPL feature-state types`.

### Task 2: Resolver Service
**Files:**
- Create: `src/services/xrplFeatureState.ts`
- Modify: `test/xrpl-feature-state.test.ts`

**Interfaces:**
- Produces: `resolveXrplFeatureStates(client, featureIds, now?) -> Promise<XrplFeatureStateRecord[]>`.

- [ ] Write failing tests for enabled, majority/voting fixture, unsupported, RPC error => `UNKNOWN`, and timestamp/source preservation.
- [ ] Implement minimal read-only resolver using XRPL amendment/feature data available from the target network plus explicit fixtures for proposal-only demo dependencies.
- [ ] Verify tests pass.
- [ ] Commit: `feat: resolve XRPL feature states`.

### Task 3: Read-Only API Endpoint
**Files:**
- Modify: `src/index.ts`
- Modify: `test/xrpl-feature-state.test.ts`

**Interfaces:**
- `GET /xrpl/features?network=testnet&features=a,b` returns state records only.

- [ ] Write failing endpoint tests for success, malformed query, unsupported network, and resolver failure.
- [ ] Add endpoint without touching `/jobs` authorization semantics.
- [ ] Run `npm run typecheck && npm test`.
- [ ] Commit: `feat: expose read-only XRPL feature-state endpoint`.

### Task 4: Hackathon Fixtures + Documentation
**Files:**
- Create: `test/fixtures/xrpl-feature-states.json`
- Modify: `docs/SWELL-HACKATHON-2026.md`

- [ ] Add deterministic fixtures for the exact allow/deny/simulation scenarios.
- [ ] Document live-vs-fixture behavior and provenance labeling.
- [ ] Run `npm run typecheck && npm test`.
- [ ] Commit: `docs: add Swell XRPL feature-state fixtures`.
