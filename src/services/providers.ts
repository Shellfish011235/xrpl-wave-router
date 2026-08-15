import type { ProviderOffer } from "../types/domain.js";

const live = Boolean(process.env.OPENAI_API_KEY);

export const providerOffers: ProviderOffer[] = [
  {
    id: "openai-nano",
    provider: live ? "openai" : "demo",
    model: process.env.OPENAI_NANO_MODEL ?? "gpt-5-nano",
    capability: "general_text",
    priceMicrounits: 9000,
    latencyMs: 650,
    quality: 0.84,
    privacy: "standard",
    available: true,
    executionMode: live ? "live" : "demo",
    acceptedAsset: { currency: "XRP" },
  },
  {
    id: "openai-mini",
    provider: live ? "openai" : "demo",
    model: process.env.OPENAI_MINI_MODEL ?? "gpt-5-mini",
    capability: "general_text",
    priceMicrounits: 18000,
    latencyMs: 1050,
    quality: 0.92,
    privacy: "standard",
    available: true,
    executionMode: live ? "live" : "demo",
    acceptedAsset: { currency: "XRP" },
  },
  {
    id: "openai-frontier",
    provider: live ? "openai" : "demo",
    model: process.env.OPENAI_FRONTIER_MODEL ?? "gpt-5.2",
    capability: "general_text",
    priceMicrounits: 42000,
    latencyMs: 1900,
    quality: 0.98,
    privacy: "standard",
    available: true,
    executionMode: live ? "live" : "demo",
    acceptedAsset: { currency: "XRP" },
  },
];