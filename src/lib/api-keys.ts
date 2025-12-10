import { createHash, randomBytes } from 'crypto';

/**
 * Generate a new API key
 * Format: dmarc_ + 32 random alphanumeric chars
 * Returns both the full key and its prefix
 */
export function generateApiKey(): { fullKey: string; prefix: string } {
  // Generate 24 random bytes and convert to base62 (alphanumeric)
  const randomPart = randomBytes(24)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32);

  const fullKey = `dmarc_${randomPart}`;
  const prefix = fullKey.slice(0, 8); // "dmarc_ab" format

  return { fullKey, prefix };
}

/**
 * Hash an API key using SHA-256
 * Returns the hash as a hex string
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key against a stored hash
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const keyHash = hashApiKey(key);
  return keyHash === storedHash;
}

/**
 * Calculate expiration date based on duration
 */
export function getExpirationDate(
  duration: 'never' | '30days' | '90days' | '1year'
): Date | null {
  if (duration === 'never') {
    return null;
  }

  const now = new Date();

  switch (duration) {
    case '30days':
      return new Date(now.setDate(now.getDate() + 30));
    case '90days':
      return new Date(now.setDate(now.getDate() + 90));
    case '1year':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return null;
  }
}

/**
 * Available API scopes
 */
export const API_SCOPES = [
  { value: 'read:domains', label: 'Read domains' },
  { value: 'read:reports', label: 'Read DMARC reports' },
  { value: 'read:sources', label: 'Read email sources' },
  { value: 'write:domains', label: 'Write domains' },
] as const;

export type ApiScope = (typeof API_SCOPES)[number]['value'];
