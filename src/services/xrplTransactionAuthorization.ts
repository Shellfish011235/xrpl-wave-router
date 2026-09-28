import type {
  XrplPaymentDraft,
} from "./xrplTransactionDraft.js";
import {
  verifyShellfishEnvelopeSignature,
} from "./assurance.js";


export interface XrplTransactionAuthorization {
  authorization_id: string;

  authorization_type:
    "XRPL_TRANSACTION_AUTHORIZATION";

  network:
    "testnet" | "devnet";

  task_id: string;

  transaction_intent_id: string;

  transaction_draft_id: string;

  route_receipt_id: string;

  route_receipt_hash: string;

  provider_id: string;

  source_account: string;

  destination_account: string;

  amount_drops: string;

  transaction_build_allowed: true;

  wallet_signing_allowed: false;

  transaction_submission_allowed: false;

  mainnet_allowed: false;

  human_approval_recorded: true;

  signing_requires_separate_authorization: true;

  submission_requires_separate_authorization: true;
}


function requireUnsignedDraft(
  draft: XrplPaymentDraft,
): void {
  if (
    draft.draft_type !==
    "XRPL_UNSIGNED_PAYMENT_DRAFT"
  ) {
    throw new Error(
      "Invalid XRPL transaction draft type.",
    );
  }

  if (
    draft.network !==
      "testnet" &&
    draft.network !==
      "devnet"
  ) {
    throw new Error(
      "XRPL transaction authorization is restricted to testnet or devnet.",
    );
  }

  if (
    draft.unsigned !==
    true
  ) {
    throw new Error(
      "XRPL transaction authorization requires an unsigned draft.",
    );
  }

  if (
    draft.wallet_signing_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected wallet signing authority on XRPL draft.",
    );
  }

  if (
    draft.transaction_submission_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected transaction submission authority on XRPL draft.",
    );
  }

  if (
    draft.mainnet_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected Mainnet authority on XRPL draft.",
    );
  }

  if (
    draft.human_approval_required !==
    true
  ) {
    throw new Error(
      "XRPL transaction authorization requires human approval.",
    );
  }
}


export interface ShellfishTransactionAuthorizationResult {
  allowed: boolean;
  reasons: string[];
}


export function verifyShellfishTransactionAuthorization(
  draft: XrplPaymentDraft,
  authorization: Record<string, unknown>,
): ShellfishTransactionAuthorizationResult {
  const reasons: string[] = [];

  if (
    verifyShellfishEnvelopeSignature(
      authorization,
    ) === false
  ) {
    reasons.push(
      "Shellfish transaction authorization signature invalid.",
    );
  }

  if (
    authorization.task_id !==
    draft.task_id
  ) {
    reasons.push(
      "Shellfish transaction authorization task binding mismatch.",
    );
  }

  if (
    authorization.route_receipt_id !==
    draft.route_receipt_id
  ) {
    reasons.push(
      "Shellfish transaction authorization route receipt ID mismatch.",
    );
  }

  if (
    authorization.route_receipt_hash !==
    draft.route_receipt_hash
  ) {
    reasons.push(
      "Shellfish transaction authorization route receipt hash mismatch.",
    );
  }

  if (
    authorization.source_account !==
    draft.source_account
  ) {
    reasons.push(
      "Shellfish transaction authorization source account mismatch.",
    );
  }

  if (
    authorization.destination !==
    draft.destination_account
  ) {
    reasons.push(
      "Shellfish transaction authorization destination mismatch.",
    );
  }

  if (
    authorization.max_amount !==
    draft.amount_drops
  ) {
    reasons.push(
      "Shellfish transaction authorization amount mismatch.",
    );
  }

  if (
    authorization.network !==
    draft.network
  ) {
    reasons.push(
      "Shellfish transaction authorization network mismatch.",
    );
  }

  if (
    authorization.authorization_type !==
    "TRANSACTION_AUTHORIZATION"
  ) {
    reasons.push(
      "Shellfish transaction authorization type invalid.",
    );
  }

  if (
    authorization.transaction_build_allowed !==
    true
  ) {
    reasons.push(
      "Shellfish transaction build authority missing.",
    );
  }

  if (
    authorization.transaction_sign_allowed !==
    false
  ) {
    reasons.push(
      "Shellfish transaction signing authority must remain false.",
    );
  }

  if (
    authorization.transaction_submit_allowed !==
    false
  ) {
    reasons.push(
      "Shellfish transaction submission authority must remain false.",
    );
  }

  if (
    authorization.mainnet_allowed !==
    false
  ) {
    reasons.push(
      "Shellfish Mainnet authority must remain false.",
    );
  }

  return {
    allowed:
      reasons.length === 0,
    reasons,
  };
}


export function authorizeXrplTransactionBuild(
  draft: XrplPaymentDraft,
  humanApproved: boolean,
): XrplTransactionAuthorization {
  requireUnsignedDraft(
    draft,
  );

  if (
    humanApproved !==
    true
  ) {
    throw new Error(
      "Human approval is required for XRPL transaction build authorization.",
    );
  }

  return {
    authorization_id:
      `XRPL_TX_AUTH_${draft.draft_id}`,

    authorization_type:
      "XRPL_TRANSACTION_AUTHORIZATION",

    network:
      draft.network,

    task_id:
      draft.task_id,

    transaction_intent_id:
      draft.transaction_intent_id,

    transaction_draft_id:
      draft.draft_id,

    route_receipt_id:
      draft.route_receipt_id,

    route_receipt_hash:
      draft.route_receipt_hash,

    provider_id:
      draft.provider_id,

    source_account:
      draft.source_account,

    destination_account:
      draft.destination_account,

    amount_drops:
      draft.amount_drops,

    transaction_build_allowed:
      true,

    wallet_signing_allowed:
      false,

    transaction_submission_allowed:
      false,

    mainnet_allowed:
      false,

    human_approval_recorded:
      true,

    signing_requires_separate_authorization:
      true,

    submission_requires_separate_authorization:
      true,
  };
}


/*
XRPL transaction-specific authorization boundary

Purpose:

Create a separate authorization artifact for progressing
a reviewed Testnet/Devnet transaction draft beyond pure
description.

This authorization MAY allow:

- transaction construction work
- validation of transaction fields
- later network autofill simulation or preparation,
  if separately implemented

This authorization does NOT allow:

- wallet creation
- seed access
- private-key access
- wallet signing
- transaction signing
- signed blob generation
- submission
- broadcast
- XRP transfer
- issued-asset transfer
- Mainnet execution

Important:

Provider execution authority is NOT payment authority.

Transaction-build authority is NOT signing authority.

Signing authority is NOT submission authority.

Each authority must remain separately represented
and separately approved.

Current progression:

provider execution grant
        ↓
transaction intent
        ↓
unsigned transaction draft
        ↓
explicit human approval
        ↓
transaction-build authorization
        ↓
wallet signing allowed = FALSE
transaction submission allowed = FALSE
        ↓
STOP
*/