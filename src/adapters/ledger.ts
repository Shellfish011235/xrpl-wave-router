export interface LedgerAdapter {
  reserve(
    jobId: string,
    amountMicrounits: number,
  ): Promise<void>;

  post(
    jobId: string,
    amountMicrounits: number,
  ): Promise<void>;

  void(
    jobId: string,
  ): Promise<void>;

  balance(): Promise<number>;
}


export type LedgerJournalAction =
  | "RESERVE"
  | "POST"
  | "VOID";


export interface LedgerJournalEntry {
  sequence: number;
  jobId: string;
  action: LedgerJournalAction;

  /*
  Meaning depends on action:

  RESERVE:
    amount requested for reservation

  POST:
    amount actually charged

  VOID:
    amount released back to available balance
  */
  amountMicrounits: number;

  /*
  Original reservation associated with the job.
  */
  reservationMicrounits: number;

  /*
  Simulated available balance immediately
  after this ledger action completes.
  */
  availableBalanceMicrounits: number;

  /*
  Explicitly documents that this journal is
  accounting evidence only and does not represent
  an external payment or wallet action.
  */
  simulated: true;
  externalPaymentExecuted: false;
  walletSigningAuthorized: false;
}


export class InMemoryLedger
  implements LedgerAdapter
{
  private available = 1_000_000;

  private readonly reservations =
    new Map<string, number>();

  private readonly journal:
    LedgerJournalEntry[] = [];

  private journalSequence = 0;


  private recordJournalEntry(
    jobId: string,
    action: LedgerJournalAction,
    amountMicrounits: number,
    reservationMicrounits: number,
  ): void {
    this.journalSequence += 1;

    this.journal.push({
      sequence:
        this.journalSequence,

      jobId,

      action,

      amountMicrounits,

      reservationMicrounits,

      availableBalanceMicrounits:
        this.available,

      simulated: true,

      externalPaymentExecuted:
        false,

      walletSigningAuthorized:
        false,
    });
  }


  async reserve(
    jobId: string,
    amountMicrounits: number,
  ): Promise<void> {
    if (
      !Number.isSafeInteger(
        amountMicrounits,
      ) ||
      amountMicrounits < 0
    ) {
      throw new Error(
        "Reservation amount must be a non-negative safe integer.",
      );
    }

    if (
      this.reservations.has(
        jobId,
      )
    ) {
      throw new Error(
        "Duplicate job ID.",
      );
    }

    if (
      amountMicrounits >
      this.available
    ) {
      throw new Error(
        "Insufficient balance.",
      );
    }

    this.available -=
      amountMicrounits;

    this.reservations.set(
      jobId,
      amountMicrounits,
    );

    this.recordJournalEntry(
      jobId,
      "RESERVE",
      amountMicrounits,
      amountMicrounits,
    );
  }


  async post(
    jobId: string,
    amountMicrounits: number,
  ): Promise<void> {
    if (
      !Number.isSafeInteger(
        amountMicrounits,
      ) ||
      amountMicrounits < 0
    ) {
      throw new Error(
        "Post amount must be a non-negative safe integer.",
      );
    }

    const reserved =
      this.reservations.get(
        jobId,
      );

    if (
      reserved === undefined
    ) {
      throw new Error(
        "Reservation not found.",
      );
    }

    if (
      amountMicrounits >
      reserved
    ) {
      throw new Error(
        "Charge exceeds reservation.",
      );
    }

    /*
    The reservation was removed from the available
    balance during reserve().

    Any unused amount is returned here.

    Example:

      reserve 100
      post 70

    30 is released back to available balance.
    */
    this.available +=
      reserved -
      amountMicrounits;

    this.reservations.delete(
      jobId,
    );

    this.recordJournalEntry(
      jobId,
      "POST",
      amountMicrounits,
      reserved,
    );
  }


  async void(
    jobId: string,
  ): Promise<void> {
    const reserved =
      this.reservations.get(
        jobId,
      );

    if (
      reserved === undefined
    ) {
      return;
    }

    this.available +=
      reserved;

    this.reservations.delete(
      jobId,
    );

    this.recordJournalEntry(
      jobId,
      "VOID",
      reserved,
      reserved,
    );
  }


  async balance(): Promise<number> {
    return this.available;
  }


  getJournal():
    LedgerJournalEntry[] {
    /*
    Return copies rather than exposing the
    ledger's internal journal array directly.
    */
    return this.journal.map(
      (entry) => ({
        ...entry,
      }),
    );
  }


  getReservation(
    jobId: string,
  ): number | null {
    const reservation =
      this.reservations.get(
        jobId,
      );

    return (
      reservation === undefined
        ? null
        : reservation
    );
  }
}


/*
Future TigerBeetle mapping:

reserve:
  create a Transfer with flags.pending
  and a timeout

post:
  create another Transfer with
  flags.post_pending_transfer,
  with pending_id pointing to
  the reservation

void:
  create another Transfer with
  flags.void_pending_transfer

Use:

- integer microunits
- deterministic 128-bit IDs
- idempotent transaction identities
- immutable accounting records
- explicit reconciliation

Current boundary:

This adapter is simulated accounting only.

It does NOT:

- move real money
- sign wallet transactions
- authorize payment
- custody funds
- execute XRPL settlement
- execute Open Payments settlement
*/