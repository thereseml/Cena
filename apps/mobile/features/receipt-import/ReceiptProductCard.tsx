import { INVENTORY_UNITS, type StorageLocation } from '@cena/contracts';
import { Badge, Button, Card, Checkbox, FilterChip, Input, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';
import { reviewItemError, type ReceiptReviewItem } from './receipt-review';

const STORAGE: { value: StorageLocation; label: string }[] = [
  { value: 'FRIDGE', label: 'Kylskåp' },
  { value: 'FREEZER', label: 'Frys' },
  { value: 'PANTRY', label: 'Skafferi' },
];

export interface ReceiptProductCardProps {
  item: ReceiptReviewItem;
  disabled?: boolean;
  onChange(item: ReceiptReviewItem): void;
  onRemove(): void;
}

export function ReceiptProductCard({
  item,
  disabled,
  onChange,
  onRemove,
}: ReceiptProductCardProps) {
  const error = item.selected ? reviewItemError(item) : null;
  return (
    <Card style={styles.card}>
      <Text variant="h3">{item.name || 'Ny vara'}</Text>
      <Text variant="caption" tone="muted">
        Originaltext: {item.originalText || 'Manuellt tillagd'}
      </Text>
      {item.classification === 'UNKNOWN' ? (
        <Badge label="Behöver granskas" variant="warning" />
      ) : null}
      {item.price !== null ? (
        <Text variant="bodySmall">
          Pris på kvittot: {item.price.toFixed(2).replace('.', ',')} kr
        </Text>
      ) : null}
      <Checkbox
        label={`${item.selected ? 'Vald' : 'Välj'}: ${item.name || 'Ny vara'}`}
        checked={item.selected}
        disabled={disabled}
        onPress={() => onChange({ ...item, selected: !item.selected })}
      />
      <Input
        label="Namn"
        accessibilityLabel={`Namn ${item.id}`}
        value={item.name}
        editable={!disabled}
        onChangeText={(name) => onChange({ ...item, name })}
      />
      <Input
        label="Mängd"
        accessibilityLabel={`Mängd ${item.id}`}
        value={item.quantity}
        keyboardType="decimal-pad"
        editable={!disabled}
        onChangeText={(quantity) => onChange({ ...item, quantity, suggestedQuantity: false })}
      />
      {item.suggestedQuantity || item.suggestedUnit ? (
        <Text variant="caption" tone="muted">
          Förslag: {item.suggestedQuantity ? 'mängd 1' : ''}
          {item.suggestedQuantity && item.suggestedUnit ? ', ' : ''}
          {item.suggestedUnit ? 'enhet st' : ''}. Inte avläst från kvittot.
        </Text>
      ) : null}
      <Text variant="label">Enhet</Text>
      <View style={styles.options}>
        {INVENTORY_UNITS.map((unit) => (
          <FilterChip
            key={unit}
            label={unit}
            selected={item.unit === unit}
            disabled={disabled}
            onPress={() => onChange({ ...item, unit, suggestedUnit: false })}
          />
        ))}
      </View>
      <Text variant="label">
        Förvaring{item.storageLocation ? ' (kontrollera och ändra vid behov)' : ' saknas'}
      </Text>
      <View style={styles.options}>
        {STORAGE.map(({ value, label }) => (
          <FilterChip
            key={value}
            label={label}
            selected={item.storageLocation === value}
            disabled={disabled}
            onPress={() =>
              onChange({ ...item, storageLocation: item.storageLocation === value ? null : value })
            }
          />
        ))}
      </View>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Button
        label={`Ta bort ${item.name || 'varan'}`}
        variant="outline"
        disabled={disabled}
        onPress={onRemove}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
