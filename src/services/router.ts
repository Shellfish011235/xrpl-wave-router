import type { JobRequest, ProviderOffer, RouteQuote } from "../types/domain.js";

const privacyRank = {
  standard: 0,
  "no-retention": 1,
  "local-only": 2,
} as const;

function normalize(value: number, ceiling: number): number {
  return Math.min(value / Math.max(ceiling, 1), 1);
}

export function findBestRoute(
  request: JobRequest,
  offers: ProviderOffer[],
): RouteQuote {
  const eligible = offers.filter((offer) =>
    offer.available &&
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
