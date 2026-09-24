export interface PaymentQuote {
  debitAmount: string;
  receiveAmount: string;
  assetCode: string;

  simulated: true;

  paymentAuthorized: false;
  settlementAuthorized: false;
  walletSigningAuthorized: false;
}


export interface PaymentDestinationInfo {
  destination: string;

  reachable: boolean;

  mode:
    | "SIMULATED"
    | "UNAVAILABLE";

  paymentAuthorized: false;
  settlementAuthorized: false;
  walletSigningAuthorized: false;
}


export interface ReceiverResource {
  receiverId: string;

  resourceType:
    "SIMULATED_RECEIVER";

  destination: string;

  mode:
    "SIMULATED";

  reachable: false;

  paymentAuthorized: false;
  settlementAuthorized: false;
  walletSigningAuthorized: false;
}


export interface QuoteResource {
  quoteId: string;

  resourceType:
    "SIMULATED_QUOTE";

  receiverId: string;
  destination: string;

  debitAmount: string;
  receiveAmount: string;
  assetCode: string;

  simulated: true;

  paymentAuthorized: false;
  settlementAuthorized: false;
  walletSigningAuthorized: false;
}


export interface ReconciliationRecord {
  reconciliationId: string;

  quoteId: string;
  receiverId: string;
  destination: string;

  expectedDebitAmount: string;
  expectedReceiveAmount: string;
  assetCode: string;

  status:
    "SIMULATED_RECONCILED";

  paymentExecuted: false;
  settlementExecuted: false;
  walletSigningExecuted: false;
}


export interface StreamingPaymentAdapter {
  inspectDestination(
    destinationWalletAddress: string,
  ): Promise<PaymentDestinationInfo>;

  quote(
    destinationWalletAddress: string,
    amount: string,
  ): Promise<PaymentQuote>;

  createReceiverResource(
    destinationWalletAddress: string,
  ): Promise<ReceiverResource>;

  createQuoteResource(
    receiverId: string,
    amount: string,
  ): Promise<QuoteResource>;

  reconcileQuote(
    quoteId: string,
  ): Promise<ReconciliationRecord>;

  pay(
    destinationWalletAddress: string,
    amount: string,
  ): Promise<string>;
}


function requireNonEmptyString(
  value: string,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return value.trim();
}


function parseNonNegativeIntegerAmount(
  amount: string,
): string {
  const normalized =
    requireNonEmptyString(
      amount,
      "Amount",
    );

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "Amount must be a non-negative integer string.",
    );
  }

  const parsed =
    BigInt(
      normalized,
    );

  if (
    parsed < 0n
  ) {
    throw new Error(
      "Amount must be non-negative.",
    );
  }

  return parsed.toString();
}


