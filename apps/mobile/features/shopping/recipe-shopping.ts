import type { InventoryUnit, RecipeIngredient } from '@cena/contracts';

export function suggestedShoppingQuantity(
  ingredient: RecipeIngredient,
): { quantity: number; unit: InventoryUnit } | null {
  const quantity = ingredient.missingQuantity;
  if (quantity === null || quantity <= 0) return null;
  if (
    ingredient.unit === 'g' ||
    ingredient.unit === 'kg' ||
    ingredient.unit === 'ml' ||
    ingredient.unit === 'l' ||
    ingredient.unit === 'st'
  ) {
    return { quantity, unit: ingredient.unit };
  }
  if (ingredient.unit === 'dl') return { quantity: quantity * 100, unit: 'ml' };
  if (ingredient.unit === 'msk') return { quantity: quantity * 15, unit: 'ml' };
  if (ingredient.unit === 'tsk') return { quantity: quantity * 5, unit: 'ml' };
  return null;
}

export function canSuggestMissingAmount(ingredient: RecipeIngredient): boolean {
  return (
    (ingredient.availability === 'PARTIAL' || ingredient.availability === 'MISSING') &&
    suggestedShoppingQuantity(ingredient) !== null
  );
}
