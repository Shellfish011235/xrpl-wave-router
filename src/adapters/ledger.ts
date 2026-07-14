export interface LedgerAdapter {
  reserve(jobId: string, amountMicrounits: number): Promise<void>;
  post(jobId: string, amountMicrounits: number): Promise<void>;
  void(jobId: string): Promise<void>;
  balance(): Promise<number>;
}

export class InMemoryLedger implements LedgerAdapter {
  private available = 1_000_000;
  private readonly reservations = new Map<string, number>();

  async reserve(jobId: string, amount: number): Promise<void> {
    if (this.reservations.has(jobId)) throw new Error("Duplicate job ID.");
    if (amount > this.available) throw new Error("Insufficient balance.");
    this.available -= amount;
    this.reservations.set(jobId, amount);
  }

  async post(jobId: string, amount: number): Promise<void> {
    const reserved = this.reservations.get(jobId);
    if (reserved === undefined) throw new Error("Reservation not found.");
    if (amount > reserved) throw new Error("Charge exceeds reservation.");
    this.available += reserved - amount;
    this.reservations.delete(jobId);
  }

  async void(jobId: string): Promise<void> {
    const reserved = this.reservations.get(jobId);
    if (reserved !== undefined) {
      this.available += reserved;
      this.reservations.delete(jobId);
    }
  }

  async balance(): Promise<number> {
    return this.available;
  }
}

/*
TigerBeetle production mapping:

reserve:
  create a Transfer with flags.pending and a timeout

post:
  create another Transfer with flags.post_pending_transfer,
  pending_id pointing to the reservation

void:
  create another Transfer with flags.void_pending_transfer

Use integer microunits and deterministic 128-bit IDs for idempotency.
*/
