import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Security config file location
const DATA_DIR = process.env.VERITAS_DATA_DIR || path.join(process.cwd(), '.veritas-kanban');
const SECURITY_CONFIG_PATH = path.join(DATA_DIR, 'security.json');

/** A versioned JWT secret with optional expiry for rotation grace periods */
export interface JwtSecretEntry {
  /** The secret value */
  secret: string;
  /** Monotonically increasing version number */
  version: number;
  /** ISO 8601 timestamp when this secret was created */
  createdAt: string;
  /** ISO 8601 timestamp after which this secret is no longer valid for verification */
  expiresAt?: string;
}

export interface SecurityConfig {
  /** bcrypt hash of user password */
  passwordHash?: string;
  /** SHA-256 hash of recovery key */
  recoveryKeyHash?: string;
  /** JWT signing secret (legacy single-secret field) */
  jwtSecret?: string;
  /** Current JWT secret version number */
  jwtSecretVersion?: number;
  /** Array of JWT secrets for rotation (current + previous with grace periods) */
  jwtSecrets?: JwtSecretEntry[];
  /** Whether auth is enabled (default: true after setup) */
  authEnabled?: boolean;
  /** Session timeout (e.g., "24h", "7d") */
  sessionTimeout?: string;
  /** Default "remember me" setting */
  defaultRememberMe?: boolean;
  /** When setup was completed */
  setupCompletedAt?: string;
  /** When password was last changed */
  lastPasswordChange?: string;
}

// In-memory cache
let cachedConfig: SecurityConfig | null = null;
let lastLoadTime = 0;
const CACHE_TTL_MS = 1000; // Reload every second in dev

// In-memory JWT secret (generated at runtime if not in env or config)
let runtimeJwtSecret: string | null = null;

/**
 * Load security config from disk
 */
export function getSecurityConfig(): SecurityConfig {
  const now = Date.now();
  
  // Use cache in production, refresh in dev
  if (cachedConfig && (process.env.NODE_ENV === 'production' || now - lastLoadTime < CACHE_TTL_MS)) {
    return cachedConfig;
  }
  
  try {
    if (fs.existsSync(SECURITY_CONFIG_PATH)) {
      const data = fs.readFileSync(SECURITY_CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(data);
      lastLoadTime = now;
      return cachedConfig!;
    }
  } catch (err) {
    console.error('Error loading security config:', err);
  }
  
  // Default config
  cachedConfig = {
    authEnabled: false, // Disabled until setup
  };
  lastLoadTime = now;
  return cachedConfig;
}

/**
 * Get JWT signing secret.
 * Priority: VERITAS_JWT_SECRET env var > security.json > runtime-generated
 * 
 * If using env var, the secret is never written to disk.
 * If falling back to generated, it's stored in memory only (sessions
 * invalidate on restart unless env var or config file provides persistence).
 */
export function getJwtSecret(): string {
  // 1. Environment variable (preferred — never touches disk)
  const envSecret = process.env.VERITAS_JWT_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // 2. security.json (legacy / fallback for existing installs)
  const config = getSecurityConfig();
  if (config.jwtSecret) {
    return config.jwtSecret;
  }

  // 3. Runtime-generated (ephemeral — sessions won't survive restart)
  if (!runtimeJwtSecret) {
    runtimeJwtSecret = crypto.randomBytes(64).toString('hex');
    console.warn(
      'JWT secret generated at runtime. Set VERITAS_JWT_SECRET env var for persistence across restarts.'
    );
  }
  return runtimeJwtSecret;
}

/**
 * Save security config to disk
 */
export function saveSecurityConfig(config: SecurityConfig): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Write atomically (write to temp, then rename)
    const tempPath = SECURITY_CONFIG_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tempPath, SECURITY_CONFIG_PATH);
    
    // Update cache
    cachedConfig = config;
    lastLoadTime = Date.now();
    
    console.log('Security config saved');
  } catch (err) {
    console.error('Error saving security config:', err);
    throw err;
  }
}

/**
 * Generate a random recovery key
 * Format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric chars)
 */
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit confusing chars (0/O, 1/I/L)
  let key = '';
  const bytes = crypto.randomBytes(16);
  
  for (let i = 0; i < 16; i++) {
    key += chars[bytes[i] % chars.length];
    if (i === 3 || i === 7 || i === 11) {
      key += '-';
    }
  }
  
  return key;
}

/**
 * Hash a recovery key (SHA-256)
 * We use SHA-256 instead of bcrypt for recovery keys because:
 * 1. Recovery keys are high-entropy (not user-chosen)
 * 2. We need constant-time comparison
 * 3. Faster verification for one-time use keys
 */
export function hashRecoveryKey(key: string): string {
  // Normalize: remove dashes, uppercase
  const normalized = key.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Clear all security settings (for CLI reset)
 */
export function resetSecurityConfig(): void {
  const newConfig: SecurityConfig = {
    authEnabled: false,
  };
  saveSecurityConfig(newConfig);
  runtimeJwtSecret = null;
  console.log('Security config reset. Next load will show setup screen.');
}

/**
 * Check if password is configured
 */
export function isPasswordConfigured(): boolean {
  const config = getSecurityConfig();
  return !!config.passwordHash;
}
