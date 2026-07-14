import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InMemoryLedger } from "./adapters/ledger.js";
import { DisabledOpenPaymentsAdapter } from "./adapters/openPayments.js";
import { executeProvider } from "./services/executor.js";
import { providerOffers } from "./services/providers.js";
import { findBestRoute } from "./services/router.js";
import type { JobRequest, JobResult } from "./types/domain.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

app.use(express.json());
app.use(express.static(publicDir));

const ledger = new InMemoryLedger();
const payments = new DisabledOpenPaymentsAdapter();
const recentJobs: Array<JobResult & { createdAt: string; status: "completed" }> = [];

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xrpl-wave-router",
    version: "0.1.0",
    rails: {
      xrpl: "adapter-ready",
      ilp: "simulated",
      tigerBeetle: "simulated",
    },
  });
});

app.get("/providers", (_req, res) => {
  res.json(providerOffers);
});

app.get("/balance", async (_req, res) => {
  res.json({ availableMicrounits: await ledger.balance() });
});

app.get("/jobs", (_req, res) => {
  res.json(recentJobs.slice(0, 20));
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

    const result: JobResult & {
      paymentQuote: unknown;
      createdAt: string;
      status: "completed";
    } = {
      jobId,
      providerId: route.provider.id,
      output,
      chargedMicrounits: route.reservedMicrounits,
      routeScore: route.score,
      paymentQuote,
      createdAt: new Date().toISOString(),
      status: "completed",
    };

    recentJobs.unshift(result);
    if (recentJobs.length > 100) recentJobs.length = 100;

    res.status(201).json(result);
  } catch (error) {
    await ledger.void(jobId);
    res.status(422).json({
      jobId,
      error: error instanceof Error ? error.message : "Job failed.",
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`XRPL Wave Router listening on http://localhost:${port}`);
});
