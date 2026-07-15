import { discoverHubProviders, type DiscoveredProvider } from "../adapters/hub.js";
import { providerOffers } from "./providers.js";

let cache: { providers: DiscoveredProvider[]; expiresAt: number; warning?: string } | undefined;

function localProviders(): DiscoveredProvider[] {
  return providerOffers.map((provider) => ({
    ...provider,
    paymentProtocol: "direct",
    source: "local",
  }));
}

export async function getProviders(options: { refresh?: boolean } = {}): Promise<{
  providers: DiscoveredProvider[];
  hubConfigured: boolean;
  warning?: string;
}> {
  const now = Date.now();
  if (!options.refresh && cache && cache.expiresAt > now) {
    return {
      providers: cache.providers,
      hubConfigured: Boolean(process.env.XRPL_AI_HUB_URL),
      warning: cache.warning,
    };
  }

  let hubProviders: DiscoveredProvider[] = [];
  let warning: string | undefined;

  try {
    hubProviders = await discoverHubProviders();
  } catch (error) {
    warning = error instanceof Error ? error.message : "Hub discovery failed.";
  }

  const providers = [...hubProviders, ...localProviders()];
  cache = { providers, expiresAt: now + 30_000, warning };

  return {
    providers,
    hubConfigured: Boolean(process.env.XRPL_AI_HUB_URL),
    warning,
  };
}
