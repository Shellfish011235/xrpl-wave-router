# Arithmetic / Invariant Audit — 2026-10-12

Status: active defensive review. No exploit claims in this document.

## Goal

Find numeric and state-integrity bug families similar to the 2026 XRPL overflow disclosure without assuming that any candidate is exploitable.

Classification:

- SAFE-BY-PROOF — range or protocol constraints make the operation safe.
- GUARDED — explicit overflow/underflow/precision handling exists.
- NEEDS-TEST — safety depends on a transaction/state invariant that should be proven or fuzzed.
- CONFIRMED — independently reproduced defect with bounded impact evidence.

## Current candidates

### 1. MPT invariant signed accumulators — NEEDS-TEST

Observed pattern:

- per-value MPT amounts are unsigned;
- individual conversion is clamped before signed conversion;
- invariant state accumulates deltas in signed 64-bit values;
- cumulative addition/subtraction should be tested at transaction maxima and amendment boundaries.

Required test:

- construct the maximum legal number of same-issuance balance changes in one transaction;
- test INT64_MAX / INT64_MAX-1 / zero / one boundaries;
- compare state transition and invariant arithmetic independently.

### 2. PaymentSandbox nested signed deltas — NEEDS-TEST

Observed pattern:

- signed 64-bit balance/delta tracking across nested payment sandboxes;
- historically relevant because payment accounting is where the 2026 overflow family surfaced.

Required test:

- nested sandbox accumulation at extreme legal XRP and issued-currency values;
- compare parent/child application order;
- verify no wrap, truncation, or same-width invariant blind spot.

### 3. Vault / MPT signed conversion boundaries — NEEDS-TEST

Observed pattern:

- unsigned MPT balances converted to signed deltas in vault invariant/accounting paths.

Required test:

- max token amount, max-1, 1, 0;
- withdraw/deposit/create/delete transitions;
- amendment transition behavior;
- compare public balance, share accounting, and invariant view.

### 4. Sponsorship owner counters — GUARDED / regression target

Observed pattern:

- signed deltas coexist with unsigned owner-count fields;
- current code explicitly discusses overflow rejection and underflow handling.

Required regression:

- overflow attempt;
- underflow attempt;
- field-absence / zero normalization;
- invariant and transactor must agree.

### 5. AMM precision asymmetry — GUARDED / regression target

Observed pattern:

- known tests cover XRP precision leaving a tiny remainder on the paired asset;
- tiny MPT deposits can round to zero.

Required regression:

- estimator vs executor consistency;
- XRP/IOU, XRP/MPT, IOU/MPT pairs;
- exact-drain, one-unit remainder, and rounded-to-zero cases;
- pre/post amendment fixtures.

### 6. Pathfinding result integrity — IMPLEMENTING

New read-only `PathInvariantVerifier` checks:

- destination account binding;
- destination amount binding;
- alternatives array shape;
- positive, syntactically valid source amounts without JavaScript Number coercion;
- impossible XRP source amount above total-supply drops;
- path/step structural validity;
- duplicate alternatives.

This verifier is deliberately observational. It does not sign, submit, or authorize transactions.

## Cross-cutting bug pattern

The main pattern to test is not just a raw `int64_t` occurrence:

1. legal individual values enter a transaction;
2. multiple values are converted or accumulated;
3. cumulative arithmetic exceeds the representation or loses precision;
4. the invariant/check recomputes using the same representation or assumption;
5. both execution and verification agree on the same wrong result.

The test oracle must therefore use independent arithmetic where practical (for example arbitrary-precision integers/decimals) rather than reproducing the implementation's width and rounding rules.

## Next tests

1. Integrate `PathInvariantVerifier` into the read-only XRPL adapter response.
2. Add fixtures for direct paths, multi-hop paths, duplicate strands, issued-currency exponential values, and malformed remote responses.
3. Build an arbitrary-precision arithmetic oracle for MPT/XRP deltas.
4. Add property/fuzz tests around boundary values and amendment gates.
5. Keep all candidates tagged NEEDS-TEST until independently reproduced.
