import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { InMemoryLedger } from "./adapters/ledger.js";
import { DisabledOpenPaymentsAdapter } from "./adapters/openPayments.js";
import {
  verifyExecutionGrantSignature,
  verifyRouteReceiptHash,
} from "./services/assurance.js";
import { executeProvider } from "./services/executor.js";
import { providerOffers } from "./services/providers.js";
import { consumeAssuranceNonce } from "./services/replayStore.js";
import { findBestRoute } from "./services/router.js";
import { buildSettlementIntent } from "./services/settlementIntent.js";
import type {
  AuthorizedJobRequest,
  ExecutionGrant,
  JobRequest,
  JobResult,
  RouteReceipt,
} from "./types/domain.js";

export const app = express();

app.use(express.json());

const ledger = new InMemoryLedger();
const payments = new DisabledOpenPaymentsAdapter();

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function isStructurallyValidExecutionGrant(
  grant: unknown,
): grant is ExecutionGrant {
  if (
    grant === null ||
    typeof grant !== "object"
  ) {
    return false;
  }

  const candidate =
    grant as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.grant_id) &&
    isNonEmptyString(candidate.task_id) &&
    isNonEmptyString(candidate.nonce) &&
    isNonEmptyString(
      candidate.route_receipt_id,
    ) &&
    isNonEmptyString(
      candidate.route_receipt_hash,
    ) &&
    isNonEmptyString(candidate.provider_id) &&
    isNonEmptyString(candidate.capability) &&
    typeof candidate.max_cost_microunits ===
      "number" &&
    Number.isSafeInteger(
      candidate.max_cost_microunits,
    ) &&
    candidate.max_cost_microunits >= 0 &&
    candidate.execution_allowed === true &&
    candidate.network_allowed === true &&
    candidate.payment_allowed === false &&
    candidate.trusted_memory_write_allowed ===
      false &&
    isNonEmptyString(candidate.created_at) &&
    isNonEmptyString(candidate.expires_at) &&
    candidate.signature_algorithm ===
      "HMAC-SHA256" &&
    isNonEmptyString(candidate.signature)
  );
}

function isStructurallyValidRouteReceipt(
  receipt: unknown,
): receipt is RouteReceipt {
  if (
    receipt === null ||
    typeof receipt !== "object"
  ) {
    return false;
  }

  const candidate =
    receipt as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.receipt_id) &&
    isNonEmptyString(candidate.receipt_hash) &&
    isNonEmptyString(candidate.task_id) &&
    isNonEmptyString(candidate.provider_id) &&
    isNonEmptyString(
      candidate.capability_required,
    ) &&
    typeof candidate.reserved_microunits ===
      "number" &&
    Number.isSafeInteger(
      candidate.reserved_microunits,
    ) &&
    candidate.reserved_microunits >= 0 &&
    candidate.execution_authorized === false &&
    candidate.payment_authorized === false &&
    candidate.trusted_memory_write_authorized ===
      false
  );
}

function isTemporallyValidExecutionGrant(
  grant: ExecutionGrant,
  now = Date.now(),
): boolean {
  const createdAt = Date.parse(
    grant.created_at,
  );
  const expiresAt = Date.parse(
    grant.expires_at,
  );

  return (
    Number.isFinite(createdAt) &&
    Number.isFinite(expiresAt) &&
    createdAt <= now &&
    expiresAt > now &&
    expiresAt > createdAt
  );
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xrpl-ai-pathfinder-mvp",
  });
});

app.get("/providers", (_req, res) => {
  res.json(providerOffers);
});

app.get("/balance", async (_req, res) => {
  res.json({
    availableMicrounits:
      await ledger.balance(),
  });
});

app.post("/quote", (req, res) => {
  try {
    const request = req.body as JobRequest;
    res.json(
      findBestRoute(
        request,
        providerOffers,
      ),
    );
  } catch (error) {
    res.status(422).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to quote route.",
    });
  }
});

