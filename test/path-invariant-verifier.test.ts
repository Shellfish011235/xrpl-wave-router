import assert from "node:assert/strict";
import test from "node:test";

import { verifyPathQueryResult } from "../src/path/PathInvariantVerifier.js";

test("accepts a well-formed read-only pathfinding result", () => {
  const report = verifyPathQueryResult({
    sourceAccount: "rSource",
    destinationAccount: "rDest",
    requestedDestinationAmount: "5000000",
    raw: {
      destination_account: "rDest",
      destination_amount: "5000000",
      alternatives: [
        {
          source_amount: "1000000",
          paths_computed: [[{ currency: "USD", issuer: "rIssuer" }]],
        },
        {
          source_amount: {
            currency: "USD",
            issuer: "rIssuer",
            value: "1.25",
          },
          paths_computed: [[]],
        },
      ],
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.alternativesChecked, 2);
  assert.deepEqual(report.findings, []);
  assert.equal(report.readOnly, true);
});

test("rejects destination metadata that disagrees with the request", () => {
  const report = verifyPathQueryResult({
    sourceAccount: "rSource",
    destinationAccount: "rDest",
    requestedDestinationAmount: "5000000",
    raw: {
      destination_account: "rOther",
      destination_amount: "4000000",
      alternatives: [],
    },
  });

  assert.equal(report.ok, false);
  assert.deepEqual(
    report.findings.map((finding) => finding.code).sort(),
    ["DESTINATION_ACCOUNT_MISMATCH", "DESTINATION_AMOUNT_MISMATCH"],
  );
});

test("rejects malformed or non-positive source amounts without Number coercion", () => {
  const report = verifyPathQueryResult({
    sourceAccount: "rSource",
    destinationAccount: "rDest",
    requestedDestinationAmount: "1",
    raw: {
      destination_account: "rDest",
      destination_amount: "1",
      alternatives: [
        { source_amount: "0" },
        { source_amount: "184467440737095516160000000000000000000" },
        { source_amount: { currency: "USD", issuer: "rIssuer", value: "NaN" } },
      ],
    },
  });

  assert.equal(report.ok, false);
  assert.ok(report.findings.some((f) => f.code === "SOURCE_AMOUNT_NON_POSITIVE"));
  assert.ok(report.findings.some((f) => f.code === "SOURCE_AMOUNT_INVALID"));
});

test("flags malformed path steps and duplicate alternatives", () => {
  const duplicate = {
    source_amount: "1000",
    paths_computed: [[{ currency: "USD", issuer: "rIssuer" }]],
  };

  const report = verifyPathQueryResult({
    sourceAccount: "rSource",
    destinationAccount: "rDest",
    requestedDestinationAmount: "1",
    raw: {
      destination_account: "rDest",
      destination_amount: "1",
      alternatives: [
        duplicate,
        duplicate,
        {
          source_amount: "2000",
          paths_computed: [[{}]],
        },
      ],
    },
  });

  assert.equal(report.ok, false);
  assert.ok(report.findings.some((f) => f.code === "DUPLICATE_ALTERNATIVE"));
  assert.ok(report.findings.some((f) => f.code === "PATH_STEP_EMPTY"));
});

test("fails closed when alternatives is not an array", () => {
  const report = verifyPathQueryResult({
    sourceAccount: "rSource",
    destinationAccount: "rDest",
    requestedDestinationAmount: "1",
    raw: {
      destination_account: "rDest",
      destination_amount: "1",
      alternatives: null,
    },
  });

  assert.equal(report.ok, false);
  assert.ok(report.findings.some((f) => f.code === "ALTERNATIVES_MALFORMED"));
});
