import type { InventoryItem } from '@cena/contracts';
import { Badge, ListItem, colors, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';
import { getExpiryLabel } from '../features/inventory/expiry';

export interface InventoryItemRowProps {
  item: InventoryItem;
  onPress?: () => void;
}

const LOCATION_LABELS = { FRIDGE: 'Kylskåp', FREEZER: 'Frys', PANTRY: 'Skafferi' } as const;

export function InventoryItemRow({ item, onPress }: InventoryItemRowProps) {
  const expiry = item.batches
    .map((batch) => getExpiryLabel(batch))
    .filter((label) => label !== null)
    .sort((left, right) => {
      if (left.urgency === 'passed') return -1;
      if (right.urgency === 'passed') return 1;
      if (left.urgency === 'soon') return -1;
      if (right.urgency === 'soon') return 1;
      return 0;
    })[0];

  return (
    <ListItem
      onPress={onPress}
      trailing={
        expiry && expiry.urgency !== 'none' ? (
          <Badge
            label={expiry.urgency === 'passed' ? 'Datum passerat' : 'Använd snart'}
            variant={expiry.urgency === 'passed' ? 'error' : 'warning'}
          />
        ) : undefined
      }
    >
      <View style={styles.content}>
        <Text variant="h3" style={styles.name}>
          {item.name}
        </Text>
        <Text variant="bodySmall">
          {formatQuantity(item.quantity)} {item.unit} · {LOCATION_LABELS[item.storageLocation]}
        </Text>
        {expiry ? (
          <Text
            variant="caption"
            style={expiry.urgency === 'none' ? styles.expiry : styles.expiring}
          >
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
  expiry: { color: colors.text.muted },
  expiring: { color: colors.semantic.warning },
});

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 }).format(quantity);
}
