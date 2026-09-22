# XRPL Wave Router

An experimental, assurance-gated routing and execution layer for AI/agent workloads, provider selection, and future XRPL-aware settlement paths.

The Wave Router separates **optimization** from **authorization**. It can rank a route based on cost, latency, quality, privacy, availability, and future monetary-graph context, but a good route is never permission to execute it.

> **Core rule:** route quality does not grant authority.

## Current status

This repository is still a research / developer-tooling project, but it has moved beyond the original unauthenticated AI-pathfinder proof of concept.

The current `assurance-router-boundary-v1` branch includes:

- provider/capability routing with hard requirement filtering and weighted scoring
- an in-memory reserve/post/void ledger
- Shellfish route receipts with SHA-256 integrity binding
- HMAC-SHA256 execution grants
- grant expiry and time-window validation
- task, provider, capability, route-receipt, and cost-ceiling binding
- nonce consumption and replay rejection
- local-only routing capabilities for repository inspection, candidate patch preparation, and isolated candidate verification
- an external research routing capability
- an XRPL `ripple_path_find` settlement adapter
- an Open Payments adapter boundary that remains disabled by default
- CI for typechecking, tests, and patch-format validation
- a planned regime-aware monetary-graph routing layer

The project remains **non-custodial by default**. It does not give the router unilateral wallet signing, custody, financial authority, trusted-memory write authority, or permission to promote candidate changes merely because a route was selected.

See `PROJECT-BOUNDARIES.md` for the current operating boundaries.

## Architecture

```text
Request / task intent
        ↓
Provider + capability filtering
        ↓
Route scoring / selection
        ↓
Route receipt
        ↓
Shellfish authorization boundary
        ↓
Signed execution grant
        ↓
Grant + receipt validation
        ↓
Replay protection
        ↓
Reserve internal balance
        ↓
Controlled provider execution
        ↓
Post or void reservation
        ↓
Execution result / receipt
```

The important architectural separation is:

```text
ROUTER:     "What route best satisfies the constraints?"
ASSURANCE:  "Is this exact route allowed to execute?"
EXECUTOR:   "Perform only the already-authorized action."
```

The router must not turn its own score, recommendation, or pathfinding result into execution authority.

## Assurance boundary

`POST /jobs` fails closed unless it receives both a valid route receipt and a valid execution grant.

The execution boundary currently verifies:

- required assurance artifacts are present
- execution-grant structure is valid
- route-receipt structure is valid
- grant `created_at` / `expires_at` values are valid and current
- the execution grant has a valid HMAC-SHA256 signature
- the route receipt still matches its SHA-256 receipt hash
- `task_id` is bound across the request, receipt, and grant
- `provider_id` is bound to the selected route
- the requested capability matches the receipt and grant
- the signed cost ceiling covers the selected route cost
- the grant is bound to the exact route-receipt ID and hash
- the nonce has not already been consumed

Replay of an otherwise valid grant is rejected.

The current grant also explicitly requires:

- `execution_allowed: true`
- `network_allowed: true`
- `payment_allowed: false`
- `trusted_memory_write_allowed: false`

That means the present boundary authorizes a narrow execution action without silently expanding that authorization into payment or trusted-memory authority.

## Current routed capabilities

The static provider catalog currently includes both example AI providers and Shellfish-local capabilities.

| Capability | Current purpose | Routing mode |
| --- | --- | --- |
| `summarize_document` | Example AI workload | provider selection |
| `EXTERNAL_RESEARCH` | Research bridge | bounded routed capability |
| `REPO_INSPECTION` | Inspect repository state | local-only |
| `DRAFT_PATCH` | Prepare a candidate patch | local-only, candidate only |
| `VERIFY_CANDIDATE` | Verify a candidate change in isolation | local-only |

These entries describe what may be selected by the router. They do **not** themselves grant unrestricted filesystem access, commit/push authority, Mainnet transaction authority, payment authority, or production promotion.

## HTTP surface

### `GET /health`

Basic service health.

### `GET /providers`

Returns the current provider/capability catalog.

### `GET /balance`

Returns the available balance of the current internal ledger adapter.

### `POST /quote`

Runs route selection without granting execution authority.

A quote can be useful for inspection and planning, but it is not an authorization token.