export class DisabledOpenPaymentsAdapter
  implements StreamingPaymentAdapter
{
  private receiverSequence = 0;

  private quoteSequence = 0;

  private reconciliationSequence = 0;

  private readonly receivers =
    new Map<
      string,
      ReceiverResource
    >();

  private readonly quotes =
    new Map<
      string,
      QuoteResource
    >();

  private readonly reconciliations =
    new Map<
      string,
      ReconciliationRecord
    >();


  async inspectDestination(
    destinationWalletAddress: string,
  ): Promise<PaymentDestinationInfo> {
    const destination =
      requireNonEmptyString(
        destinationWalletAddress,
        "Destination",
      );

    /*
    Observational only.

    No network request is made.
    No Open Payments grant is requested.
    No payment instrument is accessed.
    */
    return {
      destination,

      reachable: false,

      mode:
        "SIMULATED",

      paymentAuthorized:
        false,

      settlementAuthorized:
        false,

      walletSigningAuthorized:
        false,
    };
  }


  async quote(
    destinationWalletAddress: string,
    amount: string,
  ): Promise<PaymentQuote> {
    requireNonEmptyString(
      destinationWalletAddress,
      "Destination",
    );

    const normalizedAmount =
      parseNonNegativeIntegerAmount(
        amount,
      );

    return {
      debitAmount:
        normalizedAmount,

      receiveAmount:
        normalizedAmount,

      assetCode:
        "TEST",

      simulated:
        true,

      paymentAuthorized:
        false,

      settlementAuthorized:
        false,

      walletSigningAuthorized:
        false,
    };
  }


  async createReceiverResource(
    destinationWalletAddress: string,
  ): Promise<ReceiverResource> {
    const destination =
      requireNonEmptyString(
        destinationWalletAddress,
        "Destination",
      );

    this.receiverSequence += 1;

    const receiver:
      ReceiverResource = {
      receiverId:
        `SIM_RECEIVER_${this.receiverSequence}`,

      resourceType:
        "SIMULATED_RECEIVER",

      destination,

      mode:
        "SIMULATED",

      reachable:
        false,

      paymentAuthorized:
        false,

      settlementAuthorized:
        false,

      walletSigningAuthorized:
        false,
    };

    this.receivers.set(
      receiver.receiverId,
      receiver,
    );

    return {
      ...receiver,
    };
  }


  async createQuoteResource(
    receiverId: string,
    amount: string,
  ): Promise<QuoteResource> {
    const normalizedReceiverId =
      requireNonEmptyString(
        receiverId,
        "Receiver ID",
      );

    const receiver =
      this.receivers.get(
        normalizedReceiverId,
      );

    if (!receiver) {
      throw new Error(
        "Receiver resource not found.",
      );
    }

    const normalizedAmount =
      parseNonNegativeIntegerAmount(
        amount,
      );

    this.quoteSequence += 1;

    const quote:
      QuoteResource = {
      quoteId:
        `SIM_QUOTE_${this.quoteSequence}`,

      resourceType:
        "SIMULATED_QUOTE",

      receiverId:
        receiver.receiverId,

      destination:
        receiver.destination,

      debitAmount:
        normalizedAmount,

      receiveAmount:
        normalizedAmount,

      assetCode:
        "TEST",

      simulated:
        true,

      paymentAuthorized:
        false,

      settlementAuthorized:
        false,

      walletSigningAuthorized:
        false,
    };

    this.quotes.set(
      quote.quoteId,
      quote,
    );

    return {
      ...quote,
    };
  }


  async reconcileQuote(
    quoteId: string,
  ): Promise<ReconciliationRecord> {
    const normalizedQuoteId =
      requireNonEmptyString(
        quoteId,
        "Quote ID",
      );

    const quote =
      this.quotes.get(
        normalizedQuoteId,
      );

    if (!quote) {
      throw new Error(
        "Quote resource not found.",
      );
    }

    this.reconciliationSequence += 1;

    const reconciliation:
      ReconciliationRecord = {
      reconciliationId:
        `SIM_RECON_${this.reconciliationSequence}`,

      quoteId:
        quote.quoteId,

      receiverId:
        quote.receiverId,

      destination:
        quote.destination,

      expectedDebitAmount:
        quote.debitAmount,

      expectedReceiveAmount:
        quote.receiveAmount,

      assetCode:
        quote.assetCode,

      status:
        "SIMULATED_RECONCILED",

      paymentExecuted:
        false,

      settlementExecuted:
        false,

      walletSigningExecuted:
        false,
    };

    this.reconciliations.set(
      reconciliation.reconciliationId,
      reconciliation,
    );

    return {
      ...reconciliation,
    };
  }


  getReceiverResource(
    receiverId: string,
  ): ReceiverResource | null {
    const receiver =
      this.receivers.get(
        receiverId,
      );

    return receiver
      ? {
          ...receiver,
        }
      : null;
  }


  getQuoteResource(
    quoteId: string,
  ): QuoteResource | null {
    const quote =
      this.quotes.get(
        quoteId,
      );

    return quote
      ? {
          ...quote,
        }
      : null;
  }


  getReconciliationRecord(
    reconciliationId: string,
  ): ReconciliationRecord | null {
    const reconciliation =
      this.reconciliations.get(
        reconciliationId,
      );

    return reconciliation
      ? {
          ...reconciliation,
        }
      : null;
  }


  async pay(
    _destinationWalletAddress: string,
    _amount: string,
  ): Promise<string> {
    /*
    Deliberately fail closed.

    Resource creation and reconciliation must
    never silently become payment execution.
    */
    throw new Error(
      "Open Payments execution is disabled. Sandbox resource mode is active.",
    );
  }
}


/*
Current sandbox flow:

destination
  ↓
simulated receiver resource
  ↓
simulated quote resource
  ↓
local reconciliation record
  ↓
STOP

No external settlement occurs.


Future Open Payments sandbox path:

Phase 1:
  local simulated resources
  quote metadata
  reconciliation
  no payment execution

Phase 2:
  dedicated sandbox receiver
  authenticated read/quote client
  receiver metadata resolution
  incoming-payment / quote resource inspection
  payment authorization remains false

Phase 3:
  separately designed authorization boundary
  explicit human-controlled approval

Only after those boundaries are proven should
an outgoing-payment adapter be considered.


Current boundary:

This adapter does NOT:

- execute payments
- create outgoing payments
- obtain spend authority
- sign wallet transactions
- custody funds
- submit XRPL transactions
- create Mainnet settlement
- silently elevate resource creation into payment
*/