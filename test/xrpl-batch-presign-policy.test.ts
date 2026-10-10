import test from "node:test";
import assert from "node:assert/strict";

import { buildUnsignedXrplBatchDraft } from "../src/services/xrplBatchDraft.js";
import { authorizeXrplBatchBuild } from "../src/services/xrplBatchAuthorization.js";
import { buildXrplBatchIntegrityReceipt } from "../src/services/xrplBatchIntegrity.js";
import { evaluateXrplBatchPreSignPolicy } from "../src/services/xrplBatchPreSignPolicy.js";

function artifacts() {
  const draft = buildUnsignedXrplBatchDraft({
    network: "testnet",
    taskId: "TASK_PRESIGN",
    routeReceiptId: "ROUTE_1",
    routeReceiptHash: "HASH_1",
    providerId: "xrpl-testnet",
    sourceAccount: "rSOURCE",
    mode: "ALL_OR_NOTHING",
    transactions: [
      { TransactionType: "Payment", Account: "rSOURCE", Destination: "rA", Amount: "10" },
      { TransactionType: "Payment", Account: "rSOURCE", Destination: "rB", Amount: "20" },
    ],
  });
  const authorization = authorizeXrplBatchBuild(draft, true);
  const integrity = buildXrplBatchIntegrityReceipt(draft, authorization);
  return { draft, authorization, integrity };
}

test("passes exact Batch artifacts to separate signing review without granting signing", () => {
  const { draft, authorization, integrity } = artifacts();
  const result = evaluateXrplBatchPreSignPolicy(draft, authorization, integrity);
  assert.equal(result.allowed_for_separate_signing_review, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.wallet_signing_allowed, false);
  assert.equal(result.transaction_submission_allowed, false);
  assert.equal(result.mainnet_allowed, false);
});

test("rejects tampered integrity receipt", () => {
  const { draft, authorization, integrity } = artifacts();
  const result = evaluateXrplBatchPreSignPolicy(draft, authorization, {
    ...integrity,
    binding_hash: "tampered",
  });
  assert.equal(result.allowed_for_separate_signing_review, false);
  assert.match(result.reasons.join(" "), /integrity/i);
});

test("rejects authorization carrying signing authority", () => {
  const { draft, authorization, integrity } = artifacts();
  const result = evaluateXrplBatchPreSignPolicy(draft, {
    ...authorization,
    wallet_signing_allowed: true,
  } as never, integrity);
  assert.equal(result.allowed_for_separate_signing_review, false);
  assert.match(result.reasons.join(" "), /signing/i);
});
