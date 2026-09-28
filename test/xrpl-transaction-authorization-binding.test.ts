import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyShellfishTransactionAuthorization,
} from "../src/services/xrplTransactionAuthorization.js";

process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX =
  "11".repeat(32);

function makeDraft() {
  return {
    draft_id: "XRPL_TX_DRAFT_VECTOR",
    draft_type: "XRPL_UNSIGNED_PAYMENT_DRAFT" as const,
    network: "testnet" as const,
    task_id: "TASK_TX_VECTOR",
    transaction_intent_id: "XRPL_TX_INTENT_VECTOR",
    route_receipt_id: "ROUTE_TX_VECTOR",
    route_receipt_hash: "b".repeat(64),
    provider_id: "shellfish-payment-builder",
    source_account: "rSOURCE",
    destination_account: "rDESTINATION",
    amount_drops: "1000000",
    transaction_json: {
      TransactionType: "Payment" as const,
      Account: "rSOURCE",
      Destination: "rDESTINATION",
      Amount: "1000000",
    },
    unsigned: true as const,
    transaction_build_authorized: false as const,
    wallet_signing_authorized: false as const,
    transaction_submission_authorized: false as const,
    mainnet_authorized: false as const,
    human_approval_required: true as const,
  };
}

function makeAuthorization() {
  return {
    authorization_id: "TX_AUTH_VECTOR",
    authorization_type: "TRANSACTION_AUTHORIZATION",
    task_id: "TASK_TX_VECTOR",
    nonce: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    route_receipt_id: "ROUTE_TX_VECTOR",
    route_receipt_hash: "b".repeat(64),
    source_account: "rSOURCE",
    destination: "rDESTINATION",
    asset: "XRP",
    max_amount: "1000000",
    network: "testnet",
    transaction_build_allowed: true,
    transaction_sign_allowed: false,
    transaction_submit_allowed: false,
    mainnet_allowed: false,
    created_at: "2026-09-27T18:00:00+00:00",
    expires_at: "2099-09-27T18:10:00+00:00",
    signature_algorithm: "HMAC-SHA256",
    signature:
      "2f3f86c56188ef5b59ad71b9bb3001c1359d3223a6a746531898e0e930964f19",
  };
}

test("rejects destination mismatch on signed authorization", () => {
  const draft = makeDraft();
  draft.destination_account = "rOTHER";
  const result = verifyShellfishTransactionAuthorization(
    draft,
    makeAuthorization(),
  );
  assert.equal(result.allowed, false);
  assert.equal(
    result.reasons.includes(
      "Shellfish transaction authorization destination mismatch.",
    ),
    true,
  );
});

test("rejects amount mismatch on signed authorization", () => {
  const draft = makeDraft();
  draft.amount_drops = "2000000";
  const result = verifyShellfishTransactionAuthorization(
    draft,
    makeAuthorization(),
  );
  assert.equal(result.allowed, false);
  assert.equal(
    result.reasons.includes(
      "Shellfish transaction authorization amount mismatch.",
    ),
    true,
  );
});

test("rejects network mismatch on signed authorization", () => {
  const draft = makeDraft();
  draft.network = "devnet";
  const result = verifyShellfishTransactionAuthorization(
    draft,
    makeAuthorization(),
  );
  assert.equal(result.allowed, false);
  assert.equal(
    result.reasons.includes(
      "Shellfish transaction authorization network mismatch.",
    ),
    true,
  );
});

test("rejects authorization that carries signing authority", () => {
  const authorization = makeAuthorization();
  authorization.transaction_sign_allowed = true;
  authorization.signature = "0".repeat(64);
  const result = verifyShellfishTransactionAuthorization(
    makeDraft(),
    authorization,
  );
  assert.equal(result.allowed, false);
  assert.equal(
    result.reasons.includes(
      "Shellfish transaction signing authority must remain false.",
    ),
    true,
  );
});
