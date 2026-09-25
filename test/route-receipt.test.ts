import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyRouteReceiptHash,
} from "../src/services/assurance.js";
import {
  buildRouteReceipt,
} from "../src/services/routeReceipt.js";
import type {
  RouteQuote,
} from "../src/types/domain.js";

const route: RouteQuote = {
  provider: {
    id: "demo-provider",
    capability: "summarize_document",
    priceMicrounits: 12000,
    latencyMs: 500,
    quality: 0.9,
    privacy: "no-retention",
    available: true,
    acceptedAsset: {
      currency: "XRP",
    },
  },
  score: 0.1,
  reservedMicrounits: 12000,
  reasons: ["demo"],
};

test("buildRouteReceipt binds task and selected route", () => {
  const receipt =
    buildRouteReceipt("task-123", route);

  assert.equal(
    receipt.task_id,
    "task-123",
  );
  assert.equal(
    receipt.provider_id,
    "demo-provider",
  );
  assert.equal(
    receipt.capability_required,
    "summarize_document",
  );
  assert.equal(
    receipt.reserved_microunits,
    12000,
  );
  assert.equal(
    receipt.execution_authorized,
    false,
  );
  assert.equal(
    receipt.payment_authorized,
    false,
  );
  assert.equal(
    verifyRouteReceiptHash(receipt),
    true,
  );
});

test("route receipt hash detects tampering", () => {
  const receipt =
    buildRouteReceipt("task-123", route);

  const tampered = {
    ...receipt,
    provider_id: "other-provider",
  };

  assert.equal(
    verifyRouteReceiptHash(tampered),
    false,
  );
});
