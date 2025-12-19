/**
 * Encryption utility for sensitive data storage
 *
 * Uses AES-256-GCM for encryption with a key derived from an environment variable.
 * The encrypted data includes the IV and auth tag for proper decryption.
 *
 * Environment variable required:
 * - ENCRYPTION_KEY: A 32-byte (64 hex characters) encryption key
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment
 * Throws if not configured
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encrypting sensitive data. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64;
}

/**
 * Encrypt a string value
 * Returns a base64-encoded string containing: IV + encrypted data + auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + encrypted data + auth tag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString('base64');
}

/**
 * Decrypt a previously encrypted value
 * Expects base64-encoded string containing: IV + encrypted data + auth tag
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt a value if encryption is configured, otherwise return plain text
 * Useful for optional encryption during development
 */
export function encryptIfConfigured(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  if (!isEncryptionConfigured()) {
    console.warn(
      '[Encryption] ENCRYPTION_KEY not configured - storing sensitive data unencrypted. ' +
      'This is insecure for production use.'
    );
    return plaintext;
  }

  return encrypt(plaintext);
}

/**
 * Decrypt a value, handling both encrypted and unencrypted data
 * Returns the decrypted value or the original if decryption fails
 */
export function decryptIfEncrypted(value: string | null | undefined): string | null {
  if (!value) return null;

  if (!isEncryptionConfigured()) {
    // No encryption configured, assume plain text
    return value;
  }

  try {
    // Try to decrypt
    return decrypt(value);
  } catch {
    // If decryption fails, it might be unencrypted legacy data
    // Check if it looks like base64 (encrypted data would be base64)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(value)) {
      // Doesn't look like encrypted data, return as-is
      return value;
    }

    // It looks like base64 but failed to decrypt - might be corrupted
    console.warn('[Encryption] Failed to decrypt value - may be corrupted or have wrong key');
    throw new Error('Failed to decrypt value');
  }
}