Example:

```bash
curl -X POST http://localhost:3000/quote \
  -H "content-type: application/json" \
  -d '{
    "task": "summarize_document",
    "maxCostMicrounits": 50000,
    "maxLatencyMs": 3000,
    "minimumQuality": 0.85,
    "privacy": "no-retention"
  }'
```

### `POST /jobs`

Controlled execution endpoint.

Unlike the original MVP flow, a plain job request is intentionally rejected. Execution requires a matching `taskId`, `routeReceipt`, and signed `executionGrant`.

The normal flow is therefore:

```text
quote / route decision
        ↓
route receipt
        ↓
external Shellfish authorization
        ↓
signed execution grant
        ↓
POST /jobs
```

The Wave Router verifies the artifacts; it does not grant itself permission.

## Run locally

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm run dev
```

Default service URL:

```text
http://localhost:3000
```

For the assurance boundary, configure a 32-byte HMAC key as 64 hexadecimal characters:

```text
SHELLFISH_ASSURANCE_HMAC_KEY_HEX=
```

The replay store defaults to:

```text
.runtime/assurance-replay.json
```

Do not commit real secrets or wallet seeds.

## Verify the build

```bash
npm run typecheck
npm test
```

GitHub Actions currently runs:

1. dependency installation
2. TypeScript typechecking
3. the test suite
4. `git diff --check`

The assurance tests cover fail-closed behavior including missing artifacts, malformed grants/receipts, expiry, invalid signatures, protected-field tampering, route-receipt tampering, binding mismatches, cost ceilings, and replay attempts.

## Ledger and payment state

The current default ledger is `InMemoryLedger`.

Its execution lifecycle is:

```text
reserve → execute → post
                 ↘ failure → void
```

TigerBeetle remains a future adapter replacement rather than an active dependency of the execution path.

Open Payments is represented behind an adapter boundary but remains disabled by default.

The repository also contains an XRPL settlement adapter using `ripple_path_find`. That adapter provides the building block for XRPL-aware settlement path inspection; it should not be confused with automatic Mainnet settlement or wallet signing.

## Regime-aware routing direction

The planned next routing layer expands provider selection into constrained monetary-graph routing:

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

The intended division of responsibility is:

- **Regime detector:** describes operating conditions; no execution authority.
- **Liquidity graph:** models availability, depth, slippage, capacity, and reachable assets/venues.
- **Risk graph:** models issuer/counterparty exposure, stale data, manipulation signals, and route constraints.
- **Settlement graph:** models rail availability, fees, latency, finality expectations, and network constraints.
- **Wave Router:** constructs and ranks routes inside the permitted graph.
- **Shellfish assurance:** decides whether the proposed route may execute.

The first version of this extension is intended to remain observational before any new execution authority is added.

See `docs/regime-aware-pathfinder.md`.

## Safety and operating boundaries

Current-mode design requirements include:

- non-custodial by default
- no storage or control of user private keys or seed phrases
- no unilateral signing of user financial transactions
- no automatic Mainnet fallback
- no silent expansion from routing authority to payment authority
- no trusted-memory writes through the current execution grant
- research mode and any future regulated/commercial mode must remain distinguishable
- unclear higher-risk behavior should fail closed instead of being silently enabled

For dependency-specific notes, see `SECURITY.md`.

## Roadmap

Near-term work should preserve the routing/authorization separation while improving the implementation around it:

1. keep the assurance boundary fail-closed as new capabilities are introduced
2. move provider manifests from static examples toward authenticated provider metadata
3. connect real provider adapters behind the existing capability boundary
4. expand candidate verification without turning verification into promotion authority
5. introduce observational regime/liquidity/risk/settlement graph inputs
6. exercise XRPL settlement path inspection on Testnet
7. harden ledger/accounting adapters before enabling real settlement flows
8. revisit Open Payments after its dependency/security path is acceptable
9. add production-grade audit logging, governance, and compliance controls before any commercial or regulated activation

## Design principle

The Wave Router is not intended to become the authority simply because it can find an efficient path.

Its job is to make routing **better, cheaper, faster, and more explainable** while keeping permission external, explicit, bounded, and verifiable.

```text
Optimization chooses.
Assurance authorizes.
Execution obeys.
```
