import type { ProviderOffer } from "../types/domain.js";

export async function executeProvider(
  provider: ProviderOffer,
  task: string,
): Promise<string> {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(provider.latencyMs, 250))
  );

  return `Provider ${provider.id} completed ${task}.`;
}
