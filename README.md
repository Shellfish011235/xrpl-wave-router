# XRPL AI Pathfinder MVP

A proof-of-concept that routes an AI job to the cheapest qualified provider, reserves an internal balance, executes the job, and prepares an XRPL settlement quote.

## What this proves

1. Providers publish capability offers.
2. A routing engine rejects offers that violate hard requirements.
3. The remaining offers are scored by price, latency, quality, privacy, and availability.
4. A ledger adapter reserves and posts or voids funds.
5. XRPL `ripple_path_find` is used to inspect a possible settlement path.
6. An ILP/Open Payments adapter boundary is included for the next phase.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Then:

```bash
curl -X POST http://localhost:3000/jobs \
  -H "content-type: application/json" \
  -d '{
    "task": "summarize_document",
    "maxCostMicrounits": 50000,
    "maxLatencyMs": 3000,
    "minimumQuality": 0.85,
    "privacy": "no-retention"
  }'
```

The default MVP uses an in-memory ledger. TigerBeetle and Open Payments are intentionally behind adapters so they can be enabled without changing the routing domain.

## Production sequence

- Replace `InMemoryLedger` with TigerBeetle two-phase transfers.
- Connect provider adapters to real model APIs.
- Add signed provider manifests and continuous benchmark scores.
- Add Open Payments quotes and outgoing payments.
- Settle provider net balances periodically through XRPL.
- Only then consider issuing standardized compute credits.
