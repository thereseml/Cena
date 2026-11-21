import type { InventoryItem } from '@cena/contracts';
import { Badge, ListItem, colors, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { getExpiryLabel } from '../features/inventory/expiry';

export interface InventoryItemRowProps {
  item: InventoryItem;
  onPress?: () => void;
  now?: Date;
}

const LOCATION_LABELS = { FRIDGE: 'Kylskåp', FREEZER: 'Frys', PANTRY: 'Skafferi' } as const;

export function InventoryItemRow({ item, onPress, now }: InventoryItemRowProps) {
  const expiries = item.batches.flatMap((batch) => {
    const label = getExpiryLabel(batch, now);
    return label ? [{ batch, label }] : [];
  });
  const urgentExpiries = expiries.filter(({ label }) => label.urgency !== 'none');
  const quantity = formatQuantity(item.quantity);
  const location = LOCATION_LABELS[item.storageLocation];
  const accessibilityLabel = `${item.name}, ${quantity} ${item.unit}, ${location}${expiries.length ? `, ${expiries.map(({ label }) => label.text).join(', ')}` : ''}`;

  return (
    <ListItem
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Öppnar varans detaljer' : undefined}
      trailing={
        onPress || urgentExpiries.length > 0 ? (
          <View style={styles.trailing}>
            {urgentExpiries.map(({ batch, label }) => (
              <Badge
                key={batch.id}
                label={label.urgency === 'passed' ? 'Datum passerat' : 'Använd snart'}
                variant={label.urgency === 'passed' ? 'error' : 'warning'}
              />
            ))}
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
        {expiries.map(({ batch, label }) => (
          <View key={batch.id} style={styles.expiryInfo}>
            <Text variant="caption" style={styles[label.urgency]}>
              {label.text}
            </Text>
            {label.urgency === 'passed' &&
            batch.expiryType === 'USE_BY' &&
            batch.expirySource !== 'ESTIMATED' ? (
              <Text variant="caption" style={styles.passed}>
                Livsmedel ska inte användas efter sista förbrukningsdag.
              </Text>
            ) : label.urgency === 'passed' &&
              batch.expiryType === 'USE_BY' &&
              batch.expirySource === 'ESTIMATED' ? (
              <Text variant="caption" style={styles.none}>
                Uppskattat datum. Kontrollera datumet på förpackningen.
              </Text>
            ) : label.urgency === 'passed' && batch.expiryType === 'BEST_BEFORE' ? (
              <Text variant="caption" style={styles.none}>
                Bäst före handlar främst om kvalitet. Bedöm alltid livsmedlet innan du använder det.
              </Text>
            ) : null}
          </View>
        ))}
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
  expiryInfo: { gap: spacing.xs },
});

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 }).format(quantity);
}
