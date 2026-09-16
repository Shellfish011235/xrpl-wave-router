# Security Notes

## Dependency exception

As of the current dependency audit, `uuid@9.0.1` is required transitively by `@interledger/open-payments@6.14.1` through `@interledger/http-signature-utils@2.0.3`.

The audit reports four moderate findings related to `uuid` buffer handling. No compatible upstream fix is currently available through the Open Payments dependency chain. The project does not directly call the affected legacy UUID buffer APIs; job identifiers are generated with Node `crypto.randomUUID()`.

Mitigations:

- Keep Open Payments disabled in the MVP.
- Do not process untrusted UUID buffers.
- Keep wallet signing and private-key handling outside this service.
- Re-run `npm audit` on every dependency change.
- Reassess and remove this exception when Open Payments updates the dependency.
