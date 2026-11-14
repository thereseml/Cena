import {
  type ExpiryType,
  type FoodSuggestion,
  type InventoryUnit,
  type SaveInventoryItemInput,
  type StorageLocation,
} from '@cena/contracts';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { InventoryItemFormInitialValues } from '../inventory/InventoryItemForm';

export const MAX_REVIEW_ITEMS = 30;
const MAX_OPTIMIZED_PHOTO_BYTES = 1_800_000;

export interface ReviewDraft {
  id: string;
  source: 'AI' | 'MANUAL';
  name: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  storageLocation: StorageLocation;
  expiryDate: string | null;
  expiryType: ExpiryType | null;
  description: string | null;
  confidence: FoodSuggestion['confidence'];
}

export async function preparePhoto(uri: string): Promise<{ uri: string }> {
  const first = await resizePhoto(uri, 1600, 0.72);
  if (estimateBytes(first.base64) <= MAX_OPTIMIZED_PHOTO_BYTES) return first;
  const second = await resizePhoto(uri, 1280, 0.55);
  if (estimateBytes(second.base64) <= MAX_OPTIMIZED_PHOTO_BYTES) return second;
  throw new Error('PHOTO_TOO_LARGE');
}

export function toReviewDraft(suggestion: FoodSuggestion): ReviewDraft {
  return {
    id: suggestion.id,
    source: 'AI',
    name: suggestion.name,
    quantity: suggestion.quantity,
    unit: suggestion.unit,
    storageLocation: 'FRIDGE',
    expiryDate: null,
    expiryType: null,
    description: suggestion.description,
    confidence: suggestion.confidence,
  };
}

export function createManualDraft(): ReviewDraft {
  return {
    id: createId(),
    source: 'MANUAL',
    name: '',
    quantity: null,
    unit: null,
    storageLocation: 'FRIDGE',
    expiryDate: null,
    expiryType: null,
    description: null,
    confidence: 'LOW',
  };
}

export function toFormValues(item: ReviewDraft): InventoryItemFormInitialValues {
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    expiryDate: item.expiryDate,
    expiryType: item.expiryType,
    expirySource: item.expiryDate ? 'USER_ENTERED' : null,
  };
}

export function isReadyToSave(item: ReviewDraft): boolean {
  if (
    !item.name.trim() ||
    item.name.trim().length > 100 ||
    item.quantity === null ||
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0 ||
    decimalPlaces(item.quantity) > 3 ||
    !item.unit
  ) {
    return false;
  }
  return Boolean(item.expiryDate) === Boolean(item.expiryType);
}

export function toSaveInput(item: ReviewDraft): SaveInventoryItemInput {
  if (item.quantity === null || !item.unit) throw new Error('Varan saknar mängd eller enhet.');
  return {
    name: item.name.trim(),
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    expiryDate: item.expiryDate,
    expiryType: item.expiryType,
    expirySource: item.expiryDate ? 'USER_ENTERED' : null,
  };
}

export function createIdempotencyKey(): string {
  return `photo-save:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

function createId(): string {
  return `photo:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

async function resizePhoto(uri: string, maxWidth: number, compress: number) {
  const image = await ImageManipulator.manipulate(uri, {
    maxWidth,
    maxHeight: maxWidth,
  }).renderAsync();
  return image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
}

function estimateBytes(base64: string | undefined): number {
  return base64 ? Math.ceil((base64.length * 3) / 4) : Number.POSITIVE_INFINITY;
}

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  return (coefficient.split('.')[1]?.length ?? 0) - Number(exponentText ?? 0);
}
