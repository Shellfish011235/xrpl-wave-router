import crypto from "node:crypto";

import type { XrplUnsignedBatchDraft } from "./xrplBatchDraft.js";
import type { XrplBatchBuildAuthorization } from "./xrplBatchAuthorization.js";
import { verifyXrplBatchAuthorization } from "./xrplBatchAuthorization.js";

export interface XrplBatchIntegrityReceipt {
  receipt_type: "XRPL_BATCH_INTEGRITY_RECEIPT";
  status: "VERIFIED_FOR_BUILD_ONLY";
  batch_draft_id: string;
  authorization_id: string;
  draft_hash: string;
  authorization_hash: string;
  binding_hash: string;
  wallet_signing_allowed: false;
  transaction_submission_allowed: false;
  mainnet_allowed: false;
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

function hashCanonical(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

export function buildXrplBatchIntegrityReceipt(
  draft: XrplUnsignedBatchDraft,
  authorization: XrplBatchBuildAuthorization,
): XrplBatchIntegrityReceipt {
  const verification = verifyXrplBatchAuthorization(draft, authorization);
  if (!verification.allowed) {
    throw new Error(
      `Batch integrity verification failed: ${verification.reasons.join(" ")}`,
    );
  }

  const draftHash = hashCanonical(draft);
  const authorizationHash = hashCanonical(authorization);
  const bindingHash = hashCanonical({
    draft_hash: draftHash,
    authorization_hash: authorizationHash,
    batch_draft_id: draft.draft_id,
    authorization_id: authorization.authorization_id,
  });

  return {
    receipt_type: "XRPL_BATCH_INTEGRITY_RECEIPT",
    status: "VERIFIED_FOR_BUILD_ONLY",
    batch_draft_id: draft.draft_id,
    authorization_id: authorization.authorization_id,
    draft_hash: draftHash,
    authorization_hash: authorizationHash,
    binding_hash: bindingHash,
    wallet_signing_allowed: false,
    transaction_submission_allowed: false,
    mainnet_allowed: false,
  };
}

/*
Read-only pre-event integrity receipt.

This receipt proves the current unsigned Batch draft still matches the explicit
Batch build authorization at the moment of inspection. It is not a settlement
receipt, signature, submission authorization, validated transaction hash, or
Mainnet permission. It exists to make later Control Room display and future
signing-boundary checks deterministic and tamper-evident.
*/
