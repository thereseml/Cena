export const MEAL_CATEGORIES = ['DINNER', 'LUNCH', 'BREAKFAST', 'SNACK'] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];
export const RECIPE_UNITS = ['st', 'g', 'kg', 'ml', 'l', 'dl', 'msk', 'tsk'] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];
export type IngredientAvailability = 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
export type AvailabilityReason =
  'SUFFICIENT' | 'INSUFFICIENT' | 'NOT_FOUND' | 'INCOMPATIBLE_UNIT' | 'EXPIRED' | 'UNQUANTIFIED';

export interface RecipeIngredient {
  id: string;
  displayName: string;
  quantity: number | null;
  unit: RecipeUnit;
  preparationNotes: string | null;
  sortOrder: number;
  availability: IngredientAvailability | null;
  reason: AvailabilityReason | null;
  availableQuantity: number | null;
  missingQuantity: number | null;
}

export interface RecipeAvailabilitySummary {
  available: number;
  partial: number;
  missing: number;
  unknown: number;
  total: number;
}

export interface RecipeSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  mealCategory: MealCategory;
  preparationMinutes: number;
  cookingMinutes: number;
  totalMinutes: number;
  servings: number;
  tags: string[];
  availability: RecipeAvailabilitySummary | null;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface RecipePage {
  items: RecipeSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RecipeFilters {
  householdId?: string;
  search?: string;
  mealCategory?: MealCategory;
  maxTotalMinutes?: number;
  page?: number;
  pageSize?: number;
}

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

export interface UpdateInventoryItemInput extends SaveInventoryItemInput {
  expectedVersion: number;
}
