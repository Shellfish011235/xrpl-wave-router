import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryLedger } from "../src/adapters/ledger.js";
import { findBestRoute } from "../src/services/router.js";
import { providerOffers } from "../src/services/providers.js";
import type { JobRequest, ProviderOffer } from "../src/types/domain.js";

const openingBalance = 1_000_000;

const exampleRequest: JobRequest = {
  task: "summarize_document",
  maxCostMicrounits: 50000,
  maxLatencyMs: 3000,
  minimumQuality: 0.85,
  privacy: "no-retention",
};

function offer(overrides: Partial<ProviderOffer> & Pick<ProviderOffer, "id">): ProviderOffer {
  return {
    capability: "summarize_document",
    priceMicrounits: 10000,
    latencyMs: 100,
    quality: 1,
    privacy: "no-retention",
    available: true,
    acceptedAsset: { currency: "XRP" },
    ...overrides,
  };
}

test("negative, fractional, and NaN ledger amounts do not create or destroy funds", async () => {
  const negativeReserve = new InMemoryLedger();
  await assert.rejects(
    () => negativeReserve.reserve("job", -100),
    /non-negative safe integer/,
  );
  assert.equal(await negativeReserve.balance(), openingBalance);

  const fractional = new InMemoryLedger();
  await assert.rejects(
    () => fractional.reserve("job", 0.1),
    /non-negative safe integer/,
  );
  assert.equal(await fractional.balance(), openingBalance);

  const poisoned = new InMemoryLedger();
  await assert.rejects(
    () => poisoned.reserve("job", Number.NaN),
    /non-negative safe integer/,
  );
  assert.equal(await poisoned.balance(), openingBalance);

  const negativePost = new InMemoryLedger();
  await negativePost.reserve("job", 100);
  await assert.rejects(
    () => negativePost.post("job", -50),
    /non-negative safe integer/,
  );
  assert.equal(await negativePost.balance(), openingBalance - 100);
  await negativePost.void("job");
  assert.equal(await negativePost.balance(), openingBalance);
});

test("partial post releases only the unused reservation", async () => {
  const ledger = new InMemoryLedger();
  await ledger.reserve("job", 100);
  await ledger.post("job", 70);
  assert.equal(await ledger.balance(), openingBalance - 70);

  await assert.rejects(
    () => ledger.post("job", 10),
    /Reservation not found/,
  );
  assert.equal(await ledger.balance(), openingBalance - 70);
});

test("a charge above the reservation does not change the reserved balance", async () => {
  const ledger = new InMemoryLedger();
  await ledger.reserve("job", 100);
  await assert.rejects(
    () => ledger.post("job", 101),
    /Charge exceeds reservation/,
  );
  assert.equal(await ledger.balance(), openingBalance - 100);
  await ledger.void("job");
  assert.equal(await ledger.balance(), openingBalance);
});

test("zero-priced work can be reserved and posted without changing the balance", async () => {
  const ledger = new InMemoryLedger();
  await ledger.reserve("research", 0);
  await ledger.post("research", 0);
  assert.equal(await ledger.balance(), openingBalance);
});

test("documented summarize request still selects the cheaper no-retention provider", () => {
  const route = findBestRoute(exampleRequest, providerOffers);
  const cost = 12000 / 50000;
  const latency = 650 / 3000;
  const qualityRisk = 1 - 0.87;
  const score = (0.5 * cost) + (0.2 * latency) + (0.3 * qualityRisk);

  assert.equal(route.provider.id, "small-fast-1");
  assert.equal(route.reservedMicrounits, 12000);
  assert.equal(route.score, score);
});

test("a sub-unit latency ceiling does not invert provider rank", () => {
  const request: JobRequest = {
    task: "summarize_document",
    maxCostMicrounits: 100,
    maxLatencyMs: 0.5,
    minimumQuality: 0,
    privacy: "standard",
  };
  const slowFree = offer({ id: "slow-free", priceMicrounits: 0, latencyMs: 0.5, quality: 1 });
  const fastPaid = offer({ id: "fast-paid", priceMicrounits: 30, latencyMs: 0, quality: 1 });

  const route = findBestRoute(request, [slowFree, fastPaid]);

  assert.equal(route.provider.id, "fast-paid");
  assert.ok(route.score < 0.2);
});

test("quality above 1 and a negative price cannot outrank a valid offer", () => {
  const request: JobRequest = {
    task: "summarize_document",
    maxCostMicrounits: 50000,
    maxLatencyMs: 3000,
    minimumQuality: 0.85,
    privacy: "no-retention",
  };
  const perfect = offer({ id: "perfect", priceMicrounits: 10000, latencyMs: 100, quality: 1 });
  const inflated = offer({ id: "inflated", priceMicrounits: 10000, latencyMs: 100, quality: 1.5 });
  const minting = offer({ id: "mint", priceMicrounits: -500, latencyMs: 10, quality: 1 });

  assert.equal(findBestRoute(request, [perfect, inflated, minting]).provider.id, "perfect");
  assert.throws(
    () => findBestRoute(request, [inflated, minting]),
    /No provider satisfies/,
  );
});

test("constraints that coerce to zero fail closed instead of dropping the quality floor", () => {
  const cheapLowQuality = offer({
    id: "cheap-low",
    priceMicrounits: 1,
    latencyMs: 10,
    quality: 0.1,
    privacy: "no-retention",
  });
  const careful = offer({
    id: "careful",
    priceMicrounits: 100,
    latencyMs: 10,
    quality: 0.99,
    privacy: "no-retention",
  });

  for (const minimumQuality of ["", false, null]) {
    assert.throws(
      () => findBestRoute(
        {
          task: "summarize_document",
          maxCostMicrounits: 1000,
          maxLatencyMs: 3000,
          minimumQuality: minimumQuality as unknown as number,
          privacy: "no-retention",
        },
        [cheapLowQuality, careful],
      ),
      /Invalid job request/,
      `minimumQuality ${JSON.stringify(minimumQuality)} must be rejected`,
    );
  }
});

test("non-finite budgets are rejected instead of zeroing the cost and latency penalties", () => {
  assert.throws(
    () => findBestRoute(
      {
        task: "summarize_document",
        maxCostMicrounits: Number.POSITIVE_INFINITY,
        maxLatencyMs: Number.POSITIVE_INFINITY,
        minimumQuality: 0,
        privacy: "standard",
      },
      providerOffers,
    ),
    /Invalid job request/,
  );
});

test("a stricter privacy class satisfies a looser request, and the reverse does not", () => {
  const retained = offer({ id: "retained", privacy: "standard", quality: 1, priceMicrounits: 1 });
  const request: JobRequest = {
    task: "summarize_document",
    maxCostMicrounits: 100,
    maxLatencyMs: 1000,
    minimumQuality: 0,
    privacy: "no-retention",
  };

  assert.throws(
    () => findBestRoute(request, [retained]),
    /No provider satisfies/,
  );
  assert.equal(
    findBestRoute({ ...request, privacy: "standard" }, [retained]).provider.id,
    "retained",
  );
});

test("the free external-research offer remains selectable at a zero cost ceiling", () => {
  const route = findBestRoute(
    {
      task: "EXTERNAL_RESEARCH",
      maxCostMicrounits: 0,
      maxLatencyMs: 5000,
      minimumQuality: 0.9,
      privacy: "no-retention",
    },
    providerOffers,
  );

  assert.equal(route.provider.id, "shellfish-research-bridge");
  assert.equal(route.reservedMicrounits, 0);
});
