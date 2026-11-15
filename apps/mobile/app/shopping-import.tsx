import type { InventoryUnit, ShoppingListItem } from '@cena/contracts';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, colors, FilterChip, IconButton, Input, spacing, Text } from '@cena/ui';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { useShoppingList, shoppingMutationMessage } from '../features/shopping/useShoppingList';
import { shoppingPath } from '../features/shopping/shopping-api';
import { apiRequest } from '../lib/api';

type Draft = {
  selected: boolean;
  name: string;
  quantity: string;
  unit: InventoryUnit | null;
  storageLocation: 'FRIDGE' | 'FREEZER' | 'PANTRY' | null;
};
const UNITS: InventoryUnit[] = ['st', 'g', 'kg', 'ml', 'l'];
const STORAGE = [
  { value: 'FRIDGE', label: 'Kylskåp' },
  { value: 'PANTRY', label: 'Skafferi' },
  { value: 'FREEZER', label: 'Frys' },
] as const;

export default function ShoppingImportScreen() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const shopping = useShoppingList(householdId);
  const [drafts, setDrafts] = useState<{
    householdId: string | undefined;
    values: Record<string, Draft>;
  }>({ householdId, values: {} });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);

  const draftValues = drafts.householdId === householdId ? drafts.values : {};
  function draftFor(item: ShoppingListItem): Draft {
    return (
      draftValues[item.id] ?? {
        selected: true,
        name: item.name,
        quantity: item.quantity === null ? '' : String(item.quantity).replace('.', ','),
        unit: item.unit,
        storageLocation: null,
      }
    );
  }

  function change(item: ShoppingListItem, update: Partial<Draft>) {
    setDrafts((current) => ({
      householdId,
      values: {
        ...(current.householdId === householdId ? current.values : {}),
        [item.id]: { ...draftFor(item), ...update },
      },
    }));
  }

  async function submit() {
    if (submitted.current || !householdId) return;
    const chosen = shopping.items.filter((item) => draftFor(item).selected && item.isPurchased);
    if (!chosen.length) return setError('Välj minst en handlad vara.');
    const entries = [];
    for (const item of chosen) {
      const draft = draftFor(item);
      const quantity = Number(draft.quantity.trim().replace(',', '.'));
      if (
        !draft.name.trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !draft.unit ||
        !draft.storageLocation
      ) {
        return setError(`Fyll i namn, mängd, enhet och förvaring för ${item.name}.`);
      }
      entries.push({
        shoppingListItemId: item.id,
        expectedVersion: item.version,
        name: draft.name.trim(),
        quantity,
        unit: draft.unit,
        storageLocation: draft.storageLocation,
        expiryDate: null,
        expiryType: null,
        expirySource: null,
      });
    }
    submitted.current = true;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`${shoppingPath(householdId)}/import-to-inventory`, {
        method: 'POST',
        body: JSON.stringify({ items: entries }),
      });
      Alert.alert(
        'Tillagt i Mitt kök',
        `${entries.length} ${entries.length === 1 ? 'vara har' : 'varor har'} lagts till. De har tagits bort från den aktiva inköpslistan.`,
        [{ text: 'Klart', onPress: () => router.back() }],
      );
    } catch (saveError) {
      submitted.current = false;
      setError(shoppingMutationMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function confirm() {
    const count = shopping.items.filter(
      (item) => draftFor(item).selected && item.isPurchased,
    ).length;
    Alert.alert(
      'Lägga till i Mitt kök?',
      `${count} handlade ${count === 1 ? 'vara' : 'varor'} läggs till i lagret och tas bort från den aktiva inköpslistan.`,
      [
        { text: 'Granska mer', style: 'cancel' },
        { text: 'Bekräfta', onPress: () => void submit() },
      ],
    );
  }

  const checkedItems = shopping.items.filter((item) => item.isPurchased);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <IconButton
          accessibilityLabel="Tillbaka"
          icon={<ArrowLeft size={20} color={colors.brand.primary} />}
          onPress={() => router.back()}
        />
        <Text variant="h1">Lägg till i Mitt kök</Text>
        <Text>Granska det du har köpt. Inget läggs till förrän du bekräftar.</Text>
        {shopping.error ? (
          <View style={styles.errorState}>
            <Text accessibilityRole="alert" style={styles.error}>
              {shopping.error}
            </Text>
            <Button label="Försök igen" variant="outline" onPress={() => void shopping.refresh()} />
          </View>
        ) : null}
        {shopping.loading ? <Text>Läser in handlade varor...</Text> : null}
        {!shopping.loading && checkedItems.length === 0 ? (
          <Text>Det finns inga handlade varor att lägga till.</Text>
        ) : null}
        {checkedItems.map((item) => {
          const draft = draftFor(item);
          return (
            <Card key={item.id} style={styles.card}>
              <FilterChip
                label={draft.selected ? 'Vald för köket' : 'Välj vara'}
                selected={draft.selected}
                onPress={() => change(item, { selected: !draft.selected })}
              />
              <Input
                label="Namn"
                value={draft.name}
                onChangeText={(name) => change(item, { name })}
                editable={!saving}
              />
              <Input
                label="Mängd"
                value={draft.quantity}
                onChangeText={(quantity) => change(item, { quantity })}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              <View style={styles.options}>
                {UNITS.map((unit) => (
                  <FilterChip
                    key={unit}
                    label={unit}
                    selected={draft.unit === unit}
                    disabled={saving}
                    onPress={() => change(item, { unit })}
                  />
                ))}
              </View>
              <Text variant="label">Förvaring</Text>
              <View style={styles.options}>
                {STORAGE.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={draft.storageLocation === option.value}
                    disabled={saving}
                    onPress={() => change(item, { storageLocation: option.value })}
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
          label="Bekräfta och lägg till"
          onPress={confirm}
          loading={saving}
          disabled={shopping.loading || !checkedItems.length}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.lg, gap: spacing.base, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.semantic.error },
  errorState: { gap: spacing.md },
});
