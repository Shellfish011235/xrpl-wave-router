import assert from "node:assert/strict";
import test from "node:test";

import {
  buildXrplTransactionIntent,
} from "../src/services/xrplTransactionIntent.js";

import type {
  ExecutionGrant,
  RouteReceipt,
} from "../src/types/domain.js";


function buildRouteReceipt():
  RouteReceipt {
  return {
    receipt_id:
      "ROUTE_RECEIPT_1",

    receipt_hash:
      "abc123",

    task_id:
      "TASK_1",

    provider_id:
      "provider-alpha",

    capability_required:
      "inference",

    reserved_microunits:
      1000,

    execution_authorized:
      true,

    payment_authorized:
      false,

    trusted_memory_write_authorized:
      false,
  };
}


function buildExecutionGrant():
  ExecutionGrant {
  return {
    grant_id:
      "GRANT_1",

    task_id:
      "TASK_1",

    nonce:
      "NONCE_1",

    route_receipt_id:
      "ROUTE_RECEIPT_1",

    route_receipt_hash:
      "abc123",

    provider_id:
      "provider-alpha",

    capability:
      "inference",

    max_cost_microunits:
      1000,

    execution_allowed:
      true,

    network_allowed:
      true,

    payment_allowed:
      false,

    trusted_memory_write_allowed:
      false,

    created_at:
      "2026-09-24T12:00:00.000Z",

    expires_at:
      "2026-09-24T13:00:00.000Z",

    signature_algorithm:
      "HMAC-SHA256",

    signature:
      "signature",
  };
}


test(
  "builds testnet XRPL transaction intent without transaction authority",
  () => {
    const intent =
      buildXrplTransactionIntent({
        network:
          "testnet",

        taskId:
          "TASK_1",

        sourceAccount:
          "rSource111111111111111111111111",

        destinationAccount:
          "rDestination11111111111111111111",

        amountDrops:
          "1000000",

        routeReceipt:
          buildRouteReceipt(),

        executionGrant:
          buildExecutionGrant(),
      });

    assert.equal(
      intent.intent_type,
      "XRPL_TRANSACTION_INTENT",
    );

    assert.equal(
      intent.network,
      "testnet",
    );

    assert.equal(
      intent.task_id,
      "TASK_1",
    );

    assert.equal(
      intent.route_receipt_id,
      "ROUTE_RECEIPT_1",
    );

    assert.equal(
      intent.route_receipt_hash,
      "abc123",
    );

    assert.equal(
      intent.provider_id,
      "provider-alpha",
    );

    assert.equal(
      intent.capability,
      "inference",
    );

    assert.equal(
      intent.amount_drops,
      "1000000",
    );

    assert.equal(
      intent.transaction_build_authorized,
      false,
    );

    assert.equal(
      intent.wallet_signing_authorized,
      false,
    );

    assert.equal(
      intent.transaction_submission_authorized,
      false,
    );

    assert.equal(
      intent.mainnet_authorized,
      false,
    );

    assert.equal(
      intent.human_approval_required,
      true,
    );
  },
);


test(
  "builds devnet XRPL transaction intent",
  () => {
    const intent =
      buildXrplTransactionIntent({
        network:
          "devnet",

        taskId:
          "TASK_1",

        sourceAccount:
          "rSource111111111111111111111111",

        destinationAccount:
          "rDestination11111111111111111111",

        amountDrops:
          "0005000",

        routeReceipt:
          buildRouteReceipt(),

        executionGrant:
          buildExecutionGrant(),
      });

    assert.equal(
      intent.network,
      "devnet",
    );

    assert.equal(
      intent.amount_drops,
      "5000",
    );
  },
);


test(
  "rejects XRPL mainnet transaction intent",
  () => {
    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "mainnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant:
            buildExecutionGrant(),
        }),
      /restricted to testnet or devnet/,
    );
  },
);


test(
  "rejects route receipt task binding mismatch",
  () => {
    const routeReceipt =
      buildRouteReceipt();

    routeReceipt.task_id =
      "OTHER_TASK";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt,

          executionGrant:
            buildExecutionGrant(),
        }),
      /route receipt task binding mismatch/,
    );
  },
);


test(
  "rejects execution grant task binding mismatch",
  () => {
    const executionGrant =
      buildExecutionGrant();

    executionGrant.task_id =
      "OTHER_TASK";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant,
        }),
      /execution grant task binding mismatch/,
    );
  },
);


test(
  "rejects route receipt ID binding mismatch",
  () => {
    const executionGrant =
      buildExecutionGrant();

    executionGrant.route_receipt_id =
      "OTHER_RECEIPT";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant,
        }),
      /route receipt ID binding mismatch/,
    );
  },
);


test(
  "rejects route receipt hash binding mismatch",
  () => {
    const executionGrant =
      buildExecutionGrant();

    executionGrant.route_receipt_hash =
      "tampered";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant,
        }),
      /route receipt hash binding mismatch/,
    );
  },
);


test(
  "rejects provider binding mismatch",
  () => {
    const executionGrant =
      buildExecutionGrant();

    executionGrant.provider_id =
      "provider-beta";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant,
        }),
      /provider binding mismatch/,
    );
  },
);


test(
  "rejects capability binding mismatch",
  () => {
    const executionGrant =
      buildExecutionGrant();

    executionGrant.capability =
      "other-capability";

    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant,
        }),
      /capability binding mismatch/,
    );
  },
);


test(
  "rejects invalid drops amount",
  () => {
    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1.5",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant:
            buildExecutionGrant(),
        }),
      /non-negative integer string in drops/,
    );
  },
);


test(
  "rejects missing source account",
  () => {
    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "   ",

          destinationAccount:
            "rDestination11111111111111111111",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant:
            buildExecutionGrant(),
        }),
      /Source account is required/,
    );
  },
);


test(
  "rejects missing destination account",
  () => {
    assert.throws(
      () =>
        buildXrplTransactionIntent({
          network:
            "testnet",

          taskId:
            "TASK_1",

          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            " ",

          amountDrops:
            "1000",

          routeReceipt:
            buildRouteReceipt(),

          executionGrant:
            buildExecutionGrant(),
        }),
      /Destination account is required/,
    );
  },
);