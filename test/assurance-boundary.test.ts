import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/index.js";

test("rejects job execution when assurance grant is missing", async () => {
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task: "summarize_document",
        maxCostMicrounits: 50000,
        maxLatencyMs: 3000,
        minimumQuality: 0.85,
        privacy: "no-retention",
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_REQUIRED");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("rejects malformed assurance grant", async () => {
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task: "summarize_document",
        maxCostMicrounits: 50000,
        maxLatencyMs: 3000,
        minimumQuality: 0.85,
        privacy: "no-retention",
        assuranceGrant: {},
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_INVALID");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
test("rejects expired assurance grant", async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const now = Date.now();
    const response = await fetch("http://127.0.0.1:" + address.port + "/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task: "summarize_document",
        maxCostMicrounits: 50000,
        maxLatencyMs: 3000,
        minimumQuality: 0.85,
        privacy: "no-retention",
        assuranceGrant: {
          grantId: "grant-expired",
          signature: "test-signature",
          authorized: true,
          issuedAt: new Date(now - 120000).toISOString(),
          expiresAt: new Date(now - 60000).toISOString(),
          nonce: "nonce-expired",
          task: "summarize_document",
          providerId: "small-fast-1",
          maxCostMicrounits: 50000,
          allowPayment: false,
          allowTrustedMemoryWrite: false
        }
      })
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_EXPIRED_OR_INVALID_TIME");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
