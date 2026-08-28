import type { ProviderOffer } from "../types/domain.js";

export const providerOffers: ProviderOffer[] = [
  {
    id: "small-fast-1",
    capability: "summarize_document",
    priceMicrounits: 12000,
    latencyMs: 650,
    quality: 0.87,
    privacy: "no-retention",
    available: true,
    acceptedAsset: { currency: "XRP" },
  },
  {
    id: "frontier-1",
    capability: "summarize_document",
    priceMicrounits: 42000,
    latencyMs: 1900,
    quality: 0.96,
    privacy: "standard",
    available: true,
    acceptedAsset: { currency: "XRP" },
  },
  {
    id: "specialist-1",
    capability: "summarize_document",
    priceMicrounits: 18500,
    latencyMs: 900,
    quality: 0.93,
    privacy: "no-retention",
    available: true,
    acceptedAsset: { currency: "XRP" },
  },
  {
    id: "shellfish-research-bridge",
    capability: "EXTERNAL_RESEARCH",
    priceMicrounits: 0,
    latencyMs: 5000,
    quality: 0.9,
    privacy: "no-retention",
    available: true,
    acceptedAsset: { currency: "XRP" },
  },
];
