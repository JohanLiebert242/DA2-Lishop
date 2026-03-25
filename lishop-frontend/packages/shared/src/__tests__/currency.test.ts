import { describe, it, expect } from 'vitest';
import { formatVND, formatUSD } from '../formatters/currency';

describe('formatVND', () => {
  it('formats 100000 as a non-empty string containing 100', () => {
    const result = formatVND(100000);
    expect(result).toContain('100');
    expect(result.length).toBeGreaterThan(0);
  });
  it('formats 0 as a non-empty string containing 0', () => {
    const result = formatVND(0);
    expect(result).toContain('0');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatUSD', () => {
  it('formats 1999 cents containing 19.99', () => {
    expect(formatUSD(1999)).toContain('19.99');
  });
});
