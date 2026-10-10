import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUnsignedXrplBatchDraft,
} from "../src/services/xrplBatchDraft.js";

const source = "rSource111111111111111111111111";
const destination = "rDestination11111111111111111111";

function baseInput() {
  return {
    network: "testnet" as const,
    taskId: "TASK_BATCH_1",
    routeReceiptId: "ROUTE_RECEIPT_1",
    routeReceiptHash: "abc123",
    providerId: "provider-alpha",
    sourceAccount: source,
    mode: "ALL_OR_NOTHING" as const,
    transactions: [
      {
        TransactionType: "Payment" as const,
        Account: source,
        Destination: destination,
        Amount: "1000000",
      },
      {
        TransactionType: "Payment" as const,
        Account: source,
        Destination: destination,
        Amount: "2000000",
      },
    ],
  };
}

test("builds deterministic unsigned Batch draft with canonical inner wrappers", () => {
  const draft = buildUnsignedXrplBatchDraft(baseInput());

  assert.equal(draft.draft_type, "XRPL_UNSIGNED_BATCH_DRAFT");
  assert.equal(draft.network, "testnet");
  assert.equal(draft.transaction_json.TransactionType, "Batch");
  assert.equal(draft.transaction_json.Flags, 65536);
  assert.equal(draft.transaction_json.RawTransactions.length, 2);

  for (const wrapper of draft.transaction_json.RawTransactions) {
    assert.deepEqual(Object.keys(wrapper), ["RawTransaction"]);
    assert.equal(wrapper.RawTransaction.Fee, "0");
    assert.equal(wrapper.RawTransaction.SigningPubKey, "");
    assert.equal(wrapper.RawTransaction.Flags, 0x40000000);
    assert.equal("TxnSignature" in wrapper.RawTransaction, false);
    assert.equal("Signers" in wrapper.RawTransaction, false);
    assert.equal("LastLedgerSequence" in wrapper.RawTransaction, false);
  }

  assert.equal(draft.unsigned, true);
  assert.equal(draft.transaction_build_authorized, false);
  assert.equal(draft.wallet_signing_authorized, false);
  assert.equal(draft.transaction_submission_authorized, false);
  assert.equal(draft.mainnet_authorized, false);
  assert.equal(draft.human_approval_required, true);
});

test("rejects nested Batch transactions", () => {
  const input = baseInput();
  input.transactions[0] = {
    TransactionType: "Batch" as never,
    Account: source,
    Destination: destination,
    Amount: "1",
  };

  assert.throws(
    () => buildUnsignedXrplBatchDraft(input),
    /Nested Batch transactions are not allowed/,
  );
});

test("rejects inner LastLedgerSequence while stable xrpl.js 5.3.0 rejects it", () => {
  const input = baseInput() as ReturnType<typeof baseInput> & {
    transactions: Array<ReturnType<typeof baseInput>["transactions"][number] & {
      LastLedgerSequence?: number;
    }>;
  };
  input.transactions[0].LastLedgerSequence = 12345;

  assert.throws(
    () => buildUnsignedXrplBatchDraft(input),
    /Inner LastLedgerSequence is disabled for the current xrpl.js compatibility boundary/,
  );
});

test("rejects preexisting inner signing material", () => {
  const input = baseInput() as ReturnType<typeof baseInput> & {
    transactions: Array<ReturnType<typeof baseInput>["transactions"][number] & {
      TxnSignature?: string;
    }>;
  };
  input.transactions[0].TxnSignature = "signed";

  assert.throws(
    () => buildUnsignedXrplBatchDraft(input),
    /Inner transactions must be unsigned/,
  );
});