app.post("/jobs", async (req, res) => {
  const body =
    req.body as Partial<AuthorizedJobRequest>;

  const executionGrant =
    body.executionGrant;
  const routeReceipt =
    body.routeReceipt;
  const taskId =
    body.taskId;

  if (
    !executionGrant ||
    !routeReceipt ||
    !isNonEmptyString(taskId)
  ) {
    res.status(403).json({
      error: "ASSURANCE_REQUIRED",
    });
    return;
  }

  if (
    !isStructurallyValidExecutionGrant(
      executionGrant,
    ) ||
    !isStructurallyValidRouteReceipt(
      routeReceipt,
    )
  ) {
    res.status(403).json({
      error: "ASSURANCE_INVALID",
    });
    return;
  }

  if (
    !isTemporallyValidExecutionGrant(
      executionGrant,
    )
  ) {
    res.status(403).json({
      error:
        "ASSURANCE_EXPIRED_OR_INVALID_TIME",
    });
    return;
  }

  if (
    !verifyExecutionGrantSignature(
      executionGrant,
    )
  ) {
    res.status(403).json({
      error:
        "ASSURANCE_SIGNATURE_INVALID",
    });
    return;
  }

  if (
    !verifyRouteReceiptHash(
      routeReceipt,
    )
  ) {
    res.status(403).json({
      error:
        "ROUTE_RECEIPT_INTEGRITY_INVALID",
    });
    return;
  }

  const jobId = crypto.randomUUID();

  try {
    const request =
      body as AuthorizedJobRequest;

    const route = findBestRoute(
      request,
      providerOffers,
    );

    const assuranceMismatch =
      executionGrant.task_id !== taskId ||
      routeReceipt.task_id !== taskId ||
      executionGrant.route_receipt_id !==
        routeReceipt.receipt_id ||
      executionGrant.route_receipt_hash !==
        routeReceipt.receipt_hash ||
      executionGrant.provider_id !==
        routeReceipt.provider_id ||
      routeReceipt.provider_id !==
        route.provider.id ||
      executionGrant.capability !==
        routeReceipt.capability_required ||
      executionGrant.capability !==
        request.task ||
      routeReceipt.capability_required !==
        request.task ||
      executionGrant.max_cost_microunits <
        route.reservedMicrounits ||
      executionGrant.max_cost_microunits <
        routeReceipt.reserved_microunits ||
      routeReceipt.reserved_microunits !==
        route.reservedMicrounits;

    if (assuranceMismatch) {
      res.status(403).json({
        jobId,
        error: "ASSURANCE_MISMATCH",
      });
      return;
    }

    if (
      !consumeAssuranceNonce(
        executionGrant.nonce,
        executionGrant.expires_at,
      )
    ) {
      res.status(403).json({
        jobId,
        error: "ASSURANCE_REPLAYED",
      });
      return;
    }

    await ledger.reserve(
      jobId,
      route.reservedMicrounits,
    );

    const paymentQuote =
      await payments.quote(
        route.provider.walletAddress ??
          "https://example.invalid/provider",
        String(route.reservedMicrounits),
      );

    const output =
      await executeProvider(
        route.provider,
        request.task,
      );

    await ledger.post(
      jobId,
      route.reservedMicrounits,
    );

    const result:
      JobResult & {
        paymentQuote: unknown;
      } = {
        jobId,
        providerId: route.provider.id,
        output,
        chargedMicrounits:
          route.reservedMicrounits,
        routeScore: route.score,
        paymentQuote,
      };

    res.status(201).json(result);
  } catch (error) {
    await ledger.void(jobId);

    res.status(422).json({
      jobId,
      error:
        error instanceof Error
          ? error.message
          : "Job failed.",
    });
  }
});

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    resolve(process.argv[1]);

if (isMainModule) {
  const port = Number(
    process.env.PORT ?? 3000,
  );

  app.listen(port, () => {
    console.log(
      `XRPL AI Pathfinder MVP listening on http://localhost:${port}`,
    );
  });
}
