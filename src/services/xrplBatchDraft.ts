export type XrplBatchMode =
  | "ALL_OR_NOTHING"
  | "ONLY_ONE"
  | "UNTIL_FAILURE"
  | "INDEPENDENT";

export interface XrplBatchInnerTransaction {
  TransactionType: string;
  Account: string;
  [key: string]: unknown;
}

export interface XrplUnsignedBatchDraft {
  draft_id: string;
  draft_type: "XRPL_UNSIGNED_BATCH_DRAFT";
  network: "testnet" | "devnet";
  task_id: string;
  route_receipt_id: string;
  route_receipt_hash: string;
  provider_id: string;
  source_account: string;
  mode: XrplBatchMode;
  transaction_json: {
    TransactionType: "Batch";
    Account: string;
    Flags: number;
    RawTransactions: Array<{
      RawTransaction: XrplBatchInnerTransaction;
    }>;
  };
  unsigned: true;
  transaction_build_authorized: false;
  wallet_signing_authorized: false;
  transaction_submission_authorized: false;
  mainnet_authorized: false;
  human_approval_required: true;
}

const INNER_BATCH_FLAG = 0x40000000;

const MODE_FLAGS: Record<XrplBatchMode, number> = {
  ALL_OR_NOTHING: 0x00010000,
  ONLY_ONE: 0x00020000,
  UNTIL_FAILURE: 0x00040000,
  INDEPENDENT: 0x00080000,
};

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function requireAllowedNetwork(network: string): "testnet" | "devnet" {
  if (network !== "testnet" && network !== "devnet") {
    throw new Error("XRPL Batch draft is restricted to testnet or devnet.");
  }
  return network;
}

function normalizeInnerTransaction(
  transaction: XrplBatchInnerTransaction,
  sourceAccount: string,
): XrplBatchInnerTransaction {
  if (transaction.TransactionType === "Batch") {
    throw new Error("Nested Batch transactions are not allowed.");
  }

  if (transaction.Account !== sourceAccount) {
    throw new Error("Inner transaction account must match the Batch source account.");
  }

  if (
    "TxnSignature" in transaction ||
    "Signers" in transaction ||
    ("SigningPubKey" in transaction && transaction.SigningPubKey !== "")
  ) {
    throw new Error("Inner transactions must be unsigned.");
  }

  if ("LastLedgerSequence" in transaction) {
    throw new Error(
      "Inner LastLedgerSequence is disabled for the current xrpl.js compatibility boundary.",
    );
  }

  return {
    ...transaction,
    Flags: INNER_BATCH_FLAG,
    Fee: "0",
    SigningPubKey: "",
  };
}

export function buildUnsignedXrplBatchDraft(input: {
  network: string;
  taskId: string;
  routeReceiptId: string;
  routeReceiptHash: string;
  providerId: string;
  sourceAccount: string;
  mode: XrplBatchMode;
  transactions: XrplBatchInnerTransaction[];
}): XrplUnsignedBatchDraft {
  const network = requireAllowedNetwork(input.network);
  const taskId = requireNonEmptyString(input.taskId, "Task ID");
  const routeReceiptId = requireNonEmptyString(input.routeReceiptId, "Route receipt ID");
  const routeReceiptHash = requireNonEmptyString(input.routeReceiptHash, "Route receipt hash");
  const providerId = requireNonEmptyString(input.providerId, "Provider ID");
  const sourceAccount = requireNonEmptyString(input.sourceAccount, "Source account");

  if (!(input.mode in MODE_FLAGS)) {
    throw new Error("Unsupported XRPL Batch mode.");
  }

  if (!Array.isArray(input.transactions) || input.transactions.length < 2) {
    throw new Error("XRPL Batch draft requires at least two inner transactions.");
  }

  const rawTransactions = input.transactions.map((transaction) => ({
    RawTransaction: normalizeInnerTransaction(transaction, sourceAccount),
  }));

  return {
    draft_id: `XRPL_BATCH_DRAFT_${taskId}`,
    draft_type: "XRPL_UNSIGNED_BATCH_DRAFT",
    network,
    task_id: taskId,
    route_receipt_id: routeReceiptId,
    route_receipt_hash: routeReceiptHash,
    provider_id: providerId,
    source_account: sourceAccount,
    mode: input.mode,
    transaction_json: {
      TransactionType: "Batch",
      Account: sourceAccount,
      Flags: MODE_FLAGS[input.mode],
      RawTransactions: rawTransactions,
    },
    unsigned: true,
    transaction_build_authorized: false,
    wallet_signing_authorized: false,
    transaction_submission_authorized: false,
    mainnet_authorized: false,
    human_approval_required: true,
  };
}

/*
Generic pre-event Batch draft boundary.

This service only creates deterministic, unsigned Testnet/Devnet Batch-shaped
objects. It does not autofill, calculate fees, sign, submit, or authorize
Mainnet. The route receipt fields are provenance only; route quality is not
permission. Inner LastLedgerSequence remains rejected until the stable xrpl.js
release used by this repo supports the post-fixBatchV1_2 behavior.
*/
