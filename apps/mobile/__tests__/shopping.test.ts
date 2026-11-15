import type { RecipeIngredient } from '@cena/contracts';
import {
  canSuggestMissingAmount,
  suggestedShoppingQuantity,
} from '../features/shopping/recipe-shopping';
import { parseShoppingList } from '../features/shopping/shopping-api';
import { shoppingMutationMessage } from '../features/shopping/useShoppingList';
import { ApiRequestError } from '../lib/api';

const ingredient: RecipeIngredient = {
  id: 'recipe-row',
  displayName: 'Pasta',
  quantity: 500,
  unit: 'g',
  preparationNotes: null,
  sortOrder: 0,
  availability: 'PARTIAL',
  reason: 'INSUFFICIENT',
  availableQuantity: 200,
  missingQuantity: 300,
};

describe('shopping feature', () => {
  it('suggests only the confirmed partial remainder', () => {
    expect(suggestedShoppingQuantity(ingredient)).toEqual({ quantity: 300, unit: 'g' });
    expect(canSuggestMissingAmount(ingredient)).toBe(true);
  });

  it('does not invent a quantity for unknown or unquantified availability', () => {
    const unknown = { ...ingredient, availability: 'UNKNOWN' as const, missingQuantity: null };
    expect(suggestedShoppingQuantity(unknown)).toBeNull();
    expect(canSuggestMissingAmount(unknown)).toBe(false);
  });

  it('converts recipe measures only within a known volume dimension', () => {
    expect(suggestedShoppingQuantity({ ...ingredient, unit: 'dl', missingQuantity: 1.5 })).toEqual({
      quantity: 150,
      unit: 'ml',
    });
    expect(suggestedShoppingQuantity({ ...ingredient, unit: 'msk', missingQuantity: 2 })).toEqual({
      quantity: 30,
      unit: 'ml',
    });
  });

  it('validates persisted shopping list response shape', () => {
    expect(parseShoppingList({ items: [] })).toEqual({ items: [] });
    expect(() => parseShoppingList({ items: [{ id: 5 }] })).toThrow('oväntat format');
  });

  it('preserves the server duplicate warning and uses shopping-specific service errors', () => {
    expect(shoppingMutationMessage(new ApiRequestError('http', 409, 'Mjölk finns redan på listan.')))
      .toBe('Mjölk finns redan på listan.');
    expect(shoppingMutationMessage(new ApiRequestError('http', 503))).toBe(
      'Inköpslistan är tillfälligt otillgänglig. Försök igen senare.',
    );
  });
});
