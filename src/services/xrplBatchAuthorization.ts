import crypto from "node:crypto";

import type {
  XrplBatchMode,
  XrplUnsignedBatchDraft,
} from "./xrplBatchDraft.js";

export interface XrplBatchBuildAuthorization {
  authorization_id: string;
  authorization_type: "XRPL_BATCH_BUILD_AUTHORIZATION";
  batch_draft_id: string;
  network: "testnet" | "devnet";
  task_id: string;
  route_receipt_id: string;
  route_receipt_hash: string;
  provider_id: string;
  source_account: string;
  mode: XrplBatchMode;
  transaction_count: number;
  ordered_transactions_hash: string;
  transaction_build_allowed: true;
  wallet_signing_allowed: false;
  transaction_submission_allowed: false;
  mainnet_allowed: false;
  human_approval_recorded: true;
  signing_requires_separate_authorization: true;
  submission_requires_separate_authorization: true;
}

export interface XrplBatchAuthorizationResult {
  allowed: boolean;
  reasons: string[];
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashOrderedBatchTransactions(
  draft: XrplUnsignedBatchDraft,
): string {
  return crypto
    .createHash("sha256")
    .update(canonicalize(draft.transaction_json.RawTransactions), "utf8")
    .digest("hex");
}

function requireUnsignedBatchDraft(draft: XrplUnsignedBatchDraft): void {
  if (draft.draft_type !== "XRPL_UNSIGNED_BATCH_DRAFT") {
    throw new Error("Invalid XRPL Batch draft type.");
  }
  if (draft.network !== "testnet" && draft.network !== "devnet") {
    throw new Error("XRPL Batch authorization is restricted to testnet or devnet.");
  }
  if (draft.unsigned !== true) {
    throw new Error("XRPL Batch authorization requires an unsigned draft.");
  }
  if (draft.wallet_signing_authorized !== false) {
    throw new Error("Unexpected wallet signing authority on XRPL Batch draft.");
  }
  if (draft.transaction_submission_authorized !== false) {
    throw new Error("Unexpected submission authority on XRPL Batch draft.");
  }
  if (draft.mainnet_authorized !== false) {
    throw new Error("Unexpected Mainnet authority on XRPL Batch draft.");
  }
  if (draft.human_approval_required !== true) {
    throw new Error("XRPL Batch authorization requires human approval.");
  }
}

export function authorizeXrplBatchBuild(
  draft: XrplUnsignedBatchDraft,
  humanApproved: boolean,
): XrplBatchBuildAuthorization {
  requireUnsignedBatchDraft(draft);
  if (humanApproved !== true) {
    throw new Error("Human approval is required for XRPL Batch build authorization.");
  }

  return {
    authorization_id: `XRPL_BATCH_AUTH_${draft.draft_id}`,
    authorization_type: "XRPL_BATCH_BUILD_AUTHORIZATION",
    batch_draft_id: draft.draft_id,
    network: draft.network,
    task_id: draft.task_id,
    route_receipt_id: draft.route_receipt_id,
    route_receipt_hash: draft.route_receipt_hash,
    provider_id: draft.provider_id,
    source_account: draft.source_account,
    mode: draft.mode,
    transaction_count: draft.transaction_json.RawTransactions.length,
    ordered_transactions_hash: hashOrderedBatchTransactions(draft),
    transaction_build_allowed: true,
    wallet_signing_allowed: false,
    transaction_submission_allowed: false,
    mainnet_allowed: false,
    human_approval_recorded: true,
    signing_requires_separate_authorization: true,
    submission_requires_separate_authorization: true,
  };
}

export function verifyXrplBatchAuthorization(
  draft: XrplUnsignedBatchDraft,
  authorization: XrplBatchBuildAuthorization,
): XrplBatchAuthorizationResult {
  const reasons: string[] = [];

  if (authorization.authorization_type !== "XRPL_BATCH_BUILD_AUTHORIZATION") {
    reasons.push("XRPL Batch authorization type invalid.");
  }
  if (authorization.batch_draft_id !== draft.draft_id) {
    reasons.push("XRPL Batch draft ID mismatch.");
  }
  if (authorization.task_id !== draft.task_id) {
    reasons.push("XRPL Batch task binding mismatch.");
  }
  if (authorization.route_receipt_id !== draft.route_receipt_id) {
    reasons.push("XRPL Batch route receipt ID mismatch.");
  }
  if (authorization.route_receipt_hash !== draft.route_receipt_hash) {
    reasons.push("XRPL Batch route receipt hash mismatch.");
  }
  if (authorization.provider_id !== draft.provider_id) {
    reasons.push("XRPL Batch provider binding mismatch.");
  }
  if (authorization.source_account !== draft.source_account) {
    reasons.push("XRPL Batch source account mismatch.");
  }
  if (authorization.network !== draft.network) {
    reasons.push("XRPL Batch network mismatch.");
  }
  if (authorization.mode !== draft.mode) {
    reasons.push("XRPL Batch mode mismatch.");
  }
  if (authorization.transaction_count !== draft.transaction_json.RawTransactions.length) {
    reasons.push("XRPL Batch transaction count mismatch.");
  }
  if (authorization.ordered_transactions_hash !== hashOrderedBatchTransactions(draft)) {
    reasons.push("XRPL Batch ordered transaction hash mismatch.");
  }
  if (authorization.transaction_build_allowed !== true) {
    reasons.push("XRPL Batch build authority missing.");
  }
  if (authorization.wallet_signing_allowed !== false) {
    reasons.push("XRPL Batch signing authority must remain false.");
  }
  if (authorization.transaction_submission_allowed !== false) {
    reasons.push("XRPL Batch submission authority must remain false.");
  }
  if (authorization.mainnet_allowed !== false) {
    reasons.push("XRPL Batch Mainnet authority must remain false.");
  }

  return { allowed: reasons.length === 0, reasons };
}

/*
Generic pre-event Batch build-authorization boundary.

Human approval binds the exact ordered inner-transaction set plus Batch mode,
network, source account, route provenance, provider and draft identity. Changing
or reordering an inner transaction after approval invalidates the authorization.
This artifact allows transaction-build work only. Wallet signing, submission
and Mainnet authority remain false and require separate future authorization.
*/
