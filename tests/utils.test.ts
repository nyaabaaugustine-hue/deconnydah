import { describe, it, expect } from 'vitest';

function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

describe('daysUntilExpiry', () => {
  it('returns null for null input', () => {
    expect(daysUntilExpiry(null)).toBeNull();
  });

  it('returns positive number for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const result = daysUntilExpiry(future.toISOString());
    expect(result).toBeGreaterThanOrEqual(29);
    expect(result).toBeLessThanOrEqual(31);
  });

  it('returns negative number for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const result = daysUntilExpiry(past.toISOString());
    expect(result).toBeLessThan(0);
  });

  it('returns 0 or 1 for today', () => {
    const today = new Date();
    const result = daysUntilExpiry(today.toISOString());
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
