import type { InventoryItem } from '@cena/contracts';
import { Badge, ListItem, colors, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { getExpiryLabel } from '../features/inventory/expiry';

export interface InventoryItemRowProps {
  item: InventoryItem;
  onPress?: () => void;
}

const LOCATION_LABELS = { FRIDGE: 'Kylskåp', FREEZER: 'Frys', PANTRY: 'Skafferi' } as const;

export function InventoryItemRow({ item, onPress }: InventoryItemRowProps) {
  const earliestExpiryBatch = item.batches
    .filter((batch) => batch.expiryDate !== null && batch.expiryType !== null)
    .sort((left, right) => (left.expiryDate ?? '').localeCompare(right.expiryDate ?? ''))[0];
  const expiry = earliestExpiryBatch ? getExpiryLabel(earliestExpiryBatch) : null;
  const quantity = formatQuantity(item.quantity);
  const location = LOCATION_LABELS[item.storageLocation];
  const accessibilityLabel = `${item.name}, ${quantity} ${item.unit}, ${location}${expiry ? `, ${expiry.text}` : ''}`;

  return (
    <ListItem
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Öppnar varans detaljer' : undefined}
      trailing={
        onPress || (expiry && expiry.urgency !== 'none') ? (
          <View style={styles.trailing}>
            {expiry && expiry.urgency !== 'none' ? (
              <Badge
                label={expiry.urgency === 'passed' ? 'Datum passerat' : 'Använd snart'}
                variant={expiry.urgency === 'passed' ? 'error' : 'warning'}
              />
            ) : null}
            {onPress ? <ArrowRight size={18} color={colors.text.muted} strokeWidth={1.8} /> : null}
          </View>
        ) : undefined
      }
    >
      <View style={styles.content}>
        <Text variant="h3" style={styles.name}>
          {item.name}
        </Text>
        <Text variant="bodySmall">
          {quantity} {item.unit} · {location}
        </Text>
        {expiry ? (
          <Text variant="caption" style={styles[expiry.urgency]}>
            {expiry.text}
          </Text>
        ) : null}
      </View>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xs },
  name: { color: colors.brand.primary },
  none: { color: colors.text.muted },
  soon: { color: colors.semantic.warning },
  passed: { color: colors.semantic.error },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 }).format(quantity);
}
