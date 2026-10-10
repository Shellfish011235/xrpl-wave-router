import type { XrplUnsignedBatchDraft } from "./xrplBatchDraft.js";
import type { XrplBatchBuildAuthorization } from "./xrplBatchAuthorization.js";
import { verifyXrplBatchAuthorization } from "./xrplBatchAuthorization.js";
import type { XrplBatchIntegrityReceipt } from "./xrplBatchIntegrity.js";
import { buildXrplBatchIntegrityReceipt } from "./xrplBatchIntegrity.js";

export interface XrplBatchPreSignPolicyResult {
  policy_type: "XRPL_BATCH_PRESIGN_POLICY";
  allowed_for_separate_signing_review: boolean;
  reasons: string[];
  wallet_signing_allowed: false;
  transaction_submission_allowed: false;
  mainnet_allowed: false;
}

function sameIntegrityReceipt(
  left: XrplBatchIntegrityReceipt,
  right: XrplBatchIntegrityReceipt,
): boolean {
  return (
    left.receipt_type === right.receipt_type &&
    left.status === right.status &&
    left.batch_draft_id === right.batch_draft_id &&
    left.authorization_id === right.authorization_id &&
    left.draft_hash === right.draft_hash &&
    left.authorization_hash === right.authorization_hash &&
    left.binding_hash === right.binding_hash &&
    left.wallet_signing_allowed === right.wallet_signing_allowed &&
    left.transaction_submission_allowed === right.transaction_submission_allowed &&
    left.mainnet_allowed === right.mainnet_allowed
  );
}

export function evaluateXrplBatchPreSignPolicy(
  draft: XrplUnsignedBatchDraft,
  authorization: XrplBatchBuildAuthorization,
  integrity: XrplBatchIntegrityReceipt,
): XrplBatchPreSignPolicyResult {
  const reasons: string[] = [];
  const authorizationResult = verifyXrplBatchAuthorization(draft, authorization);
  reasons.push(...authorizationResult.reasons);

  if (authorization.wallet_signing_allowed !== false) {
    reasons.push("XRPL Batch signing authority must remain false before separate signing review.");
  }
  if (authorization.transaction_submission_allowed !== false) {
    reasons.push("XRPL Batch submission authority must remain false before separate signing review.");
  }
  if (authorization.mainnet_allowed !== false) {
    reasons.push("XRPL Batch Mainnet authority must remain false before separate signing review.");
  }

  try {
    const expectedIntegrity = buildXrplBatchIntegrityReceipt(draft, authorization);
    if (!sameIntegrityReceipt(integrity, expectedIntegrity)) {
      reasons.push("XRPL Batch integrity receipt mismatch.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown integrity error";
    reasons.push(`XRPL Batch integrity verification failed: ${message}`);
  }

  return {
    policy_type: "XRPL_BATCH_PRESIGN_POLICY",
    allowed_for_separate_signing_review: reasons.length === 0,
    reasons,
    wallet_signing_allowed: false,
    transaction_submission_allowed: false,
    mainnet_allowed: false,
  };
}

/*
Generic pre-event pre-sign policy gate.

Passing this gate means only that the exact unsigned Batch draft, build
authorization, and integrity receipt are mutually consistent enough to be
presented for a separate future signing decision. It does not authorize or
perform wallet access, signing, submission, broadcast, transfer, or Mainnet.
*/
