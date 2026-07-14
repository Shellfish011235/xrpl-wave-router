export type PrivacyClass = "standard" | "no-retention" | "local-only";
export type ExecutionMode = "live" | "demo";

export interface ProviderOffer {
  id: string;
  provider: "openai" | "demo";
  model: string;
  capability: string;
  priceMicrounits: number;
  latencyMs: number;
  quality: number;
  privacy: PrivacyClass;
  available: boolean;
  executionMode: ExecutionMode;
  acceptedAsset: {
    currency: string;
    issuer?: string;
  };
  xrplDestination?: string;
  walletAddress?: string;
}

export interface JobRequest {
  task: string;
  prompt: string;
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

export interface ProviderExecution {
  output: string;
  executionMode: ExecutionMode;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface JobResult {
  jobId: string;
  providerId: string;
  output: string;
  chargedMicrounits: number;
  routeScore: number;
  executionMode: ExecutionMode;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}