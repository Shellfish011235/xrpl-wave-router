import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { InMemoryLedger } from "./adapters/ledger.js";
import { DisabledOpenPaymentsAdapter } from "./adapters/openPayments.js";
import { executeProvider } from "./services/executor.js";
import { providerOffers } from "./services/providers.js";
import { findBestRoute } from "./services/router.js";
import type { JobRequest, JobResult } from "./types/domain.js";

const app = express();
app.use(express.json());

const ledger = new InMemoryLedger();
const payments = new DisabledOpenPaymentsAdapter();

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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`XRPL AI Pathfinder MVP listening on http://localhost:${port}`);
});
