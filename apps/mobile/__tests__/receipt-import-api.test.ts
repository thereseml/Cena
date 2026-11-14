import { importReceiptItems } from '../features/receipt-import/receipt-import-api';
import { apiRequest } from '../lib/api';

jest.mock('../lib/api', () => ({ apiRequest: jest.fn() }));

it('posts the confirmed rows atomically with the supplied idempotency key', async () => {
  const items = [
    {
      name: 'Mjölk',
      quantity: 1,
      unit: 'l' as const,
      storageLocation: 'FRIDGE' as const,
      expiryDate: null,
      expiryType: null,
      expirySource: null,
    },
  ];
  jest.mocked(apiRequest).mockResolvedValue([]);
  await importReceiptItems('household-id', items, 'receipt:stable-key');
  expect(apiRequest).toHaveBeenCalledWith('households/household-id/inventory/bulk', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'receipt:stable-key' },
    body: JSON.stringify({ items }),
  });
});
