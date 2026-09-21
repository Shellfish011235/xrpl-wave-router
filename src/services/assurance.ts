import crypto from "node:crypto";
import type { AssuranceGrant } from "../types/domain.js";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => JSON.stringify(key) + ":" + canonicalize(entryValue));

    return "{" + entries.join(",") + "}";
  }

  return JSON.stringify(value);
}

export function canonicalAssuranceGrantBytes(
  grant: AssuranceGrant | Record<string, unknown>,
): Buffer {
  const unsigned = Object.fromEntries(
    Object.entries(grant).filter(([key]) => key !== "signature"),
  );

  return Buffer.from(canonicalize(unsigned), "utf8");
}

function assuranceKeyFromEnvironment(): Buffer | null {
  const keyHex = process.env.SHELLFISH_ASSURANCE_HMAC_KEY_HEX?.trim();

  if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    return null;
  }

  return Buffer.from(keyHex, "hex");
}

export function verifyAssuranceGrantSignature(grant: AssuranceGrant): boolean {
  const key = assuranceKeyFromEnvironment();

  if (!key) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", key)
    .update(canonicalAssuranceGrantBytes(grant))
    .digest("hex");

  const supplied = grant.signature.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(supplied)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(supplied, "hex");

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export function signAssuranceGrantForTest(
  grant: Omit<AssuranceGrant, "signature">,
  keyHex: string,
): AssuranceGrant {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Test assurance key must be 32 bytes encoded as hex.");
  }

  const unsigned = {
    ...grant,
    signature: "",
  } satisfies AssuranceGrant;

  const signature = crypto
    .createHmac("sha256", Buffer.from(keyHex, "hex"))
    .update(canonicalAssuranceGrantBytes(unsigned))
    .digest("hex");

  return {
    ...grant,
    signature,
  };
}
