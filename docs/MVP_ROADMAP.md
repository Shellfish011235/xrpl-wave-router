# Wave Router MVP Roadmap

## Vision
Wave Router is the AI pathfinding engine for XRPL. It discovers providers, scores routes, executes work, settles payments over XRPL infrastructure, and maintains auditable accounting.

## MVP Flow
1. Prompt
2. Discover Providers
3. Score Providers
4. Select Best Route
5. Execute AI
6. Verify Response
7. x402 Payment Quote
8. XRPL Settlement
9. Receipt

## Core Modules
- Provider Registry
- Routing Engine
- Execution Engine
- Payment Adapters (x402/Open Payments)
- XRPL Settlement Adapter
- TigerBeetle Accounting
- Dashboard

## Sprint Plan
### Sprint 1
- Live provider registry
- Route scoring
- Execution engine
- Dashboard route explanation

### Sprint 2
- XRPL AI Hub integration
- x402 payment flow
- XRPL Testnet settlement

### Sprint 3
- TigerBeetle accounting
- Multi-provider routing graph
- Receipts, analytics, observability

## Engineering Principle
Every commit must leave Wave Router in a runnable state.