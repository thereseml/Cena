import type { ShoppingListItem } from '@cena/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ApiRequestError, apiErrorMessage, apiRequest } from '../../lib/api';
import { fetchShoppingList, shoppingPath } from './shopping-api';

export function useShoppingList(householdId: string | undefined) {
  const path = householdId ? shoppingPath(householdId) : null;
  const [state, setState] = useState<{
    path: string | null;
    items: ShoppingListItem[];
    loading: boolean;
    error: string | null;
  }>({ path: null, items: [], loading: true, error: null });
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const requestId = useRef(0);
  const focused = useRef(false);

  useLayoutEffect(() => {
    requestId.current += 1;
    return () => {
      requestId.current += 1;
    };
  }, [path]);

  const refresh = useCallback(async () => {
    if (!focused.current) return;
    const request = ++requestId.current;
    if (!householdId || !path) {
      setState({ path, items: [], loading: false, error: 'Ditt hushåll kunde inte hittas.' });
      return;
    }
    setState({ path, items: [], loading: true, error: null });
    try {
      const result = await fetchShoppingList(householdId);
      if (focused.current && request === requestId.current) {
        setState({ path, items: result.items, loading: false, error: null });
      }
    } catch (error) {
      if (focused.current && request === requestId.current) {
        setState({
          path,
          items: [],
          loading: false,
          error: apiErrorMessage(error, 'Inköpslistan kunde inte läsas in.'),
        });
      }
    }
  }, [householdId, path]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void refresh();
      return () => {
        focused.current = false;
        requestId.current += 1;
      };
    }, [refresh]),
  );

  const mutate = useCallback(
    async (id: string, action: () => Promise<unknown>) => {
      setBusyIds((current) => [...current, id]);
      try {
        await action();
        await refresh();
      } finally {
        setBusyIds((current) => current.filter((busyId) => busyId !== id));
      }
    },
    [refresh],
  );

  const add = useCallback(
    (name: string, quantity: number | null, unit: string | null) => {
      if (!householdId) throw new Error('Ditt hushåll kunde inte hittas.');
      return mutate('new', () =>
        apiRequest(`${shoppingPath(householdId)}/items`, {
          method: 'POST',
          body: JSON.stringify({ name, quantity, unit }),
        }),
      );
    },
    [householdId, mutate],
  );

  const update = useCallback(
    (item: ShoppingListItem, name: string, quantity: number | null, unit: string | null) => {
      if (!householdId) throw new Error('Ditt hushåll kunde inte hittas.');
      return mutate(item.id, () =>
        apiRequest(`${shoppingPath(householdId)}/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, quantity, unit, expectedVersion: item.version }),
        }),
      );
    },
    [householdId, mutate],
  );

  const toggle = useCallback(
    (item: ShoppingListItem) => {
      if (!householdId) throw new Error('Ditt hushåll kunde inte hittas.');
      return mutate(item.id, () =>
        apiRequest(`${shoppingPath(householdId)}/items/${item.id}/purchased`, {
          method: 'PATCH',
          body: JSON.stringify({ isPurchased: !item.isPurchased, expectedVersion: item.version }),
        }),
      );
    },
    [householdId, mutate],
  );

  const remove = useCallback(
    (item: ShoppingListItem) => {
      if (!householdId) throw new Error('Ditt hushåll kunde inte hittas.');
      return mutate(item.id, () =>
        apiRequest(`${shoppingPath(householdId)}/items/${item.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ expectedVersion: item.version }),
        }),
      );
    },
    [householdId, mutate],
  );

  const current = path && state.path === path ? state : { items: [], loading: true, error: null };
  return { ...current, busyIds, refresh, add, update, toggle, remove };
}

export function shoppingMutationMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409)
      return error.apiMessage ?? 'Listan har ändrats. Uppdatera och försök igen.';
    if (error.status === 429) return 'Du har gjort många förfrågningar. Vänta en stund och försök igen.';
    if (error.status === 503 || error.status === 504)
      return 'Inköpslistan är tillfälligt otillgänglig. Försök igen senare.';
  }
  return apiErrorMessage(error, 'Ändringen kunde inte sparas. Försök igen.');
}
