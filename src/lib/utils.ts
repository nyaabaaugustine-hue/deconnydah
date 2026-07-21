import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Ghanaian Cedi currency with proper thousand separators
 * and two decimal places, e.g. formatGHS(338958.5) => "GH\u20B5 338,958.50".
 * Always coerces to Number first so a stray string (e.g. an un-coerced Postgres
 * NUMERIC value) can never silently produce a garbled/concatenated string.
 */
export function formatGHS(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 'GH\u20B5 0.00';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `GH\u20B5 ${formatted}`;
}
