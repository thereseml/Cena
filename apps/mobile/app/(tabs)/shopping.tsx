import type { InventoryUnit, ShoppingListItem as ShoppingItem } from '@cena/contracts';
import { useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react-native';
import {
  Button,
  colors,
  EmptyState,
  FilterChip,
  IconButton,
  Input,
  ScreenHeader,
  SectionHeader,
  spacing,
  Text,
} from '@cena/ui';
import { ShoppingListItem } from '../../components/ShoppingListItem';
import { TabScreen } from '../../components/TabScreen';
import { useAuth } from '../../features/auth/AuthProvider';
import { shoppingMutationMessage, useShoppingList } from '../../features/shopping/useShoppingList';
import { apiRequest } from '../../lib/api';

const UNITS: InventoryUnit[] = ['st', 'g', 'kg', 'ml', 'l'];

export default function ShoppingScreen() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const shopping = useShoppingList(householdId);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<InventoryUnit | null>(null);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const pending = shopping.busyIds.length > 0;
  const toShop = shopping.items.filter((item) => !item.isPurchased);
  const purchased = shopping.items.filter((item) => item.isPurchased);

  function startEdit(item: ShoppingItem) {
    setEditing(item);
    setName(item.name);
    setQuantity(item.quantity === null ? '' : String(item.quantity).replace('.', ','));
    setUnit(item.unit);
    setMutationError(null);
  }

  function resetForm() {
    setEditing(null);
    setName('');
    setQuantity('');
    setUnit(null);
  }

  async function saveItem() {
    const cleanName = name.trim();
    const cleanQuantity = quantity.trim();
    const parsedQuantity = cleanQuantity ? Number(cleanQuantity.replace(',', '.')) : null;
    if (!cleanName) return setMutationError('Skriv vad varan heter.');
    if (
      cleanQuantity &&
      (!Number.isFinite(parsedQuantity) || Number(parsedQuantity) <= 0 || !unit)
    ) {
      return setMutationError('Ange en giltig mängd och välj en enhet.');
    }
    setMutationError(null);
    try {
      if (editing)
        await shopping.update(
          editing,
          cleanName,
          parsedQuantity,
          parsedQuantity === null ? null : unit,
        );
      else await shopping.add(cleanName, parsedQuantity, parsedQuantity === null ? null : unit);
      setMutationNotice(editing ? 'Ändringen har sparats.' : 'Varan har lagts till.');
      resetForm();
    } catch (error) {
      setMutationError(shoppingMutationMessage(error));
    }
  }

  async function toggle(item: ShoppingItem) {
    setMutationError(null);
    try {
      await shopping.toggle(item);
      setMutationNotice(item.isPurchased ? 'Varan är tillbaka under Att handla.' : 'Varan är markerad som handlad.');
    } catch (error) {
      setMutationError(shoppingMutationMessage(error));
    }
  }

  function confirmDelete(item: ShoppingItem) {
    Alert.alert('Ta bort vara?', `Vill du ta bort ${item.name} från listan?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () =>
          void shopping
            .remove(item)
            .catch((error) => setMutationError(shoppingMutationMessage(error))),
      },
    ]);
  }

  function clearCompleted() {
    const items = purchased.map((item) => ({ id: item.id, expectedVersion: item.version }));
    Alert.alert(
      'Rensa handlade varor?',
      'De valda varorna tas bort från inköpslistan. De läggs inte till i Mitt kök.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Rensa',
          style: 'destructive',
          onPress: () => {
            if (!householdId) return;
            void (async () => {
              try {
                await apiRequest(`households/${householdId}/shopping-list/clear-completed`, {
                  method: 'POST',
                  body: JSON.stringify({ items }),
                });
                await shopping.refresh();
              } catch (error) {
                setMutationError(shoppingMutationMessage(error));
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Inköpslista"
          eyebrow="ATT HANDLA"
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
        />
        <Text style={styles.intro}>Allt du behöver handla, samlat på ett ställe.</Text>

        <View style={styles.form}>
          <Input
            label={editing ? 'Redigera vara' : undefined}
            value={name}
            onChangeText={setName}
            placeholder="Lägg till en vara..."
            maxLength={100}
            editable={!pending}
            returnKeyType="done"
            onSubmitEditing={() => void saveItem()}
          />
          <View style={styles.quantityRow}>
            <Input
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Mängd (valfritt)"
              keyboardType="decimal-pad"
              accessibilityLabel="Mängd, valfritt"
              editable={!pending}
              style={styles.quantityInput}
            />
            {UNITS.map((value) => (
              <FilterChip
                key={value}
                label={value}
                selected={unit === value}
                disabled={!quantity.trim() || pending}
                onPress={() => setUnit(value)}
              />
            ))}
          </View>
          {mutationError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {mutationError}
            </Text>
          ) : null}
          {mutationNotice ? (
            <Text accessibilityRole="status" style={styles.notice}>
              {mutationNotice}
            </Text>
          ) : null}
          <View style={styles.formActions}>
            {editing ? (
              <Button label="Avbryt" variant="outline" onPress={resetForm} disabled={pending} />
            ) : null}
            <Button
              label={editing ? 'Spara ändring' : 'Lägg till vara'}
              leadingIcon={<Plus size={18} color={colors.text.inverse} />}
              onPress={() => void saveItem()}
              loading={
                shopping.busyIds.includes('new') ||
                (editing !== null && shopping.busyIds.includes(editing.id))
              }
            />
          </View>
        </View>

        {shopping.loading ? (
          <ActivityIndicator
            accessibilityLabel="Läser in inköpslistan"
            color={colors.brand.primary}
            style={styles.loading}
          />
        ) : null}
        {shopping.error ? (
          <EmptyState
            title="Inköpslistan kunde inte läsas in"
            description={shopping.error}
            action={<Button label="Försök igen" onPress={() => void shopping.refresh()} />}
          />
        ) : null}
        {!shopping.loading && !shopping.error && shopping.items.length === 0 ? (
          <EmptyState
            title="Din inköpslista är tom."
            description="Lägg till något du behöver handla eller välj ingredienser från ett recept."
          />
        ) : null}
        {!shopping.loading && !shopping.error && shopping.items.length > 0 ? (
          <>
            <SectionHeader
              title="Att handla"
              trailing={<Text variant="bodySmall">{toShop.length} kvar</Text>}
            />
            {toShop.length ? (
              <View style={styles.list}>
                {toShop.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    busy={shopping.busyIds.includes(item.id)}
                    onToggle={() => void toggle(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => confirmDelete(item)}
                  />
                ))}
              </View>
            ) : (
              <Text variant="bodySmall" style={styles.muted}>
                Inget kvar att handla.
              </Text>
            )}
            {purchased.length ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Handlat"
                  trailing={<Text variant="bodySmall">{purchased.length}</Text>}
                />
                <View style={styles.list}>
                  {purchased.map((item) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      busy={shopping.busyIds.includes(item.id)}
                      onToggle={() => void toggle(item)}
                      onEdit={() => startEdit(item)}
                      onDelete={() => confirmDelete(item)}
                    />
                  ))}
                </View>
                <Button
                  label="Lägg till i Mitt kök"
                  variant="secondary"
                  onPress={() => router.push('/shopping-import')}
                />
                <Button label="Rensa handlade varor" variant="outline" onPress={clearCompleted} />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </TabScreen>
  );
}

function ShoppingRow({
  item,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const quantity =
    item.quantity === null ? null : `${item.quantity.toLocaleString('sv-SE')} ${item.unit}`;
  return (
    <View style={styles.row}>
      <ShoppingListItem
        item={item.name}
        checked={item.isPurchased}
        quantity={quantity}
        onToggle={onToggle}
        disabled={busy}
        style={styles.shoppingItem}
      />
      <View testID="shopping-row-actions" style={styles.rowActions}>
        <IconButton
          icon={<Pencil size={18} color={colors.brand.primary} />}
          accessibilityLabel={`Redigera ${item.name}`}
          onPress={onEdit}
          disabled={busy}
        />
        <IconButton
          icon={<Trash2 size={18} color={colors.semantic.error} />}
          accessibilityLabel={`Ta bort ${item.name}`}
          onPress={onDelete}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  intro: { fontSize: 16, lineHeight: 24 },
  form: {
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: 20,
    backgroundColor: colors.background.elevated,
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  quantityInput: { minWidth: 130, flex: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  shoppingItem: { flex: 1 },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.md, marginTop: spacing.xl },
  loading: { marginVertical: spacing.xl },
  error: { color: colors.semantic.error },
  notice: { color: colors.semantic.success },
  muted: { color: colors.text.muted },
});
