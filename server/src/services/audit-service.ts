/**
 * Immutable Audit Log Service
 *
 * Append-only log with hash chain integrity for security-sensitive operations.
 * Each entry includes a SHA-256 hash of the previous entry, creating a tamper-evident chain.
 *
 * Log files are stored as JSONL (one JSON object per line) with monthly rotation:
 *   {dataDir}/audit/audit-{YYYY-MM}.log
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createLogger } from '../lib/logger.js';

const log = createLogger('audit');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEvent {
  /** Action performed (e.g., auth.login, task.create, settings.update) */
  action: string;
  /** Who performed the action (user ID, API key hash, or "system") */
  actor: string;
  /** What was affected (task ID, setting name, etc.) */
  resource?: string;
  /** Additional context (IP, user agent, etc.) */
  details?: Record<string, unknown>;
}

export interface AuditEntry extends AuditEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** SHA-256 hash of the previous entry (hex). Empty string for the first entry. */
  integrity: string;
}

export interface VerifyResult {
  /** Whether the entire log chain is valid */
  valid: boolean;
  /** Total number of entries checked */
  entries: number;
  /** Index of the first broken link (0-based), if any */
  firstBroken?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR || '.veritas-kanban';
const AUDIT_SUBDIR = 'audit';

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/** Hash of the last written entry (in-memory cache to avoid re-reading). */
let lastHash = '';

/** Promise chain to serialise concurrent writes. */
let writeQueue: Promise<void> = Promise.resolve();

/** Cached current log file path (invalidated on month change). */
let currentMonth = '';
let currentLogPath = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hash of a string, returned as hex. */
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Build the log file path for a given date. */
function logFilePath(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const month = `${yyyy}-${mm}`;

  // Cache to avoid path.join on every write
  if (month !== currentMonth) {
    currentMonth = month;
    currentLogPath = path.join(DATA_DIR, AUDIT_SUBDIR, `audit-${month}.log`);
  }
  return currentLogPath;
}

/** Ensure the audit directory exists. */
async function ensureAuditDir(): Promise<void> {
  const dir = path.join(DATA_DIR, AUDIT_SUBDIR);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Read the last line of the current log file to seed `lastHash`.
 * Called once on first write (or after month rotation).
 */
async function seedLastHash(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trimEnd().split('\n').filter(Boolean);
    if (lines.length > 0) {
      lastHash = sha256(lines[lines.length - 1]);
    } else {
      lastHash = '';
    }
  } catch (err: unknown) {
    // File doesn't exist yet — first entry
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      lastHash = '';
    } else {
      throw err;
    }
  }
}

/** Track whether we've seeded for the current file. */
let seededForPath = '';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Append an audit entry to the current month's log file.
 *
 * Writes are serialised via a promise chain to prevent interleaving.
 * The `integrity` field contains the SHA-256 hash of the previous entry's
 * JSON line, forming an append-only hash chain.
 */
export function auditLog(event: AuditEvent): Promise<void> {
  // Chain writes so concurrent calls don't interleave
  writeQueue = writeQueue
    .then(() => writeEntry(event))
    .catch((err) => {
      log.error({ err, event }, 'Failed to write audit log entry');
    });
  return writeQueue;
}

async function writeEntry(event: AuditEvent): Promise<void> {
  await ensureAuditDir();

  const filePath = logFilePath();

  // Seed lastHash from disk on first write or month rotation
  if (seededForPath !== filePath) {
    await seedLastHash(filePath);
    seededForPath = filePath;
  }

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action: event.action,
    actor: event.actor,
    resource: event.resource,
    details: event.details,
    integrity: lastHash,
  };

  const line = JSON.stringify(entry);
  await fs.appendFile(filePath, line + '\n', 'utf8');

  // Update the running hash
  lastHash = sha256(line);
}

/**
 * Verify the hash chain integrity of an audit log file.
 *
 * Reads every line, re-computes the expected integrity hash, and compares.
 * Returns a result indicating whether the chain is intact.
 */
export async function verifyAuditLog(filePath: string): Promise<VerifyResult> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: true, entries: 0 };
    }
    throw err;
  }

  const lines = content.trimEnd().split('\n').filter(Boolean);
  if (lines.length === 0) {
    return { valid: true, entries: 0 };
  }

  let prevHash = '';

  for (let i = 0; i < lines.length; i++) {
    let entry: AuditEntry;
    try {
      entry = JSON.parse(lines[i]) as AuditEntry;
    } catch {
      return { valid: false, entries: lines.length, firstBroken: i };
    }

    if (entry.integrity !== prevHash) {
      return { valid: false, entries: lines.length, firstBroken: i };
    }

    prevHash = sha256(lines[i]);
  }

  return { valid: true, entries: lines.length };
}

/**
 * Read recent audit entries from the current log file.
 * Returns entries in reverse chronological order (newest first).
 */
export async function readRecentAuditEntries(limit = 100): Promise<AuditEntry[]> {
  const filePath = logFilePath();
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const lines = content.trimEnd().split('\n').filter(Boolean);
  // Take the last `limit` entries and reverse for newest-first
  const slice = lines.slice(-limit).reverse();
  return slice.map((line) => JSON.parse(line) as AuditEntry);
}

/**
 * Get the path to the current month's audit log file.
 * Useful for the verify endpoint.
 */
export function getCurrentAuditLogPath(): string {
  return logFilePath();
}

/**
 * Reset internal state. **Only for testing.**
 */
export function _resetAuditState(): void {
  lastHash = '';
  currentMonth = '';
  currentLogPath = '';
  seededForPath = '';
  writeQueue = Promise.resolve();
}
