import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUnsignedXrplPaymentDraft,
} from "../src/services/xrplTransactionDraft.js";

import type {
  XrplTransactionIntent,
} from "../src/services/xrplTransactionIntent.js";


function buildIntent(
  network:
    | "testnet"
    | "devnet" =
      "testnet",
): XrplTransactionIntent {
  return {
    intent_id:
      "XRPL_TX_INTENT_TASK_1",

    intent_type:
      "XRPL_TRANSACTION_INTENT",

    network,

    task_id:
      "TASK_1",

    route_receipt_id:
      "ROUTE_RECEIPT_1",

    route_receipt_hash:
      "abc123",

    provider_id:
      "provider-alpha",

    capability:
      "inference",

    source_account:
      "rSource111111111111111111111111",

    destination_account:
      "rDestination11111111111111111111",

    amount_drops:
      "1000000",

    execution_grant_id:
      "GRANT_1",

    execution_grant_nonce:
      "NONCE_1",

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


test(
  "builds deterministic unsigned XRPL payment draft",
  () => {
    const intent =
      buildIntent();

    const draft =
      buildUnsignedXrplPaymentDraft(
        intent,
      );

    assert.equal(
      draft.draft_type,
      "XRPL_UNSIGNED_PAYMENT_DRAFT",
    );

    assert.equal(
      draft.network,
      "testnet",
    );

    assert.equal(
      draft.task_id,
      intent.task_id,
    );

    assert.equal(
      draft.transaction_intent_id,
      intent.intent_id,
    );

    assert.equal(
      draft.route_receipt_id,
      intent.route_receipt_id,
    );

    assert.equal(
      draft.route_receipt_hash,
      intent.route_receipt_hash,
    );

    assert.equal(
      draft.provider_id,
      intent.provider_id,
    );

    assert.equal(
      draft.source_account,
      intent.source_account,
    );

    assert.equal(
      draft.destination_account,
      intent.destination_account,
    );

    assert.equal(
      draft.amount_drops,
      "1000000",
    );

    assert.deepEqual(
      draft.transaction_json,
      {
        TransactionType:
          "Payment",

        Account:
          intent.source_account,

        Destination:
          intent.destination_account,

        Amount:
          "1000000",
      },
    );
  },
);


test(
  "preserves devnet network boundary",
  () => {
    const draft =
      buildUnsignedXrplPaymentDraft(
        buildIntent(
          "devnet",
        ),
      );

    assert.equal(
      draft.network,
      "devnet",
    );
  },
);


test(
  "unsigned draft preserves all transaction authority as false",
  () => {
    const draft =
      buildUnsignedXrplPaymentDraft(
        buildIntent(),
      );

    assert.equal(
      draft.unsigned,
      true,
    );

    assert.equal(
      draft.transaction_build_authorized,
      false,
    );

    assert.equal(
      draft.wallet_signing_authorized,
      false,
    );

    assert.equal(
      draft.transaction_submission_authorized,
      false,
    );

    assert.equal(
      draft.mainnet_authorized,
      false,
    );

    assert.equal(
      draft.human_approval_required,
      true,
    );
  },
);


test(
  "draft construction is deterministic",
  () => {
    const intent =
      buildIntent();

    const first =
      buildUnsignedXrplPaymentDraft(
        intent,
      );

    const second =
      buildUnsignedXrplPaymentDraft(
        intent,
      );

    assert.deepEqual(
      first,
      second,
    );
  },
);


test(
  "rejects unexpected transaction build authority",
  () => {
    const intent =
      buildIntent();

    (
      intent as unknown as {
        transaction_build_authorized:
          boolean;
      }
    ).transaction_build_authorized =
      true;

    assert.throws(
      () =>
        buildUnsignedXrplPaymentDraft(
          intent,
        ),
      /Unexpected transaction build authority/,
    );
  },
);


test(
  "rejects unexpected wallet signing authority",
  () => {
    const intent =
      buildIntent();

    (
      intent as unknown as {
        wallet_signing_authorized:
          boolean;
      }
    ).wallet_signing_authorized =
      true;

    assert.throws(
      () =>
        buildUnsignedXrplPaymentDraft(
          intent,
        ),
      /Unexpected wallet signing authority/,
    );
  },
);


test(
  "rejects unexpected transaction submission authority",
  () => {
    const intent =
      buildIntent();

    (
      intent as unknown as {
        transaction_submission_authorized:
          boolean;
      }
    ).transaction_submission_authorized =
      true;

    assert.throws(
      () =>
        buildUnsignedXrplPaymentDraft(
          intent,
        ),
      /Unexpected transaction submission authority/,
    );
  },
);


test(
  "rejects unexpected mainnet authority",
  () => {
    const intent =
      buildIntent();

    (
      intent as unknown as {
        mainnet_authorized:
          boolean;
      }
    ).mainnet_authorized =
      true;

    assert.throws(
      () =>
        buildUnsignedXrplPaymentDraft(
          intent,
        ),
      /Unexpected Mainnet authority/,
    );
  },
);


test(
  "rejects missing human approval requirement",
  () => {
    const intent =
      buildIntent();

    (
      intent as unknown as {
        human_approval_required:
          boolean;
      }
    ).human_approval_required =
      false;

    assert.throws(
      () =>
        buildUnsignedXrplPaymentDraft(
          intent,
        ),
      /requires human approval/,
    );
  },
);