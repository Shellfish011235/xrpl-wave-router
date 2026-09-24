import type {
  XrplTransactionIntent,
} from "./xrplTransactionIntent.js";


export interface XrplPaymentDraft {
  draft_id: string;

  draft_type:
    "XRPL_UNSIGNED_PAYMENT_DRAFT";

  network:
    "testnet" | "devnet";

  task_id: string;

  transaction_intent_id: string;

  route_receipt_id: string;

  route_receipt_hash: string;

  provider_id: string;

  source_account: string;

  destination_account: string;

  amount_drops: string;

  transaction_json: {
    TransactionType:
      "Payment";

    Account:
      string;

    Destination:
      string;

    Amount:
      string;
  };

  unsigned: true;

  transaction_build_authorized: false;

  wallet_signing_authorized: false;

  transaction_submission_authorized: false;

  mainnet_authorized: false;

  human_approval_required: true;
}


function requireSupportedIntent(
  intent: XrplTransactionIntent,
): void {
  if (
    intent.intent_type !==
    "XRPL_TRANSACTION_INTENT"
  ) {
    throw new Error(
      "Invalid XRPL transaction intent type.",
    );
  }

  if (
    intent.network !==
      "testnet" &&
    intent.network !==
      "devnet"
  ) {
    throw new Error(
      "XRPL transaction draft is restricted to testnet or devnet.",
    );
  }

  if (
    intent.transaction_build_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected transaction build authority on XRPL intent.",
    );
  }

  if (
    intent.wallet_signing_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected wallet signing authority on XRPL intent.",
    );
  }

  if (
    intent.transaction_submission_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected transaction submission authority on XRPL intent.",
    );
  }

  if (
    intent.mainnet_authorized !==
    false
  ) {
    throw new Error(
      "Unexpected Mainnet authority on XRPL intent.",
    );
  }

  if (
    intent.human_approval_required !==
    true
  ) {
    throw new Error(
      "XRPL transaction draft requires human approval.",
    );
  }
}


export function buildUnsignedXrplPaymentDraft(
  intent: XrplTransactionIntent,
): XrplPaymentDraft {
  requireSupportedIntent(
    intent,
  );

  return {
    draft_id:
      `XRPL_TX_DRAFT_${intent.intent_id}`,

    draft_type:
      "XRPL_UNSIGNED_PAYMENT_DRAFT",

    network:
      intent.network,

    task_id:
      intent.task_id,

    transaction_intent_id:
      intent.intent_id,

    route_receipt_id:
      intent.route_receipt_id,

    route_receipt_hash:
      intent.route_receipt_hash,

    provider_id:
      intent.provider_id,

    source_account:
      intent.source_account,

    destination_account:
      intent.destination_account,

    amount_drops:
      intent.amount_drops,

    transaction_json: {
      TransactionType:
        "Payment",

      Account:
        intent.source_account,

      Destination:
        intent.destination_account,

      Amount:
        intent.amount_drops,
    },

    unsigned:
      true,

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
XRPL unsigned transaction-draft boundary

This service may:

- transform a validated Testnet/Devnet transaction intent
  into a deterministic unsigned Payment-shaped object
- preserve task, route, provider, source, destination,
  amount, and network provenance
- expose the exact transaction fields that would later
  require review

This service does NOT:

- call xrpl Client.autofill()
- calculate fees
- set Sequence
- set LastLedgerSequence
- create a wallet
- access a seed
- access a private key
- sign
- encode a signed transaction blob
- submit
- submitAndWait
- broadcast
- send XRP
- send issued assets
- authorize Mainnet

Important:

"transaction_json" is only a local deterministic draft.

It is not a ready-to-submit XRPL transaction.

Current flow:

Shellfish authorization provenance
        ↓
XRPL Testnet/Devnet transaction intent
        ↓
unsigned deterministic Payment draft
        ↓
all transaction authority remains FALSE
        ↓
STOP

A separate transaction-specific authorization boundary
must exist before network autofill, signing, or submission
can ever be introduced.
*/