import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { app } from "../src/index.js";
import { signAssuranceGrantForTest } from "../src/services/assurance.js";
import type { AssuranceGrant, JobRequest } from "../src/types/domain.js";

const TEST_KEY_HEX = "11".repeat(32);
const REPLAY_PATH = resolve(".runtime/assurance-replay.test.json");

process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX = TEST_KEY_HEX;
process.env.ASSURANCE_REPLAY_STORE_PATH = REPLAY_PATH;

rmSync(REPLAY_PATH, { force: true });

let sequence = 0;

type UnsignedGrant = Omit<AssuranceGrant, "signature">;

function makeGrant(
  overrides: Partial<UnsignedGrant> = {},
): AssuranceGrant {
  sequence += 1;
  const now = Date.now();

  const grant: UnsignedGrant = {
    grantId: `grant-${sequence}`,
    signatureAlgorithm: "HMAC-SHA256",
    authorized: true,
    issuedAt: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    nonce: `nonce-${sequence}`,
    task: "summarize_document",
    providerId: "small-fast-1",
    maxCostMicrounits: 50_000,
    allowPayment: false,
    allowTrustedMemoryWrite: false,
    ...overrides,
  };

  return signAssuranceGrantForTest(
    grant,
    TEST_KEY_HEX,
  );
}

function requestBody(
  assuranceGrant?: AssuranceGrant,
): JobRequest & { assuranceGrant?: AssuranceGrant } {
  return {
    task: "summarize_document",
    maxCostMicrounits: 50_000,
    maxLatencyMs: 3_000,
    minimumQuality: 0.85,
    privacy: "no-retention",
    ...(assuranceGrant ? { assuranceGrant } : {}),
  };
}

async function withServer(
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolvePromise, reject) =>
      server.close((error) =>
        error ? reject(error) : resolvePromise(),
      ),
    );
  }
}

async function postJob(
  baseUrl: string,
  body: unknown,
): Promise<Response> {
  return fetch(baseUrl + "/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("rejects job execution when assurance grant is missing", async () => {
  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_REQUIRED");
  });
});

test("rejects malformed assurance grant", async () => {
  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      {
        ...requestBody(),
        assuranceGrant: {},
      },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_INVALID");
  });
});

test("rejects expired assurance grant", async () => {
  const now = Date.now();
  const grant = makeGrant({
    issuedAt: new Date(now - 120_000).toISOString(),
    expiresAt: new Date(now - 60_000).toISOString(),
  });

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(
      body.error,
      "ASSURANCE_EXPIRED_OR_INVALID_TIME",
    );
  });
});

test("rejects assurance grant with invalid HMAC signature", async () => {
  const validGrant = makeGrant();
  const forgedGrant: AssuranceGrant = {
    ...validGrant,
    signature: "00".repeat(32),
  };

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(forgedGrant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(
      body.error,
      "ASSURANCE_SIGNATURE_INVALID",
    );
  });
});

test("rejects signed grant after protected field is tampered", async () => {
  const validGrant = makeGrant();
  const tamperedGrant: AssuranceGrant = {
    ...validGrant,
    task: "different_task",
  };

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(tamperedGrant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(
      body.error,
      "ASSURANCE_SIGNATURE_INVALID",
    );
  });
});

test("rejects assurance grant with mismatched task", async () => {
  const grant = makeGrant({
    task: "different_task",
  });

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_MISMATCH");
  });
});

test("rejects assurance grant with mismatched provider", async () => {
  const grant = makeGrant({
    providerId: "wrong-provider",
  });

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_MISMATCH");
  });
});

test("rejects assurance grant below route cost", async () => {
  const grant = makeGrant({
    maxCostMicrounits: 1,
  });

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "ASSURANCE_MISMATCH");
  });
});

test("executes job with valid authenticated assurance grant", async () => {
  const grant = makeGrant();

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.providerId, "small-fast-1");
    assert.equal(typeof body.jobId, "string");
  });
});

test("persists used nonce and rejects replay", async () => {
  const grant = makeGrant();

  await withServer(async (baseUrl) => {
    const first = await postJob(
      baseUrl,
      requestBody(grant),
    );

    assert.equal(first.status, 201);
    assert.equal(existsSync(REPLAY_PATH), true);

    const replayState = JSON.parse(
      readFileSync(REPLAY_PATH, "utf8"),
    ) as Record<string, unknown>;

    assert.ok(grant.nonce in replayState);

    const second = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await second.json();

    assert.equal(second.status, 403);
    assert.equal(body.error, "ASSURANCE_REPLAYED");
  });
});

test("rejects assurance grant issued in the future", async () => {
  const now = Date.now();
  const grant = makeGrant({
    issuedAt: new Date(now + 60_000).toISOString(),
    expiresAt: new Date(now + 120_000).toISOString(),
  });

  await withServer(async (baseUrl) => {
    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(
      body.error,
      "ASSURANCE_EXPIRED_OR_INVALID_TIME",
    );
  });
});

test("rejected assurance mismatch does not change ledger balance", async () => {
  const grant = makeGrant({
    task: "different_task",
  });

  await withServer(async (baseUrl) => {
    const before = await fetch(
      baseUrl + "/balance",
    );
    const beforeBody = await before.json();

    const response = await postJob(
      baseUrl,
      requestBody(grant),
    );

    assert.equal(response.status, 403);

    const after = await fetch(
      baseUrl + "/balance",
    );
    const afterBody = await after.json();

    assert.equal(
      afterBody.availableMicrounits,
      beforeBody.availableMicrounits,
    );
  });
});
