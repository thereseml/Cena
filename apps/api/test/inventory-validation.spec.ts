import { BadRequestException } from '@nestjs/common';
import {
  parseIdempotencyKey,
  parseInventoryInput,
  parseInventoryInputs,
} from '../src/inventory/inventory-validation';

const validInput = {
  name: ' Mjölk ',
  quantity: 1.5,
  unit: 'l',
  storageLocation: 'FRIDGE',
  expiryDate: '2026-11-20',
  expiryType: 'BEST_BEFORE',
  expirySource: 'USER_ENTERED',
};

describe('parseInventoryInput', () => {
  it('normalizes a valid item and accepts missing expiry metadata', () => {
    expect(
      parseInventoryInput({
        ...validInput,
        expiryDate: null,
        expiryType: null,
        expirySource: null,
      }),
    ).toEqual({
      ...validInput,
      name: 'Mjölk',
      expiryDate: null,
      expiryType: null,
      expirySource: null,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.0001, 1e-7])(
    'rejects invalid quantity %s',
    (quantity) => {
      expect(() => parseInventoryInput({ ...validInput, quantity })).toThrow(BadRequestException);
    },
  );

  it.each(['', '   '])('rejects an empty name (%s)', (name) => {
    expect(() => parseInventoryInput({ ...validInput, name })).toThrow(BadRequestException);
  });

  it('rejects unsupported units and storage locations', () => {
    expect(() => parseInventoryInput({ ...validInput, unit: 'cup' })).toThrow(BadRequestException);
    expect(() => parseInventoryInput({ ...validInput, storageLocation: 'COUNTER' })).toThrow(
      BadRequestException,
    );
  });

  it.each(['2026-02-29', '2026-13-01', '2026-01-02T00:00:00Z', '26-01-02'])(
    'rejects invalid calendar date %s',
    (expiryDate) => {
      expect(() => parseInventoryInput({ ...validInput, expiryDate })).toThrow(BadRequestException);
    },
  );

  it('requires complete expiry metadata whenever a date is supplied', () => {
    expect(() => parseInventoryInput({ ...validInput, expiryType: null })).toThrow(
      BadRequestException,
    );
    expect(() => parseInventoryInput({ ...validInput, expirySource: null })).toThrow(
      BadRequestException,
    );
  });

  it('does not allow manual inventory routes to claim estimated date provenance', () => {
    expect(() => parseInventoryInput({ ...validInput, expirySource: 'ESTIMATED' })).toThrow(
      BadRequestException,
    );
    expect(
      parseInventoryInput({ ...validInput, expirySource: 'ESTIMATED' }, { allowEstimated: true })
        .expirySource,
    ).toBe('ESTIMATED');
  });

  it('validates idempotency keys for manual item creation', () => {
    expect(parseIdempotencyKey('mobile:abc:random')).toBe('mobile:abc:random');
    expect(() => parseIdempotencyKey(undefined)).toThrow(BadRequestException);
    expect(() => parseIdempotencyKey('short')).toThrow(BadRequestException);
  });
});

describe('parseInventoryInputs', () => {
  it('validates all entries before a bulk inventory write', () => {
    const items = parseInventoryInputs({
      items: [
        { ...validInput, expiryDate: null, expiryType: null, expirySource: null },
        {
          ...validInput,
          name: 'Ägg',
          quantity: 6,
          unit: 'st',
          expiryDate: null,
          expiryType: null,
          expirySource: null,
        },
      ],
    });
    expect(items.map((item) => item.name)).toEqual(['Mjölk', 'Ägg']);
  });

  it('rejects empty, oversized, or partially invalid batches', () => {
    expect(() => parseInventoryInputs({ items: [] })).toThrow(BadRequestException);
    expect(() => parseInventoryInputs({ items: Array(31).fill(validInput) })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseInventoryInputs({ items: [validInput, { ...validInput, quantity: 0 }] }),
    ).toThrow(BadRequestException);
  });
});
