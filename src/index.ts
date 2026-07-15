import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InMemoryLedger } from "./adapters/ledger.js";
import { SimulatedIlpAdapter } from "./adapters/openPayments.js";
import { executeProvider } from "./services/executor.js";
import { providerOffers } from "./services/providers.js";
import { findBestRoute } from "./services/router.js";
import type { JobRequest, JobResult } from "./types/domain.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

const ledger = new InMemoryLedger();
const ilp = new SimulatedIlpAdapter();
const recentJobs: Array<JobResult & { createdAt: string; status: "completed" }> = [];

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xrpl-wave-router",
    version: "0.3.0",
    execution: process.env.OPENAI_API_KEY ? "live" : "demo",
    rails: {
      intelligenceRouting: "pathfinder",
      paymentRouting: "ILP",
      settlementTarget: "XRPL",
      x402: "optional-handshake",
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
    if (!request.prompt?.trim()) throw new Error("Enter a task prompt before routing.");
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
    if (!request.prompt?.trim()) throw new Error("Enter a task prompt before execution.");

    const route = findBestRoute(request, providerOffers);
    await ledger.reserve(jobId, route.reservedMicrounits);

    const ilpQuote = await ilp.quote(
      route.provider.walletAddress ?? `https://providers.wave-router.local/${route.provider.id}`,
      String(route.reservedMicrounits),
    );

    const execution = await executeProvider(route.provider, request);
    const ilpReceipt = await ilp.pay(ilpQuote);
    await ledger.post(jobId, route.reservedMicrounits);

    const result: JobResult & {
      paymentRoute: unknown;
      paymentReceipt: unknown;
      createdAt: string;
      status: "completed";
    } = {
      jobId,
      providerId: route.provider.id,
      output: execution.output,
      chargedMicrounits: route.reservedMicrounits,
      routeScore: route.score,
      executionMode: execution.executionMode,
      model: execution.model,
      durationMs: execution.durationMs,
      inputTokens: execution.inputTokens,
      outputTokens: execution.outputTokens,
      paymentRoute: ilpQuote,
      paymentReceipt: ilpReceipt,
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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`XRPL Wave Router listening on http://localhost:${port}`);
});
