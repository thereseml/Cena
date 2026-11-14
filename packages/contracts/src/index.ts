export interface HouseholdSummary {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
}

export interface CurrentUser {
  id: string;
  email: string;
  households: HouseholdSummary[];
}

export const INVENTORY_UNITS = ['st', 'g', 'kg', 'ml', 'l'] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const STORAGE_LOCATIONS = ['FRIDGE', 'FREEZER', 'PANTRY'] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const EXPIRY_TYPES = ['BEST_BEFORE', 'USE_BY'] as const;
export type ExpiryType = (typeof EXPIRY_TYPES)[number];

export const EXPIRY_SOURCES = ['USER_ENTERED', 'ESTIMATED'] as const;
export type ExpirySource = (typeof EXPIRY_SOURCES)[number];

export interface InventoryBatch {
  id: string;
  quantity: number;
  expiryDate: string | null;
  expiryType: ExpiryType | null;
  expirySource: ExpirySource | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  storageLocation: StorageLocation;
  batches: InventoryBatch[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SaveInventoryItemInput {
  name: string;
  quantity: number;
  unit: InventoryUnit;
  storageLocation: StorageLocation;
  expiryDate: string | null;
  expiryType: ExpiryType | null;
  expirySource: ExpirySource | null;
}

export interface SaveInventoryItemsInput {
  items: SaveInventoryItemInput[];
}

export type FoodRecognitionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FoodSuggestion {
  id: string;
  name: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  description: string | null;
  confidence: FoodRecognitionConfidence;
  needsReview: true;
}

export interface FoodRecognitionResult {
  items: FoodSuggestion[];
}

export interface UpdateInventoryItemInput extends SaveInventoryItemInput {
  expectedVersion: number;
}
