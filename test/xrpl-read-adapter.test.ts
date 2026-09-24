import assert from "node:assert/strict";
import test from "node:test";

import {
  XrplSettlementAdapter,
  type XrplReadClient,
  type XrplReadClientFactory,
} from "../src/adapters/xrpl.js";


class FakeXrplReadClient
  implements XrplReadClient
{
  public connected = false;

  public disconnected = false;

  public readonly requests: unknown[] = [];


  async connect():
    Promise<void> {
    this.connected =
      true;
  }


  async disconnect():
    Promise<void> {
    this.disconnected =
      true;
  }


  async request(
    request: any,
  ): Promise<any> {
    this.requests.push(
      request,
    );

    if (
      request.command ===
      "server_info"
    ) {
      return {
        result: {
          info: {
            build_version:
              "2.5.0",

            complete_ledgers:
              "32570-99999",

            validated_ledger: {
              seq:
                99999,
            },
          },
        },
      };
    }


    if (
      request.command ===
      "account_info"
    ) {
      return {
        result: {
          account_data: {
            Account:
              request.account,

            Sequence:
              42,

            Balance:
              "25000000",

            OwnerCount:
              3,

            PreviousTxnLgrSeq:
              99990,
          },
        },
      };
    }


    if (
      request.command ===
      "ripple_path_find"
    ) {
      return {
        result: {
          alternatives: [
            {
              source_amount:
                "1000000",
            },

            {
              source_amount:
                "1002500",
            },
          ],

          destination_account:
            request.destination_account,

          destination_amount:
            request.destination_amount,
        },
      };
    }


    throw new Error(
      `Unexpected XRPL command: ${request.command}`,
    );
  }
}


function createHarness() {
  let client:
    FakeXrplReadClient | null =
      null;

  const factory:
    XrplReadClientFactory =
      (_server) => {
        client =
          new FakeXrplReadClient();

        return client;
      };

  const adapter =
    new XrplSettlementAdapter(
      "wss://example.invalid",
      factory,
    );

  return {
    adapter,

    getClient() {
      assert.ok(client);

      return client;
    },
  };
}


test(
  "reads XRPL server info through read-only client",
  async () => {
    const harness =
      createHarness();

    const result =
      await harness.adapter
        .getServerInfo();

    assert.equal(
      result.buildVersion,
      "2.5.0",
    );

    assert.equal(
      result.completeLedgers,
      "32570-99999",
    );

    assert.equal(
      result.validatedLedgerSequence,
      99999,
    );

    assert.equal(
      result.readOnly,
      true,
    );

    const client =
      harness.getClient();

    assert.equal(
      client.connected,
      true,
    );

    assert.equal(
      client.disconnected,
      true,
    );

    assert.deepEqual(
      client.requests,
      [
        {
          command:
            "server_info",
        },
      ],
    );
  },
);


test(
  "reads validated XRPL account state",
  async () => {
    const harness =
      createHarness();

    const account =
      "rExampleAccount111111111111111111";

    const result =
      await harness.adapter
        .getAccountInfo(
          account,
        );

    assert.equal(
      result.account,
      account,
    );

    assert.equal(
      result.sequence,
      42,
    );

    assert.equal(
      result.balanceDrops,
      "25000000",
    );

    assert.equal(
      result.ownerCount,
      3,
    );

    assert.equal(
      result.previousTxnLgrSeq,
      99990,
    );

    assert.equal(
      result.readOnly,
      true,
    );

    const client =
      harness.getClient();

    assert.deepEqual(
      client.requests,
      [
        {
          command:
            "account_info",

          account,

          ledger_index:
            "validated",

          strict:
            true,
        },
      ],
    );

    assert.equal(
      client.disconnected,
      true,
    );
  },
);


test(
  "rejects missing XRPL account before opening client",
  async () => {
    let factoryCalled =
      false;

    const factory:
      XrplReadClientFactory =
        (_server) => {
          factoryCalled =
            true;

          return new FakeXrplReadClient();
        };

    const adapter =
      new XrplSettlementAdapter(
        "wss://example.invalid",
        factory,
      );

    await assert.rejects(
      adapter.getAccountInfo(
        "   ",
      ),
      /XRPL account is required/,
    );

    assert.equal(
      factoryCalled,
      false,
    );
  },
);


test(
  "reads XRPL pathfinding alternatives without execution",
  async () => {
    const harness =
      createHarness();

    const result =
      await harness.adapter
        .findSettlementPaths({
          sourceAccount:
            "rSource111111111111111111111111",

          destinationAccount:
            "rDestination11111111111111111111",

          destinationAmount:
            "5000000",
        });

    assert.equal(
      result.sourceAccount,
      "rSource111111111111111111111111",
    );

    assert.equal(
      result.destinationAccount,
      "rDestination11111111111111111111",
    );

    assert.equal(
      result.alternativesCount,
      2,
    );

    assert.equal(
      result.readOnly,
      true,
    );

    const client =
      harness.getClient();

    assert.equal(
      client.connected,
      true,
    );

    assert.equal(
      client.disconnected,
      true,
    );

    const request =
      client.requests[0] as any;

    assert.equal(
      request.command,
      "ripple_path_find",
    );

    assert.equal(
      request.source_account,
      "rSource111111111111111111111111",
    );

    assert.equal(
      request.destination_account,
      "rDestination11111111111111111111",
    );

    assert.equal(
      request.destination_amount,
      "5000000",
    );
  },
);


test(
  "rejects missing source account before opening client",
  async () => {
    let factoryCalled =
      false;

    const factory:
      XrplReadClientFactory =
        (_server) => {
          factoryCalled =
            true;

          return new FakeXrplReadClient();
        };

    const adapter =
      new XrplSettlementAdapter(
        "wss://example.invalid",
        factory,
      );

    await assert.rejects(
      adapter.findSettlementPaths({
        sourceAccount:
          "",

        destinationAccount:
          "rDestination11111111111111111111",

        destinationAmount:
          "1000",
      }),
      /Source account is required/,
    );

    assert.equal(
      factoryCalled,
      false,
    );
  },
);


test(
  "rejects missing destination account before opening client",
  async () => {
    let factoryCalled =
      false;

    const factory:
      XrplReadClientFactory =
        (_server) => {
          factoryCalled =
            true;

          return new FakeXrplReadClient();
        };

    const adapter =
      new XrplSettlementAdapter(
        "wss://example.invalid",
        factory,
      );

    await assert.rejects(
      adapter.findSettlementPaths({
        sourceAccount:
          "rSource111111111111111111111111",

        destinationAccount:
          "   ",

        destinationAmount:
          "1000",
      }),
      /Destination account is required/,
    );

    assert.equal(
      factoryCalled,
      false,
    );
  },
);


test(
  "disconnects XRPL client when request fails",
  async () => {
    let client:
      FakeXrplReadClient | null =
        null;

    const factory:
      XrplReadClientFactory =
        (_server) => {
          client =
            new FakeXrplReadClient();

          client.request =
            async () => {
              throw new Error(
                "simulated XRPL failure",
              );
            };

          return client;
        };

    const adapter =
      new XrplSettlementAdapter(
        "wss://example.invalid",
        factory,
      );

    await assert.rejects(
      adapter.getServerInfo(),
      /simulated XRPL failure/,
    );

    assert.ok(client);

    assert.equal(
      client.connected,
      true,
    );

    assert.equal(
      client.disconnected,
      true,
    );
  },
);