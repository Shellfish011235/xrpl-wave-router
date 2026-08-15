import crypto from "node:crypto";

export interface IlpQuote {
  quoteId: string;
  protocol: "ILP";
  sourceAsset: string;
  destinationAsset: string;
  sendAmount: string;
  receiveAmount: string;
  destination: string;
  route: string[];
  expiresAt: string;
  mode: "simulated" | "live";
}

export interface IlpReceipt {
  paymentId: string;
  quoteId: string;
  protocol: "ILP";
  status: "completed";
  deliveredAmount: string;
  destination: string;
  settlementTarget: "XRPL";
  mode: "simulated" | "live";
}

export interface IlpPaymentAdapter {
  quote(destination: string, amount: string): Promise<IlpQuote>;
  pay(quote: IlpQuote): Promise<IlpReceipt>;
}

/**
 * Hackathon-safe ILP adapter.
 *
 * It models the real product boundary now: Wave Router selects an AI provider,
 * ILP routes value to that provider, and XRPL is the preferred settlement target.
 * Replace this class with an Open Payments / Rafiki-backed implementation without
 * changing the router or execution pipeline.
 */
export class SimulatedIlpAdapter implements IlpPaymentAdapter {
  async quote(destination: string, amount: string): Promise<IlpQuote> {
    return {
      quoteId: `ilp-quote-${crypto.randomUUID()}`,
      protocol: "ILP",
      sourceAsset: "RLUSD",
      destinationAsset: "RLUSD",
      sendAmount: amount,
      receiveAmount: amount,
      destination,
      route: ["Wave Router", "ILP", "XRPL settlement target", destination],
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      mode: "simulated",
    };
  }

  async pay(quote: IlpQuote): Promise<IlpReceipt> {
    return {
      paymentId: `ilp-payment-${crypto.randomUUID()}`,
      quoteId: quote.quoteId,
      protocol: "ILP",
      status: "completed",
      deliveredAmount: quote.receiveAmount,
      destination: quote.destination,
      settlementTarget: "XRPL",
      mode: quote.mode,
    };
  }
}
