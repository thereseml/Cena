import {
  receiptErrorMessage,
  reviewItemError,
  toInventoryInput,
  toReviewItem,
} from '../features/receipt-import/receipt-review';
import type { ReceiptProduct } from '../features/receipt-import/receipt-parser';

const product: ReceiptProduct = {
  id: 'milk',
  name: 'Mjölk',
  originalText: 'MJÖLK',
  quantity: 2,
  unit: 'l',
  price: null,
  classification: 'FOOD',
  storageLocation: 'FRIDGE',
};

it('selects food only and labels missing quantity and unit as proposals', () => {
  expect(toReviewItem(product)).toMatchObject({
    selected: true,
    quantity: '2',
    unit: 'l',
    suggestedQuantity: false,
    suggestedUnit: false,
  });
  expect(
    toReviewItem({ ...product, quantity: null, unit: null, storageLocation: null }),
  ).toMatchObject({
    quantity: '1',
    unit: 'st',
    storageLocation: null,
    suggestedQuantity: true,
    suggestedUnit: true,
  });
  expect(toReviewItem({ ...product, classification: 'UNKNOWN' }).selected).toBe(false);
  expect(toReviewItem({ ...product, classification: 'NON_FOOD' }).selected).toBe(false);
});

it.each(['', '0', '-1', '1.1234', '1e3', 'Infinity', '1000000000', '1,2,3', '12kg'])(
  'rejects invalid quantity %s',
  (quantity) => {
    expect(reviewItemError({ ...toReviewItem(product), quantity })).toMatch(/mängd/);
  },
);

it('validates name, unit and explicitly nullable storage', () => {
  const item = toReviewItem(product);
  expect(reviewItemError({ ...item, name: '  ' })).toMatch(/namn/);
  expect(reviewItemError({ ...item, name: 'x'.repeat(101) })).toMatch(/namn/);
  expect(reviewItemError({ ...item, unit: null })).toBe('Välj en enhet.');
  expect(reviewItemError({ ...item, storageLocation: null })).toMatch(/förvaring/);
  expect(() => toInventoryInput({ ...item, storageLocation: null })).toThrow(
    'INVALID_RECEIPT_REVIEW',
  );
});

it('normalizes decimal comma and trims names, leaving all expiry information absent', () => {
  expect(
    toInventoryInput({ ...toReviewItem(product), name: ' Mjölk ', quantity: ' 1,125 ' }),
  ).toEqual({
    name: 'Mjölk',
    quantity: 1.125,
    unit: 'l',
    storageLocation: 'FRIDGE',
    expiryDate: null,
    expiryType: null,
    expirySource: null,
  });
  expect(reviewItemError({ ...toReviewItem(product), quantity: '999999999,999' })).toBeNull();
});

it('handles error message codes as well as code properties without leaking internal details', () => {
  expect(receiptErrorMessage(new Error('NO_TEXT'))).toMatch(/Ingen text/);
  expect(receiptErrorMessage({ message: 'native secrets' })).toMatch(/Kvittot kunde inte läsas/);
});
