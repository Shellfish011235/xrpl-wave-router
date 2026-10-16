import "dotenv/config";
import crypto from "node:crypto";
import {
  signExecutionGrantForTest,
} from "./services/assurance.js";
import type {
  ExecutionGrant,
  JobRequest,
  RouteReceipt,
  RouteQuote,
} from "./types/domain.js";

const baseUrl =
  process.env.WAVE_ROUTER_URL ??
  "http://localhost:3000";

const keyHex =
  process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX?.trim();

if (!keyHex) {
  throw new Error(
    "Set SHELLFISH_ASSURANCE_HMAC_KEY_HEX before running the demo.",
  );
}

const request: JobRequest = {
  task: "summarize_document",
  maxCostMicrounits: 50000,
  maxLatencyMs: 3000,
  minimumQuality: 0.85,
  privacy: "no-retention",
};

const taskId = crypto.randomUUID();

const routeResponse = await fetch(
  `${baseUrl}/route`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      taskId,
      ...request,
    }),
  },
);

if (!routeResponse.ok) {
  throw new Error(
    `Route request failed: ${routeResponse.status} ${await routeResponse.text()}`,
  );
}

const routed = (await routeResponse.json()) as {
  route: RouteQuote;
  routeReceipt: RouteReceipt;
};

const now = new Date();
const expires = new Date(
  now.getTime() + 5 * 60_000,
);

const unsignedGrant: Omit<
  ExecutionGrant,
  "signature"
> = {
  grant_id: crypto.randomUUID(),
  task_id: taskId,
  nonce: crypto.randomUUID(),
  route_receipt_id:
    routed.routeReceipt.receipt_id,
  route_receipt_hash:
    routed.routeReceipt.receipt_hash,
  provider_id: routed.route.provider.id,
  capability: request.task,
  max_cost_microunits:
    routed.route.reservedMicrounits,
  execution_allowed: true,
  network_allowed: true,
  payment_allowed: false,
  trusted_memory_write_allowed: false,
  created_at: now.toISOString(),
  expires_at: expires.toISOString(),
  signature_algorithm: "HMAC-SHA256",
};

const executionGrant =
  signExecutionGrantForTest(
    unsignedGrant,
    keyHex,
  );

const executionResponse = await fetch(
  `${baseUrl}/jobs`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...request,
      taskId,
      routeReceipt:
        routed.routeReceipt,
      executionGrant,
    }),
  },
);

const resultText =
  await executionResponse.text();

if (!executionResponse.ok) {
  throw new Error(
    `Execution failed: ${executionResponse.status} ${resultText}`,
  );
}

console.log(
  JSON.stringify(
    {
      taskId,
      selectedProvider:
        routed.route.provider.id,
      routeScore:
        routed.route.score,
      assurance: {
        routeReceipt:
          routed.routeReceipt.receipt_id,
        grant: executionGrant.grant_id,
        replayProtected: true,
        paymentAuthority: false,
      },
      result: JSON.parse(resultText),
    },
    null,
    2,
  ),
);
