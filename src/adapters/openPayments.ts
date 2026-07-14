export interface PaymentQuote {
  debitAmount: string;
  receiveAmount: string;
  assetCode: string;
}

export interface StreamingPaymentAdapter {
  quote(destinationWalletAddress: string, amount: string): Promise<PaymentQuote>;
  pay(destinationWalletAddress: string, amount: string): Promise<string>;
}

export class DisabledOpenPaymentsAdapter implements StreamingPaymentAdapter {
  async quote(_destination: string, amount: string): Promise<PaymentQuote> {
    return {
      debitAmount: amount,
      receiveAmount: amount,
      assetCode: "TEST",
    };
  }

  async pay(_destination: string, _amount: string): Promise<string> {
    return `simulated-payment-${crypto.randomUUID()}`;
  }
}

/*
Next phase:
- Initialize @interledger/open-payments with createAuthenticatedClient.
- Resolve the receiver wallet address.
- Create an incoming payment or quote as required by the flow.
- Obtain the sender grant.
- Create the outgoing payment.
- Store all resource URLs and IDs in PostgreSQL for reconciliation.
*/
