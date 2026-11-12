import { Badge, ListItem, colors, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';
import type { KitchenProduct } from '../data/mockData';

export interface InventoryItemRowProps {
  product: KitchenProduct;
}

export function InventoryItemRow({ product }: InventoryItemRowProps) {
  return (
    <ListItem
      trailing={product.expiringSoon ? <Badge label="Använd snart" variant="warning" /> : undefined}
    >
      <View style={styles.content}>
        <Text variant="h3" style={styles.name}>
          {product.name}
        </Text>
        <Text variant="bodySmall">
          {product.quantity} · {product.location}
        </Text>
        {product.expires ? (
          <Text variant="caption" style={product.expiringSoon ? styles.expiring : styles.expiry}>
            {product.expires}
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
