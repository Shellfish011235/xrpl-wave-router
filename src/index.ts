import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { InMemoryLedger } from "./adapters/ledger.js";
import { DisabledOpenPaymentsAdapter } from "./adapters/openPayments.js";
import { executeProvider } from "./services/executor.js";
import { providerOffers } from "./services/providers.js";
import { findBestRoute } from "./services/router.js";
import type { AssuranceGrant, JobRequest, JobResult } from "./types/domain.js";

export const app = express();

app.use(express.json());

const ledger = new InMemoryLedger();
const payments = new DisabledOpenPaymentsAdapter();

function isStructurallyValidAssuranceGrant(grant: unknown): grant is AssuranceGrant {
  if (grant === null || typeof grant !== "object") return false;
  const candidate = grant as Record<string, unknown>;
  return typeof candidate.grantId === "string" && candidate.grantId.length > 0 && typeof candidate.signature === "string" && candidate.signature.length > 0 && candidate.authorized === true && typeof candidate.issuedAt === "string" && typeof candidate.expiresAt === "string" && typeof candidate.nonce === "string" && candidate.nonce.length > 0 && typeof candidate.task === "string" && candidate.task.length > 0 && typeof candidate.providerId === "string" && candidate.providerId.length > 0 && typeof candidate.maxCostMicrounits === "number" && Number.isSafeInteger(candidate.maxCostMicrounits) && candidate.maxCostMicrounits >= 0 && candidate.allowPayment === false && candidate.allowTrustedMemoryWrite === false;
}

function isTemporallyValidAssuranceGrant(grant: AssuranceGrant, now = Date.now()): boolean {
  const issuedAt = Date.parse(grant.issuedAt);
  const expiresAt = Date.parse(grant.expiresAt);
  return Number.isFinite(issuedAt) && Number.isFinite(expiresAt) && issuedAt <= now && expiresAt > now && expiresAt > issuedAt;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "xrpl-ai-pathfinder-mvp" });
});

app.get("/providers", (_req, res) => {
  res.json(providerOffers);
});

app.get("/balance", async (_req, res) => {
  res.json({ availableMicrounits: await ledger.balance() });
});

app.post("/quote", (req, res) => {
  try {
    const request = req.body as JobRequest;
    res.json(findBestRoute(request, providerOffers));
  } catch (error) {
    res.status(422).json({
      error: error instanceof Error ? error.message : "Unable to quote route.",
    });
  }
});

app.post("/jobs", async (req, res) => {
  const assuranceGrant = req.body?.assuranceGrant;

  if (!assuranceGrant) {
    res.status(403).json({
      error: "ASSURANCE_REQUIRED",
    });
    return;
  }

  if (!isStructurallyValidAssuranceGrant(assuranceGrant)) {
    res.status(403).json({
      error: "ASSURANCE_INVALID",
    });
    return;
  }

  if (!isTemporallyValidAssuranceGrant(assuranceGrant)) {
    res.status(403).json({
      error: "ASSURANCE_EXPIRED_OR_INVALID_TIME",
    });
    return;
  }

  const jobId = crypto.randomUUID();

  try {
    const request = req.body as JobRequest;
    const route = findBestRoute(request, providerOffers);

    await ledger.reserve(jobId, route.reservedMicrounits);

    const paymentQuote = await payments.quote(
      route.provider.walletAddress ?? "https://example.invalid/provider",
      String(route.reservedMicrounits),
    );

    const output = await executeProvider(route.provider, request.task);

    await ledger.post(jobId, route.reservedMicrounits);

    const result: JobResult & { paymentQuote: unknown } = {
      jobId,
      providerId: route.provider.id,
      output,
      chargedMicrounits: route.reservedMicrounits,
      routeScore: route.score,
      paymentQuote,
    };

    res.status(201).json(result);
  } catch (error) {
    await ledger.void(jobId);

    res.status(422).json({
      jobId,
      error: error instanceof Error ? error.message : "Job failed.",
    });
  }
});

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  const port = Number(process.env.PORT ?? 3000);

  app.listen(port, () => {
    console.log(
      `XRPL AI Pathfinder MVP listening on http://localhost:${port}`,
    );
  });
}