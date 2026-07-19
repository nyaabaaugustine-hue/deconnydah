import { describe, it, expect } from 'vitest';

// Replicate the key conversion logic from apiClient.ts for testing
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertKeys<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toCamel(key)] = obj[key];
  }
  return result as T;
}

function convertKeysReverse(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toSnake(key)] = obj[key];
  }
  return result;
}

describe('toCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamel('plate_number')).toBe('plateNumber');
    expect(toCamel('full_name')).toBe('fullName');
    expect(toCamel('current_driver_id')).toBe('currentDriverId');
  });

  it('leaves camelCase unchanged', () => {
    expect(toCamel('plateNumber')).toBe('plateNumber');
  });

  it('handles single word', () => {
    expect(toCamel('id')).toBe('id');
    expect(toCamel('name')).toBe('name');
  });
});

describe('toSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnake('plateNumber')).toBe('plate_number');
    expect(toSnake('fullName')).toBe('full_name');
    expect(toSnake('currentDriverId')).toBe('current_driver_id');
  });

  it('leaves snake_case unchanged', () => {
    expect(toSnake('plate_number')).toBe('plate_number');
  });
});

describe('convertKeys', () => {
  it('converts all keys of an object to camelCase', () => {
    const input = { plate_number: 'GR-1234', full_name: 'Kwame' };
    const result = convertKeys<{ plateNumber: string; fullName: string }>(input);
    expect(result.plateNumber).toBe('GR-1234');
    expect(result.fullName).toBe('Kwame');
  });

  it('preserves values', () => {
    const input = { purchase_price: 50000 };
    const result = convertKeys<{ purchasePrice: number }>(input);
    expect(result.purchasePrice).toBe(50000);
  });
});

describe('convertKeysReverse', () => {
  it('converts all keys of an object to snake_case', () => {
    const input = { plateNumber: 'GR-1234', fullName: 'Kwame' };
    const result = convertKeysReverse(input);
    expect(result.plate_number).toBe('GR-1234');
    expect(result.full_name).toBe('Kwame');
  });
});
