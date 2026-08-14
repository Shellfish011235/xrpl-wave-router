# Project Boundaries

## Current operating mode

This repository is maintained as an educational, research, developer-tooling, and experimental software project.

Current-mode requirements:

- Non-custodial by default.
- No storage or control of user private keys or seed phrases.
- No unilateral signing or execution of financial transactions for users.
- No pooling, custody, or transmission of user funds by the project operator.
- No individualized investment, legal, or tax advice.
- No promises or guarantees of financial returns.
- Financial actions, where supported for testing or demonstration, must remain user-controlled and require the user's own wallet/signature.
- AI or agent components may analyze, explain, simulate, and prepare bounded intents, but may not independently grant themselves financial authority.
- If the legal/regulatory status of a feature is unclear, current mode should fail closed rather than silently enable it.

This file is an internal product-design boundary, not a legal determination or legal advice.

## Future business / regulated activation path

The architecture may later be upgraded for legitimate commercial operation, but regulated or higher-risk functionality must not be activated merely by finishing the code.

Before enabling any feature involving custody, money transmission, execution-as-a-service, discretionary trading, transaction-based compensation, individualized investment advice, or other regulated financial activity, the maintainer should deliberately complete a separate activation process that can include:

1. Define the exact commercial feature and who controls funds, keys, signing, routing, execution, and fees.
2. Obtain current legal/compliance review for the applicable jurisdictions, including Florida and U.S. federal requirements where relevant.
3. Determine whether licenses, registrations, disclosures, AML/KYC controls, bonding, recordkeeping, cybersecurity controls, insurance, or other obligations apply.
4. Create a separate production/commercial configuration or branch with explicit feature flags and documented authorization boundaries.
5. Add appropriate compliance controls, audits, logging, customer disclosures, incident response, and governance before activation.
6. Re-run security and legal review whenever the business model or regulated functionality materially changes.

## Design rule

**Research mode and regulated-business mode must remain distinguishable in code, configuration, documentation, and deployment.**

A future commercial upgrade is allowed; accidental activation is not.
