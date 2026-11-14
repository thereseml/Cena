import type {
  FoodRecognitionResult,
  InventoryItem,
  SaveInventoryItemInput,
  SaveInventoryItemsInput,
} from '@cena/contracts';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { apiRequest } from '../../lib/api';

interface LocalPhoto {
  uri: string;
}

export async function analyzeFoodPhoto(
  photo: LocalPhoto,
  signal: AbortSignal,
): Promise<FoodRecognitionResult> {
  const form = new FormData();
  form.append('image', new File(photo.uri));
  return apiRequest<FoodRecognitionResult>(
    'food-recognition/analyze',
    {
      method: 'POST',
      body: form,
      signal,
    },
    expoFetch,
  );
}

export async function saveRecognizedFood(
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
