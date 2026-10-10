import assert from "node:assert/strict";
import test from "node:test";

import { buildUnsignedXrplBatchDraft } from "../src/services/xrplBatchDraft.js";
import { authorizeXrplBatchBuild } from "../src/services/xrplBatchAuthorization.js";
import { buildXrplBatchIntegrityReceipt } from "../src/services/xrplBatchIntegrity.js";

function setup() {
  const draft = buildUnsignedXrplBatchDraft({
    network: "testnet",
    taskId: "TASK_INTEGRITY",
    routeReceiptId: "ROUTE_I",
    routeReceiptHash: "routehash-i",
    providerId: "provider-alpha",
    sourceAccount: "rSource111111111111111111111111",
    mode: "ALL_OR_NOTHING",
    transactions: [
      { TransactionType: "Payment", Account: "rSource111111111111111111111111", Destination: "rDest11111111111111111111111111", Amount: "10" },
      { TransactionType: "Payment", Account: "rSource111111111111111111111111", Destination: "rDest22222222222222222222222222", Amount: "20" },
    ],
  });
  const authorization = authorizeXrplBatchBuild(draft, true);
  return { draft, authorization };
}

test("builds deterministic build-only Batch integrity receipt", () => {
  const { draft, authorization } = setup();
  const first = buildXrplBatchIntegrityReceipt(draft, authorization);
  const second = buildXrplBatchIntegrityReceipt(draft, authorization);

  assert.deepEqual(first, second);
  assert.equal(first.status, "VERIFIED_FOR_BUILD_ONLY");
  assert.equal(first.batch_draft_id, draft.draft_id);
  assert.equal(first.authorization_id, authorization.authorization_id);
  assert.match(first.draft_hash, /^[a-f0-9]{64}$/);
  assert.match(first.authorization_hash, /^[a-f0-9]{64}$/);
  assert.match(first.binding_hash, /^[a-f0-9]{64}$/);
  assert.equal(first.wallet_signing_allowed, false);
  assert.equal(first.transaction_submission_allowed, false);
  assert.equal(first.mainnet_allowed, false);
});

test("rejects Batch changed after authorization", () => {
  const { draft, authorization } = setup();
  const tampered = structuredClone(draft);
  tampered.transaction_json.RawTransactions[1].RawTransaction.Amount = "999";

  assert.throws(
    () => buildXrplBatchIntegrityReceipt(tampered, authorization),
    /Batch integrity verification failed/,
  );
});

test("rejects authorization carrying signing authority", () => {
  const { draft, authorization } = setup();
  const unsafe = structuredClone(authorization) as typeof authorization & { wallet_signing_allowed: boolean };
  unsafe.wallet_signing_allowed = true;

  assert.throws(
    () => buildXrplBatchIntegrityReceipt(draft, unsafe),
    /Batch integrity verification failed/,
  );
});
