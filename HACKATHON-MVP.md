# Hackathon MVP Demo

## One-line pitch

Wave Router is a policy-constrained routing layer for AI and agent workloads: it selects an eligible provider, produces a tamper-evident route receipt, requires an externally signed execution grant for that exact route, rejects replay/tampering, and keeps payment authority separate from execution authority.

## What the demo proves

1. A workload is submitted with hard constraints for cost, latency, quality, and privacy.
2. The router selects the best eligible provider.
3. The router emits a SHA-256-bound route receipt. The receipt is evidence of the route decision, not permission to execute.
4. External assurance signs an execution grant bound to the task, provider, capability, receipt hash, cost ceiling, nonce, and expiry.
5. `POST /jobs` fails closed unless the receipt and grant match the route exactly.
6. The grant nonce is consumed once, so replay is rejected.
7. Internal accounting reserves before execution and posts on success or voids on failure.
8. Payment, wallet signing, trusted-memory writes, and Mainnet transaction submission remain unauthorized.

## Fast local demo

Terminal 1:

```bash
cp .env.example .env
# Set SHELLFISH_ASSURANCE_HMAC_KEY_HEX to 64 hex characters.
npm install
npm run dev
```

Terminal 2:

```bash
npm run demo
```

The demo prints the selected provider, route score, route-receipt ID, execution-grant ID, replay-protection status, payment-authority status, and the controlled execution result.

## Judge story

The problem is not merely finding the cheapest model. Agent systems increasingly choose among models, tools, APIs, compute providers, and eventually settlement rails. A routing decision must not silently become authority to execute or spend.

Wave Router makes that separation explicit:

```text
OPTIMIZE          PROVE               AUTHORIZE          EXECUTE
constraints  ->   route receipt  ->   signed grant  ->   bounded job
                       |                    |
                 tamper evident       exact-route binding
```

The architectural invariant is:

> Route quality does not grant authority.

## Why XRPL

XRPL is treated as a settlement and path-inspection rail rather than as the source of execution authority. The repository already contains read-only XRPL inspection, Testnet/Devnet transaction intents, and deterministic unsigned Payment-shaped drafts. Mainnet submission and wallet signing remain outside the current MVP boundary.

## Deliberate non-goals

The MVP does not custody funds, store wallet seeds, grant itself payment authority, submit Mainnet transactions, or promote its own candidate changes. Those boundaries are part of the product claim, not missing features.
