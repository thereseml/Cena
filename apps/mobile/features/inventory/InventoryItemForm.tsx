import {
  INVENTORY_UNITS,
  type ExpirySource,
  type ExpiryType,
  type InventoryItem,
  type InventoryUnit,
  type SaveInventoryItemInput,
  type StorageLocation,
} from '@cena/contracts';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, colors, FilterChip, Input, spacing, Text } from '@cena/ui';
import { apiErrorMessage } from '../../lib/api';

const UNIT_LABELS: Record<InventoryUnit, string> = {
  st: 'st',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
};
const STORAGE_OPTIONS: { value: StorageLocation; label: string }[] = [
  { value: 'FRIDGE', label: 'Kylskåp' },
  { value: 'PANTRY', label: 'Skafferi' },
  { value: 'FREEZER', label: 'Frys' },
];
const EXPIRY_OPTIONS: { value: ExpiryType; label: string }[] = [
  { value: 'BEST_BEFORE', label: 'Bäst före' },
  { value: 'USE_BY', label: 'Sista förbrukningsdag' },
];

export interface InventoryItemFormInitialValues extends Omit<
  Partial<SaveInventoryItemInput>,
  'quantity' | 'unit'
> {
  quantity?: number | null;
  unit?: InventoryUnit | null;
}

interface InventoryItemFormProps {
  initialItem?: InventoryItem;
  initialValues?: InventoryItemFormInitialValues;
  saveLabel: string;
  onSave(input: SaveInventoryItemInput, requestKey: string): Promise<void>;
}

export function InventoryItemForm({
  initialItem,
  initialValues,
  saveLabel,
  onSave,
}: InventoryItemFormProps) {
  const initialBatch = initialItem?.batches[0];
  const [name, setName] = useState(initialItem?.name ?? '');
  const [quantity, setQuantity] = useState(
    initialItem
      ? String(initialItem.quantity).replace('.', ',')
      : initialValues?.quantity === null
        ? ''
        : initialValues?.quantity !== undefined
          ? String(initialValues.quantity).replace('.', ',')
          : '1',
  );
  const [unit, setUnit] = useState<InventoryUnit | null>(
    initialItem?.unit ?? (initialValues?.unit === null ? null : (initialValues?.unit ?? 'st')),
  );
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(
    initialItem?.storageLocation ?? initialValues?.storageLocation ?? 'FRIDGE',
  );
  const [expiryDate, setExpiryDate] = useState(
    initialBatch?.expiryDate ?? initialValues?.expiryDate ?? '',
  );
  const [expiryType, setExpiryType] = useState<ExpiryType | null>(
    initialBatch?.expiryType ?? initialValues?.expiryType ?? null,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const createRequest = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submit(): Promise<void> {
    const parsedQuantity = Number(quantity.trim().replace(',', '.'));
    const parsedDate = expiryDate.trim();
    if (!name.trim()) {
      setFieldError('Skriv vad varan heter.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFieldError('Ange en mängd som är större än noll.');
      return;
    }
    if (decimalPlaces(parsedQuantity) > 3) {
      setFieldError('Mängden kan ha högst tre decimaler.');
      return;
    }
    if (!unit) {
      setFieldError('Välj en enhet.');
      return;
    }
    if (parsedDate && !isCalendarDate(parsedDate)) {
      setFieldError('Ange datum som ÅÅÅÅ-MM-DD.');
      return;
    }
    if (parsedDate && !expiryType) {
      setFieldError('Välj vilken typ av datum du har angett.');
      return;
    }

    setFieldError(null);
    setServerError(null);
    setSaving(true);
    try {
      let expirySource: ExpirySource | null = null;
      if (parsedDate) {
        const unchangedEstimate =
          parsedDate === initialBatch?.expiryDate &&
          expiryType === initialBatch.expiryType &&
          initialBatch.expirySource === 'ESTIMATED';
        expirySource = unchangedEstimate ? 'ESTIMATED' : 'USER_ENTERED';
      }
      const input: SaveInventoryItemInput = {
        name: name.trim(),
        quantity: parsedQuantity,
        unit,
        storageLocation,
        expiryDate: parsedDate || null,
        expiryType: parsedDate ? expiryType : null,
        expirySource,
      };
      const fingerprint = JSON.stringify(input);
      if (createRequest.current?.fingerprint !== fingerprint) {
        createRequest.current = { fingerprint, key: createRequestKey() };
      }
      await onSave(input, createRequest.current.key);
      createRequest.current = null;
    } catch (error) {
      setServerError(apiErrorMessage(error, 'Vara kunde inte sparas. Försök igen.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Input
        label="Namn"
        value={name}
        onChangeText={setName}
        placeholder="Till exempel mjölk"
        autoCapitalize="sentences"
        maxLength={100}
        editable={!saving}
      />
      <Input
        label="Mängd"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="1"
        keyboardType="decimal-pad"
        editable={!saving}
      />

      <View style={styles.field}>
        <Text variant="label">Enhet</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.options}
        >
          {INVENTORY_UNITS.map((option) => (
            <FilterChip
              key={option}
              label={UNIT_LABELS[option]}
              selected={unit === option}
              disabled={saving}
              onPress={() => setUnit(option)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text variant="label">Förvaring</Text>
        <View style={styles.options}>
          {STORAGE_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={storageLocation === option.value}
              disabled={saving}
              onPress={() => setStorageLocation(option.value)}
            />
          ))}
        </View>
      </View>

      <Input
        label="Datum (valfritt)"
        value={expiryDate}
        onChangeText={setExpiryDate}
        placeholder="ÅÅÅÅ-MM-DD"
        accessibilityHint="Ange datum som fyra siffror för år, två för månad och två för dag."
        editable={!saving}
        maxLength={10}
      />
      {expiryDate.trim() ? (
        <View style={styles.field}>
          <Text variant="label">Datumtyp</Text>
          <View style={styles.options}>
            {EXPIRY_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={expiryType === option.value}
                disabled={saving}
                onPress={() => setExpiryType(option.value)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {fieldError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {fieldError}
        </Text>
      ) : null}
      {serverError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {serverError}
        </Text>
      ) : null}
      <Button
        label={saveLabel}
        onPress={() => void submit()}
        loading={saving}
        style={styles.save}
      />
    </View>
  );
}

function createRequestKey(): string {
  return `mobile:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  return (coefficient.split('.')[1]?.length ?? 0) - Number(exponentText ?? 0);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.semantic.error },
  save: { marginTop: spacing.sm },
});
