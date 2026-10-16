import crypto from "node:crypto";
import { calculateRouteReceiptHash } from "./assurance.js";
import type {
  RouteQuote,
  RouteReceipt,
} from "../types/domain.js";

export function buildRouteReceipt(
  taskId: string,
  route: RouteQuote,
): RouteReceipt {
  if (!taskId.trim()) {
    throw new Error("taskId is required.");
  }

  const receipt: RouteReceipt = {
    receipt_id: crypto.randomUUID(),
    receipt_hash: "",
    task_id: taskId,
    provider_id: route.provider.id,
    capability_required:
      route.provider.capability,
    reserved_microunits:
      route.reservedMicrounits,
    execution_authorized: false,
    payment_authorized: false,
    trusted_memory_write_authorized: false,
  };

  return {
    ...receipt,
    receipt_hash:
      calculateRouteReceiptHash(receipt),
  };
}
