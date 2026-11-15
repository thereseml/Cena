import type { InventoryUnit, RecipeIngredient } from '@cena/contracts';
import { useLocalSearchParams, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, colors, FilterChip, IconButton, Input, spacing, Text } from '@cena/ui';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../features/auth/AuthProvider';
import { useRecipeDetail } from '../../features/recipes/useRecipes';
import { apiRequest } from '../../lib/api';
import { shoppingMutationMessage } from '../../features/shopping/useShoppingList';
import { shoppingPath } from '../../features/shopping/shopping-api';
import {
  canSuggestMissingAmount,
  suggestedShoppingQuantity,
} from '../../features/shopping/recipe-shopping';

type Draft = { selected: boolean; name: string; quantity: string; unit: InventoryUnit | null };
const UNITS: InventoryUnit[] = ['st', 'g', 'kg', 'ml', 'l'];

export default function RecipeShoppingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const result = useRecipeDetail(householdId, typeof id === 'string' ? id : undefined);
  const ingredients = result.data?.ingredients ?? [];
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  const candidates = ingredients.filter((item) => item.availability !== 'AVAILABLE');

  function draftFor(item: RecipeIngredient): Draft {
    const current = drafts[item.id];
    if (current) return current;
    const convertible = suggestedShoppingQuantity(item);
    const suggested = canSuggestMissingAmount(item);
    return {
      selected: suggested,
      name: item.displayName,
      quantity: suggested && convertible ? String(convertible.quantity).replace('.', ',') : '',
      unit: convertible?.unit ?? null,
    };
  }

  function change(id: string, update: Partial<Draft>) {
    const item = ingredients.find((ingredient) => ingredient.id === id);
    if (!item) return;
    setDrafts((current) => ({ ...current, [id]: { ...draftFor(item), ...update } }));
  }

  async function submit() {
    if (submitted.current || !householdId || !result.data) return;
    const selected = candidates.filter((item) => draftFor(item).selected);
    if (!selected.length) return setError('Välj minst en ingrediens.');
    const items = [];
    for (const ingredient of selected) {
      const draft = draftFor(ingredient);
      const quantity = draft.quantity.trim() ? Number(draft.quantity.replace(',', '.')) : null;
      if (
        !draft.name.trim() ||
        (draft.quantity.trim() &&
          (!Number.isFinite(quantity) || Number(quantity) <= 0 || !draft.unit))
      ) {
        return setError(`Kontrollera namn och mängd för ${ingredient.displayName}.`);
      }
      items.push({
        recipeIngredientId: ingredient.id,
        name: draft.name.trim(),
        quantity,
        unit: quantity === null ? null : draft.unit,
      });
    }
    submitted.current = true;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`${shoppingPath(householdId)}/items/batch`, {
        method: 'POST',
        body: JSON.stringify({ recipeId: result.data.id, items }),
      });
      Alert.alert(
        'Tillagd i inköpslistan',
        `${items.length} ${items.length === 1 ? 'vara' : 'varor'} har lagts till.`,
        [{ text: 'Visa inköpslistan', onPress: () => router.replace('/(tabs)/shopping') }],
      );
    } catch (saveError) {
      submitted.current = false;
      setError(shoppingMutationMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <IconButton
          accessibilityLabel="Tillbaka"
          icon={<ArrowLeft size={20} color={colors.brand.primary} />}
          onPress={() => router.back()}
        />
        <Text variant="h1">Lägg till saknade ingredienser</Text>
        {result.loading ? <Text>Läser in receptet...</Text> : null}
        {result.error ? <Text accessibilityRole="alert">{result.error}</Text> : null}
        {result.data ? (
          <>
            <Text>{result.data.title}</Text>
            <Text variant="bodySmall">
              Förslag på mängd visas bara när receptmatchningen kan jämföra mängder säkert. Okänd
              tillgång behöver ditt omdöme.
            </Text>
            {candidates.map((item) => {
              const draft = draftFor(item);
              return (
                <Card key={item.id} style={styles.card}>
                  <FilterChip
                    label={draft.selected ? 'Vald' : 'Välj'}
                    selected={draft.selected}
                    onPress={() => change(item.id, { selected: !draft.selected })}
                  />
                  <Text variant="h3">{item.displayName}</Text>
                  <Text variant="bodySmall">
                    {item.availability === 'UNKNOWN'
                      ? 'Tillgången kan inte jämföras säkert.'
                      : item.availability === 'PARTIAL'
                        ? 'Delvis tillgänglig hemma.'
                        : 'Saknas hemma.'}
                  </Text>
                  <Input
                    label="Namn"
                    value={draft.name}
                    onChangeText={(name) => change(item.id, { name })}
                    editable={!saving}
                  />
                  <Input
                    label="Mängd (valfritt)"
                    value={draft.quantity}
                    onChangeText={(quantity) => change(item.id, { quantity })}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                  <View style={styles.units}>
                    {UNITS.map((unit) => (
                      <FilterChip
                        key={unit}
                        label={unit}
                        selected={draft.unit === unit}
                        disabled={!draft.quantity.trim() || saving}
                        onPress={() => change(item.id, { unit })}
                      />
                    ))}
                  </View>
                </Card>
              );
            })}
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button
              label={`Lägg till valda (${candidates.filter((item) => draftFor(item).selected).length})`}
              onPress={() => void submit()}
              loading={saving}
              disabled={!candidates.length}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.lg, gap: spacing.base, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.semantic.error },
});
