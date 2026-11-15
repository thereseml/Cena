import { Check, Circle } from 'lucide-react-native';
import { ListItem, colors, Text } from '@cena/ui';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface ShoppingListItemProps {
  item: string;
  checked: boolean;
  onToggle: () => void;
  quantity?: string | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ShoppingListItem({
  item,
  checked,
  onToggle,
  quantity,
  disabled = false,
  style,
}: ShoppingListItemProps) {
  return (
    <ListItem
      accessibilityRole="checkbox"
      accessibilityLabel={item}
      accessibilityState={{ checked }}
      disabled={disabled}
      style={[styles.row, style]}
      onPress={onToggle}
      leading={
        checked ? (
          <View style={styles.checked}>
            <Check size={16} color={colors.text.inverse} strokeWidth={2.2} />
          </View>
        ) : (
          <Circle size={24} color={colors.border} strokeWidth={1.7} />
        )
      }
      showSeparator
    >
      <View style={styles.label}>
        <Text style={checked && styles.checkedLabel}>{item}</Text>
        {quantity ? (
          <Text variant="bodySmall" style={styles.quantity}>
            {quantity}
          </Text>
        ) : null}
      </View>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1 },
  checked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
  },
  label: { flex: 1, gap: 2 },
  quantity: { color: colors.text.muted },
  checkedLabel: { color: colors.text.muted, opacity: 0.72, textDecorationLine: 'line-through' },
});
