import assert from "node:assert/strict";
import test from "node:test";

import { buildUnsignedXrplBatchDraft } from "../src/services/xrplBatchDraft.js";
import {
  authorizeXrplBatchBuild,
  verifyXrplBatchAuthorization,
} from "../src/services/xrplBatchAuthorization.js";

function buildDraft() {
  return buildUnsignedXrplBatchDraft({
    network: "testnet",
    taskId: "TASK_BATCH_AUTH",
    routeReceiptId: "ROUTE_1",
    routeReceiptHash: "routehash",
    providerId: "provider-alpha",
    sourceAccount: "rSource111111111111111111111111",
    mode: "ALL_OR_NOTHING",
    transactions: [
      {
        TransactionType: "Payment",
        Account: "rSource111111111111111111111111",
        Destination: "rDest11111111111111111111111111",
        Amount: "1000",
      },
      {
        TransactionType: "Payment",
        Account: "rSource111111111111111111111111",
        Destination: "rDest22222222222222222222222222",
        Amount: "2000",
      },
    ],
  });
}

test("authorizes exact ordered unsigned Batch draft only", () => {
  const draft = buildDraft();
  const authorization = authorizeXrplBatchBuild(draft, true);

  assert.equal(authorization.authorization_type, "XRPL_BATCH_BUILD_AUTHORIZATION");
  assert.equal(authorization.batch_draft_id, draft.draft_id);
  assert.equal(authorization.mode, "ALL_OR_NOTHING");
  assert.equal(authorization.transaction_count, 2);
  assert.equal(authorization.wallet_signing_allowed, false);
  assert.equal(authorization.transaction_submission_allowed, false);
  assert.equal(authorization.mainnet_allowed, false);
  assert.match(authorization.ordered_transactions_hash, /^[a-f0-9]{64}$/);

  const result = verifyXrplBatchAuthorization(draft, authorization);
  assert.deepEqual(result, { allowed: true, reasons: [] });
});

test("rejects reordered inner transactions after approval", () => {
  const draft = buildDraft();
  const authorization = authorizeXrplBatchBuild(draft, true);
  const tampered = structuredClone(draft);
  tampered.transaction_json.RawTransactions.reverse();

  const result = verifyXrplBatchAuthorization(tampered, authorization);
  assert.equal(result.allowed, false);
  assert.equal(result.reasons.includes("XRPL Batch ordered transaction hash mismatch."), true);
});

test("rejects changed inner transaction after approval", () => {
  const draft = buildDraft();
  const authorization = authorizeXrplBatchBuild(draft, true);
  const tampered = structuredClone(draft);
  tampered.transaction_json.RawTransactions[0].RawTransaction.Amount = "999999";

  const result = verifyXrplBatchAuthorization(tampered, authorization);
  assert.equal(result.allowed, false);
  assert.equal(result.reasons.includes("XRPL Batch ordered transaction hash mismatch."), true);
});

test("requires explicit human approval", () => {
  assert.throws(
    () => authorizeXrplBatchBuild(buildDraft(), false),
    /Human approval is required/,
  );
});
