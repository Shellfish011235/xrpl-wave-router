import assert from "node:assert/strict";
import test from "node:test";

import {
  DisabledOpenPaymentsAdapter,
} from "../src/adapters/openPayments.js";


test(
  "inspect destination remains observational and non-authorizing",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const result =
      await adapter.inspectDestination(
        "https://example.invalid/pay",
      );

    assert.equal(
      result.destination,
      "https://example.invalid/pay",
    );

    assert.equal(
      result.reachable,
      false,
    );

    assert.equal(
      result.mode,
      "SIMULATED",
    );

    assert.equal(
      result.paymentAuthorized,
      false,
    );

    assert.equal(
      result.settlementAuthorized,
      false,
    );

    assert.equal(
      result.walletSigningAuthorized,
      false,
    );
  },
);


test(
  "quote returns simulated non-authorizing payment data",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const quote =
      await adapter.quote(
        "https://example.invalid/pay",
        "2500",
      );

    assert.equal(
      quote.debitAmount,
      "2500",
    );

    assert.equal(
      quote.receiveAmount,
      "2500",
    );

    assert.equal(
      quote.assetCode,
      "TEST",
    );

    assert.equal(
      quote.simulated,
      true,
    );

    assert.equal(
      quote.paymentAuthorized,
      false,
    );

    assert.equal(
      quote.settlementAuthorized,
      false,
    );

    assert.equal(
      quote.walletSigningAuthorized,
      false,
    );
  },
);


test(
  "quote normalizes integer amount",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const quote =
      await adapter.quote(
        "https://example.invalid/pay",
        "0002500",
      );

    assert.equal(
      quote.debitAmount,
      "2500",
    );

    assert.equal(
      quote.receiveAmount,
      "2500",
    );
  },
);


test(
  "quote rejects invalid amount",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.quote(
        "https://example.invalid/pay",
        "25.50",
      ),
      /non-negative integer string/,
    );
  },
);


test(
  "quote rejects missing destination",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.quote(
        "   ",
        "1000",
      ),
      /Destination is required/,
    );
  },
);


test(
  "destination inspection rejects missing destination",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.inspectDestination(
        "",
      ),
      /Destination is required/,
    );
  },
);


test(
  "pay fails closed in sandbox mode",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.pay(
        "https://example.invalid/pay",
        "2500",
      ),
      /execution is disabled/,
    );
  },
);
