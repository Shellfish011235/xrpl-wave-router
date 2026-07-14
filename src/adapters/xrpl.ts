import { Client, type RipplePathFindRequest } from "xrpl";

export class XrplSettlementAdapter {
  constructor(private readonly server: string) {}

  async findSettlementPaths(input: {
    sourceAccount: string;
    destinationAccount: string;
    destinationAmount: {
      currency: string;
      issuer?: string;
      value: string;
    };
    sourceCurrencies?: Array<{ currency: string; issuer?: string }>;
  }) {
    const client = new Client(this.server);
    await client.connect();

    try {
      const request: RipplePathFindRequest = {
        command: "ripple_path_find",
        source_account: input.sourceAccount,
        destination_account: input.destinationAccount,
        destination_amount: input.destinationAmount,
        source_currencies: input.sourceCurrencies,
      };

      return await client.request(request);
    } finally {
      await client.disconnect();
    }
  }
}
