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


export interface StreamingPaymentAdapter {
  inspectDestination(
    destinationWalletAddress: string,
  ): Promise<PaymentDestinationInfo>;

  quote(
    destinationWalletAddress: string,
    amount: string,
  ): Promise<PaymentQuote>;

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
    parsed <
    0n
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
  async inspectDestination(
    destinationWalletAddress: string,
  ): Promise<PaymentDestinationInfo> {
    const destination =
      requireNonEmptyString(
        destinationWalletAddress,
        "Destination",
      );

    /*
    This is intentionally observational only.

    No network lookup is performed here.
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

    /*
    This quote is simulated.

    It exists so the Wave Router can test:

      route
      → quote
      → accounting intent
      → reconciliation logic

    without creating a real payment.
    */
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


  async pay(
    _destinationWalletAddress: string,
    _amount: string,
  ): Promise<string> {
    /*
    Deliberately fail closed.

    The current adapter must never convert
    quote capability into payment capability.
    */
    throw new Error(
      "Open Payments execution is disabled. Quote-only sandbox mode is active.",
    );
  }
}


/*
Future Open Payments sandbox path:

Phase 1:
  inspect destination metadata
  create/read quote data
  record simulated accounting intent
  reconcile locally
  no payment execution

Phase 2:
  use a local or dedicated sandbox receiver
  authenticate an Open Payments client
  resolve receiver metadata
  request quote/incoming-payment resources
  preserve payment authorization as false

Phase 3:
  separately design payment authorization
  with explicit human-controlled approval

Only after those boundaries are proven should
an outgoing payment adapter be considered.


Current boundary:

This adapter does NOT:

- execute payments
- create outgoing payments
- obtain spend authority
- sign wallet transactions
- custody funds
- submit XRPL transactions
- silently elevate a quote into settlement
*/