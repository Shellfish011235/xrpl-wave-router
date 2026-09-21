import crypto from "node:crypto";
import type {
  ExecutionGrant,
  RouteReceipt,
} from "../types/domain.js";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonicalize(record[key]),
      );

    return "{" + entries.join(",") + "}";
  }

  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new Error(
      "Assurance payload contains a non-serializable value.",
    );
  }

  return serialized;
}

function unsignedRecord(
  value: Record<string, unknown>,
  excludedField: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== excludedField,
    ),
  );
}

function assuranceKeyFromEnvironment(): Buffer | null {
  const keyHex =
    process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX?.trim();

  if (
    !keyHex ||
    !/^[0-9a-fA-F]{64}$/.test(keyHex)
  ) {
    return null;
  }

  return Buffer.from(keyHex, "hex");
}

export function canonicalExecutionGrantBytes(
  grant: ExecutionGrant | Record<string, unknown>,
): Buffer {
  const unsigned = unsignedRecord(
    grant as Record<string, unknown>,
    "signature",
  );

  return Buffer.from(
    canonicalize(unsigned),
    "utf8",
  );
}

export function verifyExecutionGrantSignature(
  grant: ExecutionGrant,
): boolean {
  const key = assuranceKeyFromEnvironment();

  if (!key) {
    return false;
  }

  const supplied = grant.signature.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(supplied)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", key)
    .update(canonicalExecutionGrantBytes(grant))
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expected,
    "hex",
  );
  const suppliedBuffer = Buffer.from(
    supplied,
    "hex",
  );

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      suppliedBuffer,
    )
  );
}

export function canonicalRouteReceiptBytes(
  receipt: RouteReceipt | Record<string, unknown>,
): Buffer {
  const unsigned = unsignedRecord(
    receipt as Record<string, unknown>,
    "receipt_hash",
  );

  return Buffer.from(
    canonicalize(unsigned),
    "utf8",
  );
}

export function calculateRouteReceiptHash(
  receipt: RouteReceipt | Record<string, unknown>,
): string {
  return crypto
    .createHash("sha256")
    .update(canonicalRouteReceiptBytes(receipt))
    .digest("hex");
}

export function verifyRouteReceiptHash(
  receipt: RouteReceipt,
): boolean {
  const supplied = receipt.receipt_hash.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(supplied)) {
    return false;
  }

  const expected =
    calculateRouteReceiptHash(receipt);

  const expectedBuffer = Buffer.from(
    expected,
    "hex",
  );
  const suppliedBuffer = Buffer.from(
    supplied,
    "hex",
  );

  return crypto.timingSafeEqual(
    expectedBuffer,
    suppliedBuffer,
  );
}

export function signExecutionGrantForTest(
  grant: Omit<ExecutionGrant, "signature">,
  keyHex: string,
): ExecutionGrant {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "Test assurance key must be 32 bytes encoded as hex.",
    );
  }

  const unsigned = {
    ...grant,
    signature: "",
  } satisfies ExecutionGrant;

  const signature = crypto
    .createHmac(
      "sha256",
      Buffer.from(keyHex, "hex"),
    )
    .update(
      canonicalExecutionGrantBytes(unsigned),
    )
    .digest("hex");

  return {
    ...grant,
    signature,
  };
}
