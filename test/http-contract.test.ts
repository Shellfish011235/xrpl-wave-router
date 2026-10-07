import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/index.js";

async function withServer(
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolvePromise, reject) => {
      server.close((error) =>
        error ? reject(error) : resolvePromise(),
      );
    });
  }
}

async function postJson(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<Response> {
  return fetch(baseUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("health exposes the canonical Wave service identity", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl + "/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      service: "xrpl-ai-pathfinder-mvp",
    });
  });
});

test("quote returns a deterministic route for a valid request", async () => {
  await withServer(async (baseUrl) => {
    const response = await postJson(baseUrl, "/quote", {
      task: "summarize_document",
      maxCostMicrounits: 50_000,
      maxLatencyMs: 3_000,
      minimumQuality: 0.85,
      privacy: "no-retention",
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as {
      provider: { id: string };
      reservedMicrounits: number;
      score: number;
      reasons: string[];
    };
    assert.equal(typeof payload.provider.id, "string");
    assert.ok(payload.provider.id);
    assert.ok(Number.isSafeInteger(payload.reservedMicrounits));
    assert.equal(typeof payload.score, "number");
    assert.ok(Array.isArray(payload.reasons));
  });
});

test("jobs require existing assurance material", async () => {
  await withServer(async (baseUrl) => {
    const response = await postJson(baseUrl, "/jobs", {
      task: "summarize_document",
      maxCostMicrounits: 50_000,
      maxLatencyMs: 3_000,
      minimumQuality: 0.85,
      privacy: "no-retention",
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "ASSURANCE_REQUIRED",
    });
  });
});

test("malformed quote input is bounded with 422", async () => {
  await withServer(async (baseUrl) => {
    const response = await postJson(baseUrl, "/quote", {});
    assert.equal(response.status, 422);
    const payload = await response.json() as { error?: unknown };
    assert.equal(typeof payload.error, "string");
    assert.equal((payload.error as string).includes("Error:"), false);
  });
});
