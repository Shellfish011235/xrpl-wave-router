import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface ReplayRecord {
  expiresAt: string;
}

type ReplayState = Record<string, ReplayRecord>;

function replayStorePath(): string {
  return resolve(
    process.env.ASSURANCE_REPLAY_STORE_PATH ??
      ".runtime/assurance-replay.json",
  );
}

function readState(): ReplayState {
  const path = replayStorePath();

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ReplayState;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function writeState(state: ReplayState): void {
  const path = replayStorePath();
  mkdirSync(dirname(path), { recursive: true });

  const temporaryPath = path + ".tmp";

  writeFileSync(
    temporaryPath,
    JSON.stringify(state, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600 },
  );

  renameSync(temporaryPath, path);
}

function pruneExpired(state: ReplayState, nowMs: number): ReplayState {
  const pruned: ReplayState = {};

  for (const [nonce, record] of Object.entries(state)) {
    const expiryMs = Date.parse(record.expiresAt);

    if (Number.isFinite(expiryMs) && expiryMs > nowMs) {
      pruned[nonce] = record;
    }
  }

  return pruned;
}

export function consumeAssuranceNonce(
  nonce: string,
  expiresAt: string,
  nowMs = Date.now(),
): boolean {
  const state = pruneExpired(readState(), nowMs);

  if (state[nonce]) {
    writeState(state);
    return false;
  }

  state[nonce] = { expiresAt };
  writeState(state);
  return true;
}
