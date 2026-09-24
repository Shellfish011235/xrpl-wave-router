import type {
  ExecutionGrant,
  RouteReceipt,
} from "../types/domain.js";


export type AllowedXrplNetwork =
  | "testnet"
  | "devnet";


export interface XrplTransactionIntent {
  intent_id: string;

  intent_type:
    "XRPL_TRANSACTION_INTENT";

  network:
    AllowedXrplNetwork;

  task_id: string;

  route_receipt_id: string;

  route_receipt_hash: string;

  provider_id: string;

  capability:
    string;

  source_account: string;

  destination_account: string;

  amount_drops: string;

  execution_grant_id: string;

  execution_grant_nonce: string;

  transaction_build_authorized: false;

  wallet_signing_authorized: false;

  transaction_submission_authorized: false;

  mainnet_authorized: false;

  human_approval_required: true;
}


function requireNonEmptyString(
  value: string,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return value.trim();
}


function normalizeDrops(
  amountDrops: string,
): string {
  const normalized =
    requireNonEmptyString(
      amountDrops,
      "XRPL amount",
    );

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "XRPL amount must be a non-negative integer string in drops.",
    );
  }

  return BigInt(
    normalized,
  ).toString();
}


function requireAllowedNetwork(
  network: string,
): AllowedXrplNetwork {
  if (
    network !== "testnet" &&
    network !== "devnet"
  ) {
    throw new Error(
      "XRPL transaction intent is restricted to testnet or devnet.",
    );
  }

  return network;
}


export function buildXrplTransactionIntent(
  input: {
    network: string;

    taskId: string;

    sourceAccount: string;

    destinationAccount: string;

    amountDrops: string;

    routeReceipt: RouteReceipt;

    executionGrant: ExecutionGrant;
  },
): XrplTransactionIntent {
  const network =
    requireAllowedNetwork(
      input.network,
    );

  const taskId =
    requireNonEmptyString(
      input.taskId,
      "Task ID",
    );

  const sourceAccount =
    requireNonEmptyString(
      input.sourceAccount,
      "Source account",
    );

  const destinationAccount =
    requireNonEmptyString(
      input.destinationAccount,
      "Destination account",
    );

  const amountDrops =
    normalizeDrops(
      input.amountDrops,
    );

  if (
    input.routeReceipt.task_id !==
    taskId
  ) {
    throw new Error(
      "XRPL transaction intent route receipt task binding mismatch.",
    );
  }

  if (
    input.executionGrant.task_id !==
    taskId
  ) {
    throw new Error(
      "XRPL transaction intent execution grant task binding mismatch.",
    );
  }

  if (
    input.executionGrant.route_receipt_id !==
    input.routeReceipt.receipt_id
  ) {
    throw new Error(
      "XRPL transaction intent route receipt ID binding mismatch.",
    );
  }

  if (
    input.executionGrant.route_receipt_hash !==
    input.routeReceipt.receipt_hash
  ) {
    throw new Error(
      "XRPL transaction intent route receipt hash binding mismatch.",
    );
  }

  if (
    input.executionGrant.provider_id !==
    input.routeReceipt.provider_id
  ) {
    throw new Error(
      "XRPL transaction intent provider binding mismatch.",
    );
  }

  if (
    input.executionGrant.capability !==
    input.routeReceipt.capability_required
  ) {
    throw new Error(
      "XRPL transaction intent capability binding mismatch.",
    );
  }

  /*
  Important:

  The existing ExecutionGrant currently authorizes
  bounded provider execution only.

  It explicitly carries:

    payment_allowed: false

  Therefore it MUST NOT be interpreted as authority
  to build, sign, or submit an XRPL transaction.

  This intent records provenance and binding only.
  A future transaction-specific authorization object
  must be designed separately.
  */
  if (
    input.executionGrant.payment_allowed !==
    false
  ) {
    throw new Error(
      "Unexpected payment authority on execution grant.",
    );
  }

  return {
    intent_id:
      `XRPL_TX_INTENT_${taskId}`,

    intent_type:
      "XRPL_TRANSACTION_INTENT",

    network,

    task_id:
      taskId,

    route_receipt_id:
      input.routeReceipt.receipt_id,

    route_receipt_hash:
      input.routeReceipt.receipt_hash,

    provider_id:
      input.routeReceipt.provider_id,

    capability:
      input.routeReceipt.capability_required,

    source_account:
      sourceAccount,

    destination_account:
      destinationAccount,

    amount_drops:
      amountDrops,

    execution_grant_id:
      input.executionGrant.grant_id,

    execution_grant_nonce:
      input.executionGrant.nonce,

    transaction_build_authorized:
      false,

    wallet_signing_authorized:
      false,

    transaction_submission_authorized:
      false,

    mainnet_authorized:
      false,

    human_approval_required:
      true,
  };
}


/*
XRPL transaction-intent boundary

This service may:

- describe a proposed Testnet/Devnet payment
- bind that proposal to an existing route receipt
- bind that proposal to an existing Shellfish execution grant
- preserve task/provider/capability provenance
- normalize an XRP amount expressed in drops
- record that human approval is required

This service may NOT:

- construct a signed transaction
- access a seed
- access a private key
- create a wallet
- sign a transaction
- autofill a transaction
- submit a transaction
- broadcast a transaction
- send XRP
- send issued assets
- authorize Mainnet
- reinterpret execution permission as payment permission

Mainnet is rejected by construction.

Current flow:

Shellfish route receipt
        +
Shellfish execution grant
        ↓
XRPL Testnet/Devnet transaction intent
        ↓
authorization flags remain FALSE
        ↓
STOP

A future transaction-specific authorization artifact must
exist before transaction building, signing, or submission
can be introduced.
*/