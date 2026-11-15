import type { RecipeFilters } from '@cena/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ApiRequestError, apiErrorMessage, apiRequest } from '../../lib/api';
import { parseRecipeDetail, parseRecipePage } from './recipe-validation';

// Key results as well as requests so a changed household/filter never renders old data.
function useRecipeRequest<T>(path: string | null, parse: (value: unknown) => T, enabled = true) {
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ path: null, data: null, loading: true, error: null });
  const requestId = useRef(0);
  const focused = useRef(false);

  useLayoutEffect(() => {
    requestId.current += 1;
    return () => {
      requestId.current += 1;
    };
  }, [path, enabled]);

  const load = useCallback(async () => {
    if (!focused.current || !enabled) return;
    const currentRequest = ++requestId.current;
    if (!path) {
      setState({
        path,
        data: null,
        loading: false,
        error: 'Ditt hushåll eller recept kunde inte hittas.',
      });
      return;
    }
    setState({ path, data: null, loading: true, error: null });
    try {
      const response = await apiRequest<unknown>(path);
      if (focused.current && currentRequest === requestId.current) {
        const data = parse(response);
        setState({ path, data, loading: false, error: null });
      }
    } catch (error) {
      if (focused.current && currentRequest === requestId.current) {
        let message = 'Recept kunde inte läsas in. Försök igen.';
        if (error instanceof ApiRequestError && error.status === 404) {
          message = 'Receptet eller hushållet kunde inte hittas.';
        } else if (error instanceof ApiRequestError && error.status === 429) {
          message = 'Du har gjort många förfrågningar. Vänta en stund och försök igen.';
        } else if (
          error instanceof ApiRequestError &&
          (error.status === 503 || error.status === 504)
        ) {
          message = 'Recept är tillfälligt otillgängliga. Försök igen senare.';
        } else {
          message = apiErrorMessage(error, message);
        }
        setState({ path, data: null, loading: false, error: message });
      }
    }
  }, [path, parse, enabled]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void load();
      return () => {
        focused.current = false;
        requestId.current += 1;
      };
    }, [load]),
  );

  const current =
    enabled && state.path === path ? state : { data: null, loading: true, error: null };
  return { data: current.data, loading: current.loading, error: current.error, retry: load };
}

export function useRecipes(filters: RecipeFilters, recommendations: boolean, enabled = true) {
  const query = new URLSearchParams();
  if (filters.householdId) query.set('householdId', filters.householdId);
  if (filters.search?.trim()) query.set('search', filters.search.trim());
  if (filters.mealCategory) query.set('mealCategory', filters.mealCategory);
  if (filters.maxTotalMinutes) query.set('maxTotalMinutes', String(filters.maxTotalMinutes));
  query.set('page', String(filters.page ?? 1));
  query.set('pageSize', String(filters.pageSize ?? 12));
  return useRecipeRequest(
    filters.householdId
      ? `recipes${recommendations ? '/recommendations' : ''}?${query.toString()}`
      : null,
    parseRecipePage,
    enabled,
  );
}

export function useRecipeDetail(householdId: string | undefined, id: string | undefined) {
  return useRecipeRequest(
    householdId && id
      ? `recipes/${encodeURIComponent(id)}?householdId=${encodeURIComponent(householdId)}`
      : null,
    parseRecipeDetail,
  );
}
