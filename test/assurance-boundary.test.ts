import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { app } from "../src/index.js";
import {
  calculateRouteReceiptHash,
  signExecutionGrantForTest,
  verifyExecutionGrantSignature,
  verifyRouteReceiptHash,
} from "../src/services/assurance.js";
import { providerOffers } from "../src/services/providers.js";
import { findBestRoute } from "../src/services/router.js";
import type {
  AuthorizedJobRequest,
  ExecutionGrant,
  JobRequest,
  RouteReceipt,
} from "../src/types/domain.js";

const TEST_KEY_HEX = "11".repeat(32);
const REPLAY_PATH = resolve(
  ".runtime/assurance-replay.test.json",
);

process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX =
  TEST_KEY_HEX;
process.env.ASSURANCE_REPLAY_STORE_PATH =
  REPLAY_PATH;

rmSync(
  REPLAY_PATH,
  { force: true },
);

let sequence = 0;

function baseRequest(): JobRequest {
  return {
    task: "summarize_document",
    maxCostMicrounits: 50_000,
    maxLatencyMs: 3_000,
    minimumQuality: 0.85,
    privacy: "no-retention",
  };
}

function makeRouteReceipt(
  overrides: Partial<RouteReceipt> = {},
): RouteReceipt {
  sequence += 1;

  const request = baseRequest();
  const route = findBestRoute(
    request,
    providerOffers,
  );

  const unsigned = {
    receipt_id:
      "ROUTE_RECEIPT_" + sequence,
    receipt_type:
      "PROVIDER_ROUTE_DECISION",
    task_id:
      "TASK_" + sequence,
    job_id:
      "JOB_" + sequence,
    shellfish_job_envelope_id:
      "SHELLFISH_JOB_" + sequence,
    objective:
      "test objective",
    capability_required:
      request.task,
    provider_id:
      route.provider.id,
    route_score:
      route.score,
    reserved_microunits:
      route.reservedMicrounits,
    route_reasons:
      route.reasons,
    execution_authorized:
      false,
    payment_authorized:
      false,
    trusted_memory_write_authorized:
      false,
    created_at:
      new Date().toISOString(),
    ...overrides,
  };

  const receipt = {
    ...unsigned,
    receipt_hash: "",
  } as RouteReceipt;

  receipt.receipt_hash =
    calculateRouteReceiptHash(
      receipt,
    );

  return receipt;
}

function makeExecutionGrant(
  routeReceipt: RouteReceipt,
  overrides: Partial<
    Omit<ExecutionGrant, "signature">
  > = {},
): ExecutionGrant {
  const now = Date.now();

  const unsigned:
    Omit<ExecutionGrant, "signature"> = {
      grant_id:
        "EXEC_GRANT_" + sequence,
      task_id:
        routeReceipt.task_id,
      nonce:
        "nonce-" + sequence + "-" + Date.now(),
      route_receipt_id:
        routeReceipt.receipt_id,
      route_receipt_hash:
        routeReceipt.receipt_hash,
      provider_id:
        routeReceipt.provider_id,
      capability:
        routeReceipt.capability_required,
      max_cost_microunits:
        routeReceipt.reserved_microunits,
      execution_allowed:
        true,
      network_allowed:
        true,
      payment_allowed:
        false,
      trusted_memory_write_allowed:
        false,
      created_at:
        new Date(
          now - 1_000,
        ).toISOString(),
      expires_at:
        new Date(
          now + 60_000,
        ).toISOString(),
      signature_algorithm:
        "HMAC-SHA256",
      ...overrides,
    };

  return signExecutionGrantForTest(
    unsigned,
    TEST_KEY_HEX,
  );
}

function authorizedRequest(
  routeReceipt: RouteReceipt,
  executionGrant: ExecutionGrant,
  overrides: Partial<JobRequest> = {},
): AuthorizedJobRequest {
  return {
    ...baseRequest(),
    ...overrides,
    taskId:
      routeReceipt.task_id,
    routeReceipt,
    executionGrant,
  };
}

