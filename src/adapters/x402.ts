import crypto from "node:crypto";
import type { JobRequest, ProviderExecution } from "../types/domain.js";
import type { DiscoveredProvider } from "./hub.js";

export interface X402Challenge {
  status: 402;
  providerId: string;
  endpoint: string;
  jobId: string;
  requestHash: string;
  paymentRequired?: string;
  challengeBody?: unknown;
}

function requestHash(request: JobRequest): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    task: request.task,
    prompt: request.prompt,
  })).digest("hex");
}

async function parseBody(response: Response): Promise<unknown> {
  const type = response.headers.get("content-type") ?? "";
  return type.includes("application/json") ? response.json() : response.text();
}

export async function executeX402Provider(
  provider: DiscoveredProvider,
  request: JobRequest,
  jobId: string,
): Promise<ProviderExecution & { receipt?: unknown; challenge?: X402Challenge }> {
  if (!provider.endpoint) throw new Error("The discovered provider has no endpoint.");
  const startedAt = Date.now();
  const hash = requestHash(request);

  const send = (paymentToken?: string) => fetch(provider.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wave-router-job": jobId,
      "x-wave-router-request-hash": hash,
      ...(paymentToken ? { "x-payment": paymentToken } : {}),
    },
    body: JSON.stringify({ prompt: request.prompt, task: request.task, jobId }),
    signal: AbortSignal.timeout(30_000),
  });

  let response = await send();
  if (response.status === 402) {
    const challenge: X402Challenge = {
      status: 402,
      providerId: provider.id,
      endpoint: provider.endpoint,
      jobId,
      requestHash: hash,
      paymentRequired: response.headers.get("payment-required") ?? response.headers.get("www-authenticate") ?? undefined,
      challengeBody: await parseBody(response),
    };

    const paymentToken = process.env.X402_PAYMENT_TOKEN?.trim();
    if (!paymentToken) {
      return {
        output: "Payment authorization is required before this provider can execute the job.",
        executionMode: "demo",
        model: provider.model,
        durationMs: Date.now() - startedAt,
        challenge,
      };
    }

    response = await send(paymentToken);
  }

  const payload = await parseBody(response);
  if (!response.ok) throw new Error(`Provider execution failed (${response.status}).`);

  const object = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const output = typeof object.output === "string"
    ? object.output
    : typeof object.result === "string"
      ? object.result
      : typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

  return {
    output,
    executionMode: "live",
    model: provider.model,
    durationMs: Date.now() - startedAt,
    receipt: object.receipt ?? object.paymentReceipt,
  };
}
