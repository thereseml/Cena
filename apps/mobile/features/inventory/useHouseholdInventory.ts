import type { InventoryItem } from '@cena/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { apiErrorMessage, apiRequest } from '../../lib/api';

export function useHouseholdInventory() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!householdId) {
      setError('Ditt hushåll kunde inte hittas. Försök logga in igen.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const inventory = await apiRequest<InventoryItem[]>(`households/${householdId}/inventory`);
      if (currentRequest === requestId.current) setItems(inventory);
    } catch (requestError) {
      if (currentRequest === requestId.current) {
        setError(apiErrorMessage(requestError, 'Köket kunde inte läsas in.'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  return { householdId, items, loading, error, retry: load };
}
