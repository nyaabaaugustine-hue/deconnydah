import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Replicate the auth logic from server/auth.ts for testing
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(32).toString('hex');
  const derived = crypto.scryptSync(password, s, 64);
  return { hash: `scrypt:${s}:${derived.toString('hex')}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const { hash } = hashPassword(password, salt);
  const bufExpected = Buffer.from(expectedHash, 'hex');
  const bufActual = Buffer.from(hash.split(':')[2], 'hex');
  return bufExpected.length === bufActual.length && crypto.timingSafeEqual(bufExpected, bufActual);
}

function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

describe('hashPassword', () => {
  it('returns a scrypt hash with salt', () => {
    const { hash, salt } = hashPassword('mypassword');
    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
    expect(salt).toMatch(/^[a-f0-9]+$/);
    expect(salt.length).toBe(64);
  });

  it('generates different hashes for different passwords', () => {
    const h1 = hashPassword('password1');
    const h2 = hashPassword('password2');
    expect(h1.hash).not.toBe(h2.hash);
  });

  it('generates different salts each time', () => {
    const h1 = hashPassword('password');
    const h2 = hashPassword('password');
    expect(h1.salt).not.toBe(h2.salt);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', () => {
    const { hash } = hashPassword('secret123');
    expect(verifyPassword('secret123', hash)).toBe(true);
  });

  it('returns false for wrong password', () => {
    const { hash } = hashPassword('secret123');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('returns false for malformed hash', () => {
    expect(verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
  });
});

describe('generateToken', () => {
  it('returns a hex string of 96 chars (48 bytes)', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]{96}$/);
  });

  it('generates unique tokens', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});
