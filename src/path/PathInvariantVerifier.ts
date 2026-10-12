export type PathInvariantSeverity = "error" | "warning";

export interface PathInvariantFinding {
  code:
    | "RAW_RESULT_MALFORMED"
    | "DESTINATION_ACCOUNT_MISMATCH"
    | "DESTINATION_AMOUNT_MISMATCH"
    | "ALTERNATIVES_MALFORMED"
    | "ALTERNATIVE_MALFORMED"
    | "SOURCE_AMOUNT_INVALID"
    | "SOURCE_AMOUNT_NON_POSITIVE"
    | "PATHS_MALFORMED"
    | "PATH_MALFORMED"
    | "PATH_STEP_MALFORMED"
    | "PATH_STEP_EMPTY"
    | "DUPLICATE_ALTERNATIVE";
  severity: PathInvariantSeverity;
  message: string;
  alternativeIndex?: number;
}

export interface PathInvariantReport {
  ok: boolean;
  alternativesChecked: number;
  findings: PathInvariantFinding[];
  readOnly: true;
}

type XrplAmount =
  | string
  | {
      currency: string;
      issuer?: string;
      value: string;
    };

const XRP_TOTAL_SUPPLY_DROPS = 100_000_000_000_000_000n;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveDecimal(value: string): boolean {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed) || trimmed.startsWith("-")) return false;
  const unsigned = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const coefficient = unsigned.split(/[eE]/, 1)[0] ?? "";
  return coefficient.replace(".", "").replace(/^0+/, "").length > 0;
}

function amountIsValidPositive(amount: unknown): "ok" | "invalid" | "non-positive" {
  if (typeof amount === "string") {
    if (!/^\d+$/.test(amount)) return "invalid";
    const value = BigInt(amount);
    if (value <= 0n) return "non-positive";
    if (value > XRP_TOTAL_SUPPLY_DROPS) return "invalid";
    return "ok";
  }
  if (!isRecord(amount)) return "invalid";
  if (typeof amount.currency !== "string" || amount.currency.trim() === "") return "invalid";
  if (typeof amount.value !== "string") return "invalid";
  if (amount.issuer !== undefined && typeof amount.issuer !== "string") return "invalid";
  if (!DECIMAL_PATTERN.test(amount.value.trim())) return "invalid";
  if (!isPositiveDecimal(amount.value)) return "non-positive";
  return "ok";
}

function normalizeAmount(amount: unknown): string | null {
  if (typeof amount === "string") return /^\d+$/.test(amount) ? BigInt(amount).toString() : null;
  if (!isRecord(amount)) return null;
  if (typeof amount.currency !== "string" || typeof amount.value !== "string") return null;
  const issuer = typeof amount.issuer === "string" ? amount.issuer : "";
  return `${amount.currency.trim()}|${issuer.trim()}|${amount.value.trim()}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function verifyPathQueryResult(input: {
  sourceAccount: string;
  destinationAccount: string;
  requestedDestinationAmount: XrplAmount;
  raw: unknown;
}): PathInvariantReport {
  const findings: PathInvariantFinding[] = [];
  let alternativesChecked = 0;

  if (!isRecord(input.raw)) {
    findings.push({ code: "RAW_RESULT_MALFORMED", severity: "error", message: "Pathfinding result is not an object." });
    return { ok: false, alternativesChecked, findings, readOnly: true };
  }

  if (input.raw.destination_account !== input.destinationAccount) {
    findings.push({ code: "DESTINATION_ACCOUNT_MISMATCH", severity: "error", message: "Returned destination account does not match the requested account." });
  }

  const expectedAmount = normalizeAmount(input.requestedDestinationAmount);
  const returnedAmount = normalizeAmount(input.raw.destination_amount);
  if (expectedAmount === null || returnedAmount === null || expectedAmount !== returnedAmount) {
    findings.push({ code: "DESTINATION_AMOUNT_MISMATCH", severity: "error", message: "Returned destination amount does not match the requested amount." });
  }

  if (!Array.isArray(input.raw.alternatives)) {
    findings.push({ code: "ALTERNATIVES_MALFORMED", severity: "error", message: "Pathfinding alternatives must be an array." });
    return { ok: false, alternativesChecked, findings, readOnly: true };
  }

  const seen = new Set<string>();

  input.raw.alternatives.forEach((alternative, alternativeIndex) => {
    alternativesChecked += 1;
    if (!isRecord(alternative)) {
      findings.push({ code: "ALTERNATIVE_MALFORMED", severity: "error", message: "Pathfinding alternative is not an object.", alternativeIndex });
      return;
    }

    const amountState = amountIsValidPositive(alternative.source_amount);
    if (amountState === "invalid") {
      findings.push({ code: "SOURCE_AMOUNT_INVALID", severity: "error", message: "Alternative source amount is malformed or outside the possible XRP supply range.", alternativeIndex });
    } else if (amountState === "non-positive") {
      findings.push({ code: "SOURCE_AMOUNT_NON_POSITIVE", severity: "error", message: "Alternative source amount must be positive.", alternativeIndex });
    }

    if (alternative.paths_computed !== undefined) {
      if (!Array.isArray(alternative.paths_computed)) {
        findings.push({ code: "PATHS_MALFORMED", severity: "error", message: "paths_computed must be an array when present.", alternativeIndex });
      } else {
        for (const path of alternative.paths_computed) {
          if (!Array.isArray(path)) {
            findings.push({ code: "PATH_MALFORMED", severity: "error", message: "Each computed path must be an array.", alternativeIndex });
            continue;
          }
          for (const step of path) {
            if (!isRecord(step)) {
              findings.push({ code: "PATH_STEP_MALFORMED", severity: "error", message: "Each path step must be an object.", alternativeIndex });
              continue;
            }
            const hasIdentity = ["account", "currency", "issuer"].some((key) => typeof step[key] === "string" && (step[key] as string).trim() !== "");
            if (!hasIdentity) {
              findings.push({ code: "PATH_STEP_EMPTY", severity: "error", message: "Path step does not identify an account, currency, or issuer.", alternativeIndex });
            }
          }
        }
      }
    }

    const signature = stableStringify(alternative);
    if (seen.has(signature)) {
      findings.push({ code: "DUPLICATE_ALTERNATIVE", severity: "warning", message: "Duplicate pathfinding alternative returned.", alternativeIndex });
    } else {
      seen.add(signature);
    }
  });

  return {
    ok: !findings.some((finding) => finding.severity === "error"),
    alternativesChecked,
    findings,
    readOnly: true,
  };
}
