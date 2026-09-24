import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryLedger,
} from "../src/adapters/ledger.js";


test(
  "reserve records simulated accounting entry",
  async () => {
    const ledger =
      new InMemoryLedger();

    await ledger.reserve(
      "JOB_RESERVE_1",
      1000,
    );

    const journal =
      ledger.getJournal();

    assert.equal(
      journal.length,
      1,
    );

    assert.deepEqual(
      journal[0],
      {
        sequence: 1,
        jobId:
          "JOB_RESERVE_1",
        action:
          "RESERVE",
        amountMicrounits:
          1000,
        reservationMicrounits:
          1000,
        availableBalanceMicrounits:
          999000,
        simulated:
          true,
        externalPaymentExecuted:
          false,
        walletSigningAuthorized:
          false,
      },
    );

    assert.equal(
      await ledger.balance(),
      999000,
    );

    assert.equal(
      ledger.getReservation(
        "JOB_RESERVE_1",
      ),
      1000,
    );
  },
);


test(
  "post records charged amount and releases unused reservation",
  async () => {
    const ledger =
      new InMemoryLedger();

    await ledger.reserve(
      "JOB_POST_1",
      1000,
    );

    await ledger.post(
      "JOB_POST_1",
      700,
    );

    const journal =
      ledger.getJournal();

    assert.equal(
      journal.length,
      2,
    );

    assert.equal(
      journal[1].sequence,
      2,
    );

    assert.equal(
      journal[1].action,
      "POST",
    );

    assert.equal(
      journal[1].amountMicrounits,
      700,
    );

    assert.equal(
      journal[1].reservationMicrounits,
      1000,
    );

    assert.equal(
      journal[1].availableBalanceMicrounits,
      999300,
    );

    assert.equal(
      journal[1].simulated,
      true,
    );

    assert.equal(
      journal[1].externalPaymentExecuted,
      false,
    );

    assert.equal(
      journal[1].walletSigningAuthorized,
      false,
    );

    assert.equal(
      await ledger.balance(),
      999300,
    );

    assert.equal(
      ledger.getReservation(
        "JOB_POST_1",
      ),
      null,
    );
  },
);


test(
  "void restores reservation and records simulated release",
  async () => {
    const ledger =
      new InMemoryLedger();

    await ledger.reserve(
      "JOB_VOID_1",
      2500,
    );

    await ledger.void(
      "JOB_VOID_1",
    );

    const journal =
      ledger.getJournal();

    assert.equal(
      journal.length,
      2,
    );

    assert.equal(
      journal[1].action,
      "VOID",
    );

    assert.equal(
      journal[1].amountMicrounits,
      2500,
    );

    assert.equal(
      journal[1].reservationMicrounits,
      2500,
    );

    assert.equal(
      journal[1].availableBalanceMicrounits,
      1000000,
    );

    assert.equal(
      journal[1].externalPaymentExecuted,
      false,
    );

    assert.equal(
      journal[1].walletSigningAuthorized,
      false,
    );

    assert.equal(
      await ledger.balance(),
      1000000,
    );

    assert.equal(
      ledger.getReservation(
        "JOB_VOID_1",
      ),
      null,
    );
  },
);


test(
  "invalid reserve amount fails closed without journal mutation",
  async () => {
    const ledger =
      new InMemoryLedger();

    await assert.rejects(
      ledger.reserve(
        "JOB_INVALID_1",
        -1,
      ),
      /non-negative safe integer/,
    );

    assert.equal(
      ledger.getJournal().length,
      0,
    );

    assert.equal(
      await ledger.balance(),
      1000000,
    );
  },
);


test(
  "charge above reservation fails without changing accounting state",
  async () => {
    const ledger =
      new InMemoryLedger();

    await ledger.reserve(
      "JOB_OVERCHARGE_1",
      1000,
    );

    await assert.rejects(
      ledger.post(
        "JOB_OVERCHARGE_1",
        1001,
      ),
      /Charge exceeds reservation/,
    );

    const journal =
      ledger.getJournal();

    assert.equal(
      journal.length,
      1,
    );

    assert.equal(
      journal[0].action,
      "RESERVE",
    );

    assert.equal(
      await ledger.balance(),
      999000,
    );

    assert.equal(
      ledger.getReservation(
        "JOB_OVERCHARGE_1",
      ),
      1000,
    );
  },
);


test(
  "journal copies cannot mutate internal accounting history",
  async () => {
    const ledger =
      new InMemoryLedger();

    await ledger.reserve(
      "JOB_COPY_1",
      500,
    );

    const firstRead =
      ledger.getJournal();

    firstRead[0].amountMicrounits =
      999999;

    const secondRead =
      ledger.getJournal();

    assert.equal(
      secondRead[0].amountMicrounits,
      500,
    );
  },
);