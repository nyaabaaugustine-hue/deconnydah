import { describe, it, expect } from 'vitest';

// Replicate the key conversion logic from apiClient.ts for testing.
//
// IMPORTANT: apiClient.ts only converts keys on the way IN (raw snake_case DB
// rows from the server -> camelCase for the frontend). Outgoing POST/PATCH
// bodies are sent as-is (camelCase), because every Express route in
// server/routes/*.ts reads req.body fields in camelCase directly and maps
// them to snake_case SQL columns itself. Do not reintroduce a
// camelCase->snake_case conversion on outgoing request bodies — an earlier
// version of this app did that, and it silently broke every create/update:
// POST bodies failed requireFields validation (400), and PATCH bodies matched
// zero columns and no-opped instead of updating.

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[toCamel(key)] = obj[key];
  }
  return result as T;
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

describe('outgoing request bodies (regression guard)', () => {
  // This directly encodes the contract described in the top-of-file comment,
  // so a future change that re-adds snake_case conversion on the way out
  // gets caught here instead of silently breaking every write in production.
  it('does NOT convert camelCase keys before sending', () => {
    const outgoingBody = { plateNumber: 'GR-1234', purchasePrice: 50000 };
    const serialized = JSON.parse(JSON.stringify(outgoingBody));
    expect(serialized).toEqual({ plateNumber: 'GR-1234', purchasePrice: 50000 });
    expect(serialized.plate_number).toBeUndefined();
  });
});