async function withServer(
  callback: (
    baseUrl: string,
  ) => Promise<void>,
): Promise<void> {
  const server = app.listen(0);

  try {
    const address =
      server.address();

    assert.ok(
      address &&
      typeof address === "object",
    );

    await callback(
      "http://127.0.0.1:" +
        address.port,
    );
  } finally {
    await new Promise<void>(
      (
        resolvePromise,
        reject,
      ) =>
        server.close(
          (error) =>
            error
              ? reject(error)
              : resolvePromise(),
        ),
    );
  }
}

async function postJob(
  baseUrl: string,
  body: unknown,
): Promise<Response> {
  return fetch(
    baseUrl + "/jobs",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body:
        JSON.stringify(body),
    },
  );
}

test(
  "rejects job execution when assurance artifacts are missing",
  async () => {
    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            baseRequest(),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_REQUIRED",
        );
      },
    );
  },
);

test(
  "rejects malformed Shellfish execution grant or route receipt",
  async () => {
    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            {
              ...baseRequest(),
              taskId: "TASK_BAD",
              routeReceipt: {},
              executionGrant: {},
            },
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_INVALID",
        );
      },
    );
  },
);

test(
  "rejects expired Shellfish execution grant",
  async () => {
    const receipt =
      makeRouteReceipt();

    const now = Date.now();

    const grant =
      makeExecutionGrant(
        receipt,
        {
          created_at:
            new Date(
              now - 120_000,
            ).toISOString(),
          expires_at:
            new Date(
              now - 60_000,
            ).toISOString(),
        },
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_EXPIRED_OR_INVALID_TIME",
        );
      },
    );
  },
);

test(
  "rejects invalid Shellfish HMAC signature",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );

    const forged = {
      ...grant,
      signature:
        "00".repeat(32),
    };

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              forged,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_SIGNATURE_INVALID",
        );
      },
    );
  },
);

test(
  "rejects signed execution grant after protected field tampering",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );

    const tampered = {
      ...grant,
      provider_id:
        "attacker-provider",
    };

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              tampered,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_SIGNATURE_INVALID",
        );
      },
    );
  },
);

test(
  "rejects tampered route receipt",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );

    const tamperedReceipt = {
      ...receipt,
      route_score:
        Number(
          receipt.route_score,
        ) + 1,
    };

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              tamperedReceipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ROUTE_RECEIPT_INTEGRITY_INVALID",
        );
      },
    );
  },
);

test(
  "rejects task binding mismatch",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );

    const request =
      authorizedRequest(
        receipt,
        grant,
      );

    request.taskId =
      "DIFFERENT_TASK_ID";

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            request,
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_MISMATCH",
        );
      },
    );
  },
);

test(
  "rejects provider binding mismatch",
  async () => {
    const receipt =
      makeRouteReceipt({
        provider_id:
          "wrong-provider",
      });
    const grant =
      makeExecutionGrant(
        receipt,
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_MISMATCH",
        );
      },
    );
  },
);

test(
  "rejects capability binding mismatch",
  async () => {
    const receipt =
      makeRouteReceipt({
        capability_required:
          "different_capability",
      });
    const grant =
      makeExecutionGrant(
        receipt,
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_MISMATCH",
        );
      },
    );
  },
);

test(
  "rejects signed cost ceiling below route cost",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
        {
          max_cost_microunits:
            Math.max(
              0,
              receipt.reserved_microunits -
                1,
            ),
        },
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_MISMATCH",
        );
      },
    );
  },
);

test(
  "executes job with Shellfish route receipt and signed execution grant",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          201,
        );
        assert.equal(
          body.providerId,
          receipt.provider_id,
        );
        assert.equal(
          typeof body.jobId,
          "string",
        );
      },
    );
  },
);

test(
  "persists signed nonce and rejects replay",
  async () => {
    const receipt =
      makeRouteReceipt();
    const grant =
      makeExecutionGrant(
        receipt,
      );
    const request =
      authorizedRequest(
        receipt,
        grant,
      );

    await withServer(
      async (baseUrl) => {
        const first =
          await postJob(
            baseUrl,
            request,
          );

        assert.equal(
          first.status,
          201,
        );
        assert.equal(
          existsSync(
            REPLAY_PATH,
          ),
          true,
        );

        const replayState =
          JSON.parse(
            readFileSync(
              REPLAY_PATH,
              "utf8",
            ),
          ) as Record<
            string,
            unknown
          >;

        assert.ok(
          grant.nonce
          in replayState,
        );

        const second =
          await postJob(
            baseUrl,
            request,
          );

        const body =
          await second.json();

        assert.equal(
          second.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_REPLAYED",
        );
      },
    );
  },
);

