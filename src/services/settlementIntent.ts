import type { PaymentQuote } from "../adapters/openPayments.js";
import type { RouteReceipt } from "../types/domain.js";

export interface SettlementIntent {
  intent_id: string;
  intent_type: "QUOTE_ONLY_ACCOUNTING_INTENT";
  job_id: string;
  task_id: string;
  route_receipt_id: string;
  route_receipt_hash: string;
  provider_id: string;
  amount_microunits: number;
  quote: PaymentQuote;
  payment_authorized: false;
  wallet_signing_authorized: false;
  settlement_authorized: false;
  settlement_executed: false;
  human_approval_required: true;
}

export function buildSettlementIntent(
  jobId: string,
  taskId: string,
  routeReceipt: RouteReceipt,
  amountMicrounits: number,
  quote: PaymentQuote,
): SettlementIntent {
  if (
    !Number.isSafeInteger(amountMicrounits) ||
    amountMicrounits < 0
  ) {
    throw new Error(
      "Settlement intent amount must be a non-negative safe integer.",
    );
  }

  if (routeReceipt.task_id !== taskId) {
    throw new Error(
      "Settlement intent task binding mismatch.",
    );
  }

  return {
    intent_id:
      "SETTLEMENT_INTENT_" + jobId,
    intent_type:
      "QUOTE_ONLY_ACCOUNTING_INTENT",
    job_id: jobId,
    task_id: taskId,
    route_receipt_id:
      routeReceipt.receipt_id,
    route_receipt_hash:
      routeReceipt.receipt_hash,
    provider_id:
      routeReceipt.provider_id,
    amount_microunits:
      amountMicrounits,
    quote,
    payment_authorized:
      false,
    wallet_signing_authorized:
      false,
    settlement_authorized:
      false,
    settlement_executed:
      false,
    human_approval_required:
      true,
  };
}
