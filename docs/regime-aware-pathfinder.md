# Regime-Aware Pathfinder

Status: planned architecture extension; observational first.

## Goal

Evolve the Wave Router from provider/path selection into a constrained monetary-graph router.

The router should not predict one asset price and execute from that prediction. It should consume bounded decision context from four separate layers, then search only the routes that remain acceptable.

```text
Regime state
  ↓
Liquidity graph
  ↓
Risk graph
  ↓
Settlement graph
  ↓
Wave Router / XRPL pathfinding
  ↓
Assurance grant validation
  ↓
Execution rail
```

## Separation of concerns

- Regime detector: describes operating conditions; no execution authority.
- Liquidity graph: availability, depth, slippage, capacity, reachable assets/venues.
- Risk graph: issuer/counterparty exposure, manipulation or stale-data flags, route-specific constraints.
- Settlement graph: rail availability, fees, latency, finality expectations, network constraints.
- Wave Router: ranks/constructs routes inside the permitted graph.
- Shellfish assurance: decides whether a proposed route may execute.

## Non-negotiable rule

A route score is never an authorization token.

The router must continue to reject execution without a valid assurance grant, regardless of route quality.

## First implementation target

Keep the first version observational:

- accept regime/liquidity/risk/settlement context
- produce explained route candidates
- expose why a route was included or excluded
- do not add autonomous signing or custody
- keep Testnet execution behind the existing assurance boundary
- never fall back to Mainnet automatically

## Suggested route object additions

A future route candidate may carry:

- regime_id / regime_confidence
- liquidity_score / liquidity_evidence
- risk_score / risk_reasons
- settlement_score / settlement_constraints
- pathfinder_result
- assurance_required: true

These fields are descriptive. They must not be interpreted as permission.

## Test cases

1. high-scoring route + missing assurance grant => reject
2. high liquidity + blocked risk edge => exclude route
3. acceptable risk + unavailable settlement rail => exclude route
4. regime mismatch => route de-prioritized or excluded according to policy
5. observational request => no side effect
6. valid Testnet rail + valid assurance grant => eligible for controlled execution

## Longer-term model

Agents may eventually become nodes in the monetary graph rather than passive observers. Their routing decisions can change liquidity and costs, so later agents may observe a different graph. The router should therefore support continuous re-evaluation without collapsing decision authority into the routing layer.