test(
  "rejects execution grant issued in the future",
  async () => {
    const receipt =
      makeRouteReceipt();

    const now = Date.now();

    const grant =
      makeExecutionGrant(
        receipt,
        {
          created_at:
            new Date(
              now + 60_000,
            ).toISOString(),
          expires_at:
            new Date(
              now + 120_000,
            ).toISOString(),
        },
      );

    await withServer(
      async (baseUrl) => {
        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        const body =
          await response.json();

        assert.equal(
          response.status,
          403,
        );
        assert.equal(
          body.error,
          "ASSURANCE_EXPIRED_OR_INVALID_TIME",
        );
      },
    );
  },
);

test(
  "rejected assurance mismatch does not change ledger balance",
  async () => {
    const receipt =
      makeRouteReceipt({
        provider_id:
          "wrong-provider",
      });
    const grant =
      makeExecutionGrant(
        receipt,
      );

    await withServer(
      async (baseUrl) => {
        const before =
          await fetch(
            baseUrl +
              "/balance",
          );

        const beforeBody =
          await before.json();

        const response =
          await postJob(
            baseUrl,
            authorizedRequest(
              receipt,
              grant,
            ),
          );

        assert.equal(
          response.status,
          403,
        );

        const after =
          await fetch(
            baseUrl +
              "/balance",
          );

        const afterBody =
          await after.json();

        assert.equal(
          afterBody.availableMicrounits,
          beforeBody.availableMicrounits,
        );
      },
    );
  },
);

test(
  "matches Python Shellfish HMAC canonicalization vector",
  () => {
    const grant: ExecutionGrant = {
      grant_id:
        "EXEC_GRANT_TEST",
      task_id:
        "TASK_TEST",
      nonce:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      route_receipt_id:
        "ROUTE_RECEIPT_TEST",
      route_receipt_hash:
        "b".repeat(64),
      provider_id:
        "small-fast-1",
      capability:
        "summarize_document",
      max_cost_microunits:
        1000,
      execution_allowed:
        true,
      network_allowed:
        true,
      payment_allowed:
        false,
      trusted_memory_write_allowed:
        false,
      created_at:
        "2026-09-21T14:00:00+00:00",
      expires_at:
        "2026-09-21T14:15:00+00:00",
      signature_algorithm:
        "HMAC-SHA256",
      signature: "",
    };

    const signed =
      signExecutionGrantForTest(
        grant,
        TEST_KEY_HEX,
      );

    assert.equal(
      signed.signature,
      "450f5fb129855ed58c6c6cd8ee69e105735457a2c4607e0c5059ba511c1250ae",
    );

    assert.equal(
      verifyExecutionGrantSignature(
        signed,
      ),
      true,
    );
  },
);

test(
  "matches Python Shellfish route receipt hash vector",
  () => {
    const receipt = {
      receipt_id:
        "ROUTE_RECEIPT_TEST",
      receipt_type:
        "PROVIDER_ROUTE_DECISION",
      task_id:
        "TASK_TEST",
      job_id:
        "JOB_TEST",
      shellfish_job_envelope_id:
        "SHELLFISH_JOB_TEST",
      objective:
        "test objective",
      capability_required:
        "summarize_document",
      provider_id:
        "small-fast-1",
      route_score:
        0.95,
      reserved_microunits:
        1000,
      route_reasons:
        ["test"],
      execution_authorized:
        false,
      payment_authorized:
        false,
      trusted_memory_write_authorized:
        false,
      created_at:
        "2026-09-21T14:00:00+00:00",
      receipt_hash:
        "9df5b225ed120c00cda2d5aea45492c9965245fbb3a5b215b479c9c60cbca1cb",
    } satisfies RouteReceipt;

    assert.equal(
      verifyRouteReceiptHash(
        receipt,
      ),
      true,
    );
  },
);
