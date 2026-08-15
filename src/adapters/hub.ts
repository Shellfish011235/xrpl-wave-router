import type { ProviderOffer } from "../types/domain.js";

interface HubProviderManifest {
  id?: string;
  providerId?: string;
  name?: string;
  endpoint?: string;
  model?: string;
  capability?: string;
  capabilities?: string[];
  priceMicrounits?: number;
  price?: number;
  latencyMs?: number;
  estimatedLatencyMs?: number;
  quality?: number;
  qualityScore?: number;
  privacy?: ProviderOffer["privacy"];
  available?: boolean;
  paymentProtocol?: string;
  settlementAsset?: string;
  asset?: string;
  xrplDestination?: string;
}

export interface DiscoveredProvider extends ProviderOffer {
  endpoint?: string;
  paymentProtocol: "x402" | "direct";
  source: "hub" | "local";
}

function normalizeManifest(item: HubProviderManifest, index: number): DiscoveredProvider {
  const capability = item.capability ?? item.capabilities?.[0] ?? "general_text";
  const numericPrice = item.priceMicrounits ?? Math.round((item.price ?? 0.01) * 1_000_000);

  return {
    id: item.id ?? item.providerId ?? item.name ?? `hub-provider-${index + 1}`,
    provider: "demo",
    model: item.model ?? "hub-agent",
    capability,
    priceMicrounits: Math.max(1, numericPrice),
    latencyMs: item.latencyMs ?? item.estimatedLatencyMs ?? 1500,
    quality: item.quality ?? item.qualityScore ?? 0.85,
    privacy: item.privacy ?? "standard",
    available: item.available ?? true,
    executionMode: "live",
    acceptedAsset: { currency: item.settlementAsset ?? item.asset ?? "RLUSD" },
    xrplDestination: item.xrplDestination,
    endpoint: item.endpoint,
    paymentProtocol: item.paymentProtocol?.toLowerCase() === "x402" ? "x402" : "direct",
    source: "hub",
  };
}

export async function discoverHubProviders(): Promise<DiscoveredProvider[]> {
  const url = process.env.XRPL_AI_HUB_URL?.trim();
  if (!url) return [];

  const response = await fetch(url, {
    headers: process.env.XRPL_AI_HUB_API_KEY
      ? { Authorization: `Bearer ${process.env.XRPL_AI_HUB_API_KEY}` }
      : undefined,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Hub discovery failed (${response.status}).`);
  }

  const payload = await response.json() as unknown;
  const records = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && Array.isArray((payload as { providers?: unknown[] }).providers)
      ? (payload as { providers: HubProviderManifest[] }).providers
      : [];

  return records
    .map((item, index) => normalizeManifest(item as HubProviderManifest, index))
    .filter((provider) => Boolean(provider.endpoint));
}
