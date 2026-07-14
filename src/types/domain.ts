export type PrivacyClass = "standard" | "no-retention" | "local-only";

export interface ProviderOffer {
  id: string;
  capability: string;
  priceMicrounits: number;
  latencyMs: number;
  quality: number;
  privacy: PrivacyClass;
  available: boolean;
  acceptedAsset: {
    currency: string;
    issuer?: string;
  };
  xrplDestination?: string;
  walletAddress?: string;
}

export interface JobRequest {
  task: string;
  maxCostMicrounits: number;
  maxLatencyMs: number;
  minimumQuality: number;
  privacy: PrivacyClass;
}

export interface RouteQuote {
  provider: ProviderOffer;
  score: number;
  reservedMicrounits: number;
  reasons: string[];
}

export interface JobResult {
  jobId: string;
  providerId: string;
  output: string;
  chargedMicrounits: number;
  routeScore: number;
}
