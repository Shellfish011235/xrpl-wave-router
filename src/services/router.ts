import type { JobRequest, PrivacyClass, ProviderOffer, RouteQuote } from "../types/domain.js";

const privacyRank = {
  standard: 0,
  "no-retention": 1,
  "local-only": 2,
} as const;

function isPrivacyClass(value: unknown): value is PrivacyClass {
  return value === "standard" || value === "no-retention" || value === "local-only";
}

function normalize(value: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(ceiling) || ceiling <= 0) return 0;
  return Math.min(value / ceiling, 1);
}

function assertValidRequest(request: JobRequest): void {
  if (
    request === null ||
    typeof request !== "object" ||
    typeof request.task !== "string" ||
    request.task.length === 0 ||
    !Number.isSafeInteger(request.maxCostMicrounits) ||
    request.maxCostMicrounits < 0 ||
    !Number.isFinite(request.maxLatencyMs) ||
    request.maxLatencyMs < 0 ||
    !Number.isFinite(request.minimumQuality) ||
    request.minimumQuality < 0 ||
    request.minimumQuality > 1 ||
    !isPrivacyClass(request.privacy)
  ) {
    throw new Error("Invalid job request.");
  }
}

function isSelectableOffer(offer: ProviderOffer): boolean {
  return offer.available === true &&
    typeof offer.capability === "string" &&
    Number.isSafeInteger(offer.priceMicrounits) &&
    offer.priceMicrounits >= 0 &&
    Number.isFinite(offer.latencyMs) &&
    offer.latencyMs >= 0 &&
    Number.isFinite(offer.quality) &&
    offer.quality >= 0 &&
    offer.quality <= 1 &&
    isPrivacyClass(offer.privacy);
}

export function findBestRoute(
  request: JobRequest,
  offers: ProviderOffer[],
): RouteQuote {
  assertValidRequest(request);

  const eligible = offers.filter((offer) =>
    isSelectableOffer(offer) &&
    offer.capability === request.task &&
    offer.priceMicrounits <= request.maxCostMicrounits &&
    offer.latencyMs <= request.maxLatencyMs &&
    offer.quality >= request.minimumQuality &&
    privacyRank[offer.privacy] >= privacyRank[request.privacy]
  );

  if (eligible.length === 0) {
    throw new Error("No provider satisfies the job's hard constraints.");
  }

  const ranked = eligible.map((provider) => {
    const cost = normalize(provider.priceMicrounits, request.maxCostMicrounits);
    const latency = normalize(provider.latencyMs, request.maxLatencyMs);
    const qualityRisk = 1 - provider.quality;

    const score = (0.5 * cost) + (0.2 * latency) + (0.3 * qualityRisk);

    return {
      provider,
      score,
      reservedMicrounits: provider.priceMicrounits,
      reasons: [
        `cost=${provider.priceMicrounits}`,
        `latency=${provider.latencyMs}ms`,
        `quality=${provider.quality}`,
        `privacy=${provider.privacy}`,
      ],
    };
  });

  ranked.sort((a, b) => a.score - b.score);
  return ranked[0];
}
