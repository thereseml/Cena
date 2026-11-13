import type { InventoryItem, SaveInventoryItemInput } from '@cena/contracts';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, spacing, Text } from '@cena/ui';
import { useAuth } from '../../features/auth/AuthProvider';
import { InventoryItemForm } from '../../features/inventory/InventoryItemForm';
import { apiErrorMessage, apiRequest } from '../../lib/api';

export default function InventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadItem = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!householdId || !id || Array.isArray(id)) {
      setError('Varan kunde inte hittas.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<InventoryItem>(`households/${householdId}/inventory/${id}`);
      if (currentRequest === requestId.current) setItem(result);
    } catch (requestError) {
      if (currentRequest === requestId.current) {
        setError(apiErrorMessage(requestError, 'Varan kunde inte läsas in.'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [householdId, id]);

  useFocusEffect(
    useCallback(() => {
      void loadItem();
      return () => {
        requestId.current += 1;
      };
    }, [loadItem]),
  );

  async function save(input: SaveInventoryItemInput): Promise<void> {
    if (!householdId || !id || Array.isArray(id) || !item) {
      throw new Error('Varan kunde inte hittas.');
    }
    await apiRequest(`households/${householdId}/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, expectedVersion: item.version }),
    });
    router.replace('/(tabs)/kitchen');
  }

  async function remove(): Promise<void> {
    if (!householdId || !id || Array.isArray(id)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiRequest<void>(`households/${householdId}/inventory/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ expectedVersion: item?.version }),
      });
      router.replace('/(tabs)/kitchen');
    } catch (requestError) {
      setDeleteError(apiErrorMessage(requestError, 'Varan kunde inte tas bort. Försök igen.'));
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
        </Pressable>
        <Text variant="h1" style={styles.title}>
          Redigera vara
        </Text>
        {loading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Läser in varan"
            style={styles.feedback}
          >
            <ActivityIndicator color={colors.brand.primary} />
            <Text variant="bodySmall">Läser in varan…</Text>
          </View>
        ) : error ? (
          <View style={styles.feedback}>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <Button label="Försök igen" variant="outline" onPress={() => void loadItem()} />
          </View>
        ) : item ? (
          <>
            <InventoryItemForm initialItem={item} saveLabel="Spara ändringar" onSave={save} />
            <View style={styles.deleteSection}>
              {confirmingDelete ? (
                <View style={styles.confirmation}>
                  <Text variant="h3" accessibilityRole="header">
                    Ta bort vara?
                  </Text>
                  <Text variant="bodySmall">Varan tas bort från ditt kök.</Text>
                  {deleteError ? (
                    <Text accessibilityRole="alert" style={styles.error}>
                      {deleteError}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Button
                      label="Avbryt"
                      variant="secondary"
                      disabled={deleting}
                      onPress={() => setConfirmingDelete(false)}
                    />
                    <Button
                      label="Ta bort"
                      variant="outline"
                      loading={deleting}
                      onPress={() => void remove()}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  label="Ta bort vara"
                  variant="outline"
                  accessibilityLabel="Ta bort vara"
                  onPress={() => setConfirmingDelete(true)}
                  style={styles.deleteButton}
                />
              )}
              {!confirmingDelete ? (
                <Trash2 size={18} color={colors.semantic.error} style={styles.deleteIcon} />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  title: { color: colors.brand.primary, marginTop: spacing.md, marginBottom: spacing.xl },
  feedback: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  error: { color: colors.semantic.error, textAlign: 'center' },
  deleteSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  confirmation: { gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  deleteButton: { borderColor: colors.semantic.error, alignSelf: 'flex-start' },
  deleteIcon: {
    position: 'absolute',
    top: spacing.lg + 15,
    right: spacing.md,
    pointerEvents: 'none',
  },
});
