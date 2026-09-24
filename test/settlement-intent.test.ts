import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSettlementIntent,
} from "../src/services/settlementIntent.js";
import type {
  RouteReceipt,
} from "../src/types/domain.js";


function makeReceipt(): RouteReceipt {
  return {
    receipt_id:
      "ROUTE_RECEIPT_SETTLEMENT_1",
    receipt_hash:
      "a".repeat(64),
    task_id:
      "TASK_SETTLEMENT_1",
    provider_id:
      "provider-1",
    capability_required:
      "summarize_document",
    reserved_microunits:
      2500,
    execution_authorized:
      false,
    payment_authorized:
      false,
    trusted_memory_write_authorized:
      false,
  };
}


test(
  "builds quote-only settlement intent without payment authority",
  () => {
    const intent =
      buildSettlementIntent(
        "JOB_SETTLEMENT_1",
        "TASK_SETTLEMENT_1",
        makeReceipt(),
        2500,
        {
          debitAmount: "2500",
          receiveAmount: "2500",
          assetCode: "TEST",
        },
      );

    assert.equal(
      intent.intent_type,
      "QUOTE_ONLY_ACCOUNTING_INTENT",
    );
    assert.equal(
      intent.provider_id,
      "provider-1",
    );
    assert.equal(
      intent.amount_microunits,
      2500,
    );
    assert.equal(
      intent.payment_authorized,
      false,
    );
    assert.equal(
      intent.wallet_signing_authorized,
      false,
    );
    assert.equal(
      intent.settlement_authorized,
      false,
    );
    assert.equal(
      intent.settlement_executed,
      false,
    );
    assert.equal(
      intent.human_approval_required,
      true,
    );
  },
);


test(
  "rejects settlement intent task binding mismatch",
  () => {
    assert.throws(
      () =>
        buildSettlementIntent(
          "JOB_SETTLEMENT_2",
          "WRONG_TASK",
          makeReceipt(),
          2500,
          {
            debitAmount: "2500",
            receiveAmount: "2500",
            assetCode: "TEST",
          },
        ),
      /task binding mismatch/,
    );
  },
);


test(
  "rejects invalid settlement intent amount",
  () => {
    assert.throws(
      () =>
        buildSettlementIntent(
          "JOB_SETTLEMENT_3",
          "TASK_SETTLEMENT_1",
          makeReceipt(),
          -1,
          {
            debitAmount: "-1",
            receiveAmount: "-1",
            assetCode: "TEST",
          },
        ),
      /non-negative safe integer/,
    );
  },
);
