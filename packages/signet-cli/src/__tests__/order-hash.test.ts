import { describe, it, expect } from 'vitest';
import { hashOrder, validateOrder, type SignetOrder } from '../utils/eip712.js';

describe('Order Hashing', () => {
  const sampleOrder: SignetOrder = {
    chainId: 1,
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '1000000000000000000',
    token: '0x0000000000000000000000000000000000000000',
    nonce: '12345',
    deadline: 1700000000,
  };

  it('should produce deterministic hash', () => {
    const hash1 = hashOrder(sampleOrder);
    const hash2 = hashOrder(sampleOrder);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should produce different hash for different orders', () => {
    const hash1 = hashOrder(sampleOrder);

    const modifiedOrder = { ...sampleOrder, amount: '2000000000000000000' };
    const hash2 = hashOrder(modifiedOrder);

    expect(hash1).not.toBe(hash2);
  });

  it('should validate correct order structure', () => {
    expect(validateOrder(sampleOrder)).toBe(true);
  });

  it('should reject invalid order structure', () => {
    expect(validateOrder({})).toBe(false);
    expect(validateOrder(null)).toBe(false);
    expect(
      validateOrder({
        chainId: 1,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        // missing required fields
      })
    ).toBe(false);
  });

  it('should reject order with wrong field types', () => {
    const invalidOrder = {
      ...sampleOrder,
      chainId: '1', // should be number
    };
    expect(validateOrder(invalidOrder)).toBe(false);
  });
});
