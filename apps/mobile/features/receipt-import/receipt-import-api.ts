import type {
  InventoryItem,
  SaveInventoryItemInput,
  SaveInventoryItemsInput,
} from '@cena/contracts';
import { apiRequest } from '../../lib/api';

export function importReceiptItems(
  householdId: string,
  items: SaveInventoryItemInput[],
  requestKey: string,
): Promise<InventoryItem[]> {
  const payload: SaveInventoryItemsInput = { items };
  return apiRequest<InventoryItem[]>(`households/${householdId}/inventory/bulk`, {
    method: 'POST',
    headers: { 'Idempotency-Key': requestKey },
    body: JSON.stringify(payload),
  });
}
