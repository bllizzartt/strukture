import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

/**
 * Encrypt sensitive data using AES-256
 */
export function encrypt(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt data encrypted with AES-256
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Hash sensitive data (one-way, cannot be decrypted)
 */
export function hash(text: string): string {
  if (!text) return '';
  return CryptoJS.SHA256(text).toString();
}

/**
 * Mask sensitive data for display (e.g., SSN: ***-**-1234)
 */
export function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) return '***-**-****';
  return `***-**-${ssn.slice(-4)}`;
}

/**
 * Mask bank account number for display
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
}
