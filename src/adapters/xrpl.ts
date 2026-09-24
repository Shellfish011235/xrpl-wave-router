import {
  Client,
  type AccountInfoRequest,
  type Amount,
  type RipplePathFindRequest,
  type ServerInfoRequest,
} from "xrpl";


export interface XrplServerSnapshot {
  buildVersion: string | null;
  completeLedgers: string | null;
  validatedLedgerSequence: number | null;
  readOnly: true;
}


export interface XrplAccountSnapshot {
  account: string;
  sequence: number;
  balanceDrops: string;
  ownerCount: number;
  previousTxnLgrSeq: number | null;
  readOnly: true;
}


export interface XrplPathQueryResult {
  sourceAccount: string;
  destinationAccount: string;
  alternativesCount: number;
  raw: unknown;
  readOnly: true;
}


export interface XrplReadClient {
  connect(): Promise<void>;

  disconnect(): Promise<void>;

  request(
    request:
      | ServerInfoRequest
      | AccountInfoRequest
      | RipplePathFindRequest,
  ): Promise<any>;
}


export type XrplReadClientFactory = (
  server: string,
) => XrplReadClient;


function defaultClientFactory(
  server: string,
): XrplReadClient {
  return new Client(
    server,
  );
}


function requireAccount(
  account: string,
  label: string,
): string {
  if (
    typeof account !==
      "string" ||
    account.trim().length ===
      0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return account.trim();
}


export class XrplSettlementAdapter {
  constructor(
    private readonly server: string,

    private readonly clientFactory:
      XrplReadClientFactory =
        defaultClientFactory,
  ) {}


  private async withClient<T>(
    operation: (
      client: XrplReadClient,
    ) => Promise<T>,
  ): Promise<T> {
    const client =
      this.clientFactory(
        this.server,
      );

    await client.connect();

    try {
      return await operation(
        client,
      );
    } finally {
      await client.disconnect();
    }
  }


  async getServerInfo():
    Promise<XrplServerSnapshot> {
    return await this.withClient(
      async (
        client,
      ) => {
        const request:
          ServerInfoRequest = {
          command:
            "server_info",
        };

        const response =
          await client.request(
            request,
          );

        const info =
          response.result.info;

        const validatedLedger =
          info.validated_ledger;

        return {
          buildVersion:
            typeof info.build_version ===
            "string"
              ? info.build_version
              : null,

          completeLedgers:
            typeof info.complete_ledgers ===
            "string"
              ? info.complete_ledgers
              : null,

          validatedLedgerSequence:
            validatedLedger &&
            typeof validatedLedger.seq ===
              "number"
              ? validatedLedger.seq
              : null,

          readOnly:
            true,
        };
      },
    );
  }


  async getAccountInfo(
    account: string,
  ): Promise<XrplAccountSnapshot> {
    const normalizedAccount =
      requireAccount(
        account,
        "XRPL account",
      );

    return await this.withClient(
      async (
        client,
      ) => {
        const request:
          AccountInfoRequest = {
          command:
            "account_info",

          account:
            normalizedAccount,

          ledger_index:
            "validated",

          strict:
            true,
        };

        const response =
          await client.request(
            request,
          );

        const data =
          response.result
            .account_data;

        return {
          account:
            data.Account,

          sequence:
            data.Sequence,

          balanceDrops:
            data.Balance,

          ownerCount:
            data.OwnerCount,

          previousTxnLgrSeq:
            typeof data.PreviousTxnLgrSeq ===
            "number"
              ? data.PreviousTxnLgrSeq
              : null,

          readOnly:
            true,
        };
      },
    );
  }


  async findSettlementPaths(
    input: {
      sourceAccount: string;
      destinationAccount: string;
      destinationAmount: Amount;
      sourceCurrencies?: Array<{
        currency: string;
        issuer?: string;
      }>;
    },
  ): Promise<XrplPathQueryResult> {
    const sourceAccount =
      requireAccount(
        input.sourceAccount,
        "Source account",
      );

    const destinationAccount =
      requireAccount(
        input.destinationAccount,
        "Destination account",
      );

    return await this.withClient(
      async (
        client,
      ) => {
        const request:
          RipplePathFindRequest = {
          command:
            "ripple_path_find",

          source_account:
            sourceAccount,

          destination_account:
            destinationAccount,

          destination_amount:
            input.destinationAmount,

          source_currencies:
            input.sourceCurrencies,
        };

        const response =
          await client.request(
            request,
          );

        const alternatives =
          Array.isArray(
            response.result
              .alternatives,
          )
            ? response.result
                .alternatives
            : [];

        return {
          sourceAccount,

          destinationAccount,

          alternativesCount:
            alternatives.length,

          raw:
            response.result,

          readOnly:
            true,
        };
      },
    );
  }
}


/*
XRPL adapter boundary:

Allowed:

- connect to an XRPL server
- read server metadata
- read validated account state
- request pathfinding information
- inspect returned route alternatives

Not allowed:

- wallet creation
- seed handling
- private-key handling
- transaction signing
- submit
- submit_multisigned
- autofill-and-sign flows
- transaction broadcast
- custody
- payment execution

The client factory exists only to make the read boundary
testable without a live XRPL server.

Injecting a client does not add transaction authority.

Any future transaction-producing adapter must be implemented
separately behind an explicit authorization boundary.
*/