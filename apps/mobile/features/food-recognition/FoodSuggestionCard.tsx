import type { FoodSuggestion, InventoryUnit, StorageLocation } from '@cena/contracts';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, spacing, Text } from '@cena/ui';

export interface FoodSuggestionCardProps {
  suggestion: FoodSuggestion;
  manuallyAdded?: boolean;
  quantity: number | null;
  unit: InventoryUnit | null;
  storageLocation: StorageLocation;
  expiryDate: string | null;
  disabled?: boolean;
  onEdit(): void;
  onRemove(): void;
}

const UNIT_LABELS: Record<InventoryUnit, string> = {
  st: 'st',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
};
const STORAGE_LABELS: Record<StorageLocation, string> = {
  FRIDGE: 'Kylskåp',
  FREEZER: 'Frys',
  PANTRY: 'Skafferi',
};

export function FoodSuggestionCard({
  suggestion,
  manuallyAdded = false,
  quantity,
  unit,
  storageLocation,
  expiryDate,
  disabled = false,
  onEdit,
  onRemove,
}: FoodSuggestionCardProps) {
  const hasAmount = quantity !== null && unit !== null;

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.nameBlock}>
          <Text variant="h3">{suggestion.name || 'Ny vara'}</Text>
          <Text variant="bodySmall" tone="muted" style={styles.details}>
            {hasAmount ? `${quantity} ${UNIT_LABELS[unit]}` : 'Mängd behöver anges'}
            {' · '}
            {STORAGE_LABELS[storageLocation]}
            {expiryDate ? ` · Datum ${expiryDate}` : ''}
          </Text>
        </View>
        <Badge
          label={
            manuallyAdded
              ? 'Manuellt tillagd'
              : suggestion.confidence === 'LOW'
                ? 'Osäkert förslag'
                : 'Kontrollera förslaget'
          }
          variant={manuallyAdded ? 'neutral' : 'warning'}
        />
      </View>
      {suggestion.description ? (
        <Text variant="bodySmall" tone="muted">
          {suggestion.description}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Redigera"
          variant="outline"
          onPress={onEdit}
          disabled={disabled}
          style={styles.action}
        />
        <Button
          label="Ta bort"
          variant="secondary"
          onPress={onRemove}
          disabled={disabled}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  heading: { gap: spacing.sm },
  nameBlock: { gap: spacing.xs },
  details: { lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
