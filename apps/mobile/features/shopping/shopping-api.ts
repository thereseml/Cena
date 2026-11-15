import type { InventoryUnit, ShoppingList, ShoppingListItem } from '@cena/contracts';
import { apiRequest } from '../../lib/api';

export function shoppingPath(householdId: string): string {
  return `households/${encodeURIComponent(householdId)}/shopping-list`;
}

export function parseShoppingList(value: unknown): ShoppingList {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { items?: unknown }).items)) {
    throw new Error('Inköpslistan har ett oväntat format.');
  }
  return { items: (value as { items: unknown[] }).items.map(parseShoppingItem) };
}

export function parseShoppingItem(value: unknown): ShoppingListItem {
  if (!value || typeof value !== 'object') throw new Error('En vara har ett oväntat format.');
  const item = value as Record<string, unknown>;
  const units: InventoryUnit[] = ['st', 'g', 'kg', 'ml', 'l'];
  if (
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    (item.quantity !== null && typeof item.quantity !== 'number') ||
    (item.unit !== null && !units.includes(item.unit as InventoryUnit)) ||
    typeof item.isPurchased !== 'boolean' ||
    typeof item.version !== 'number' ||
    typeof item.createdAt !== 'string' ||
    typeof item.updatedAt !== 'string'
  ) {
    throw new Error('En vara har ett oväntat format.');
  }
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit as InventoryUnit | null,
    isPurchased: item.isPurchased,
    recipeId: typeof item.recipeId === 'string' ? item.recipeId : null,
    recipeTitle: typeof item.recipeTitle === 'string' ? item.recipeTitle : null,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchShoppingList(householdId: string): Promise<ShoppingList> {
  return parseShoppingList(await apiRequest<unknown>(shoppingPath(householdId)));
}
