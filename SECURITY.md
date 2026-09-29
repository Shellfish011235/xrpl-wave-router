# Security Notes

## Dependency posture

The router's current Open Payments behavior is a local, simulated adapter boundary and does not import the `@interledger/open-payments` SDK at runtime. The unused SDK dependency was removed rather than carrying its transitive `uuid@9.0.1` advisory into the MVP.

Current safeguards:

- Open Payments remains quote-only / simulated in the MVP.
- No Open Payments grant is requested and `pay()` remains disabled by design.
- Wallet signing, private-key handling, and settlement execution stay outside this service.
- Job identifiers use Node `crypto.randomUUID()`.
- Re-run `npm audit --omit=dev` on every dependency change.
- Add an Open Payments SDK back only when a concrete integration requires it and its dependency/security posture has been reviewed.
