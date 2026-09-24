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
  "creates simulated receiver resource without payment authority",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    assert.equal(
      receiver.receiverId,
      "SIM_RECEIVER_1",
    );

    assert.equal(
      receiver.resourceType,
      "SIMULATED_RECEIVER",
    );

    assert.equal(
      receiver.destination,
      "https://example.invalid/receiver",
    );

    assert.equal(
      receiver.mode,
      "SIMULATED",
    );

    assert.equal(
      receiver.reachable,
      false,
    );

    assert.equal(
      receiver.paymentAuthorized,
      false,
    );

    assert.equal(
      receiver.settlementAuthorized,
      false,
    );

    assert.equal(
      receiver.walletSigningAuthorized,
      false,
    );
  },
);


test(
  "creates simulated quote resource bound to receiver",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    const quote =
      await adapter.createQuoteResource(
        receiver.receiverId,
        "5000",
      );

    assert.equal(
      quote.quoteId,
      "SIM_QUOTE_1",
    );

    assert.equal(
      quote.resourceType,
      "SIMULATED_QUOTE",
    );

    assert.equal(
      quote.receiverId,
      receiver.receiverId,
    );

    assert.equal(
      quote.destination,
      receiver.destination,
    );

    assert.equal(
      quote.debitAmount,
      "5000",
    );

    assert.equal(
      quote.receiveAmount,
      "5000",
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
  "quote resource rejects unknown receiver",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.createQuoteResource(
        "UNKNOWN_RECEIVER",
        "1000",
      ),
      /Receiver resource not found/,
    );
  },
);


test(
  "reconciles simulated quote without settlement execution",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    const quote =
      await adapter.createQuoteResource(
        receiver.receiverId,
        "7500",
      );

    const reconciliation =
      await adapter.reconcileQuote(
        quote.quoteId,
      );

    assert.equal(
      reconciliation.reconciliationId,
      "SIM_RECON_1",
    );

    assert.equal(
      reconciliation.quoteId,
      quote.quoteId,
    );

    assert.equal(
      reconciliation.receiverId,
      receiver.receiverId,
    );

    assert.equal(
      reconciliation.destination,
      receiver.destination,
    );

    assert.equal(
      reconciliation.expectedDebitAmount,
      "7500",
    );

    assert.equal(
      reconciliation.expectedReceiveAmount,
      "7500",
    );

    assert.equal(
      reconciliation.assetCode,
      "TEST",
    );

    assert.equal(
      reconciliation.status,
      "SIMULATED_RECONCILED",
    );

    assert.equal(
      reconciliation.paymentExecuted,
      false,
    );

    assert.equal(
      reconciliation.settlementExecuted,
      false,
    );

    assert.equal(
      reconciliation.walletSigningExecuted,
      false,
    );
  },
);


test(
  "reconciliation rejects unknown quote",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    await assert.rejects(
      adapter.reconcileQuote(
        "UNKNOWN_QUOTE",
      ),
      /Quote resource not found/,
    );
  },
);


test(
  "stored receiver resource is returned as a copy",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    const firstRead =
      adapter.getReceiverResource(
        receiver.receiverId,
      );

    assert.ok(firstRead);

    firstRead.destination =
      "tampered";

    const secondRead =
      adapter.getReceiverResource(
        receiver.receiverId,
      );

    assert.ok(secondRead);

    assert.equal(
      secondRead.destination,
      "https://example.invalid/receiver",
    );
  },
);


test(
  "stored quote resource is returned as a copy",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    const quote =
      await adapter.createQuoteResource(
        receiver.receiverId,
        "9000",
      );

    const firstRead =
      adapter.getQuoteResource(
        quote.quoteId,
      );

    assert.ok(firstRead);

    firstRead.debitAmount =
      "999999";

    const secondRead =
      adapter.getQuoteResource(
        quote.quoteId,
      );

    assert.ok(secondRead);

    assert.equal(
      secondRead.debitAmount,
      "9000",
    );
  },
);


test(
  "stored reconciliation is returned as a copy",
  async () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    const receiver =
      await adapter.createReceiverResource(
        "https://example.invalid/receiver",
      );

    const quote =
      await adapter.createQuoteResource(
        receiver.receiverId,
        "10000",
      );

    const reconciliation =
      await adapter.reconcileQuote(
        quote.quoteId,
      );

    const firstRead =
      adapter.getReconciliationRecord(
        reconciliation.reconciliationId,
      );

    assert.ok(firstRead);

    firstRead.expectedDebitAmount =
      "999999";

    const secondRead =
      adapter.getReconciliationRecord(
        reconciliation.reconciliationId,
      );

    assert.ok(secondRead);

    assert.equal(
      secondRead.expectedDebitAmount,
      "10000",
    );
  },
);


test(
  "missing simulated resources return null",
  () => {
    const adapter =
      new DisabledOpenPaymentsAdapter();

    assert.equal(
      adapter.getReceiverResource(
        "UNKNOWN_RECEIVER",
      ),
      null,
    );

    assert.equal(
      adapter.getQuoteResource(
        "UNKNOWN_QUOTE",
      ),
      null,
    );

    assert.equal(
      adapter.getReconciliationRecord(
        "UNKNOWN_RECON",
      ),
      null,
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