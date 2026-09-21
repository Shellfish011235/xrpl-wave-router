export type PrivacyClass = "standard" | "no-retention" | "local-only";

export interface ExecutionGrant {
  grant_id: string;
  task_id: string;
  nonce: string;
  route_receipt_id: string;
  route_receipt_hash: string;
  provider_id: string;
  capability: string;
  max_cost_microunits: number;
  execution_allowed: true;
  network_allowed: true;
  payment_allowed: false;
  trusted_memory_write_allowed: false;
  created_at: string;
  expires_at: string;
  signature_algorithm: "HMAC-SHA256";
  signature: string;
}

export interface RouteReceipt {
  receipt_id: string;
  receipt_hash: string;
  task_id: string;
  provider_id: string;
  capability_required: string;
  reserved_microunits: number;
  execution_authorized?: boolean;
  payment_authorized?: boolean;
  trusted_memory_write_authorized?: boolean;
  [key: string]: unknown;
}

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

export interface AuthorizedJobRequest extends JobRequest {
  taskId: string;
  routeReceipt: RouteReceipt;
  executionGrant: ExecutionGrant;
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
