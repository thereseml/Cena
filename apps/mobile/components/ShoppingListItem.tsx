import { Check, Circle } from 'lucide-react-native';
import { ListItem, colors, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';

export interface ShoppingListItemProps {
  item: string;
  checked: boolean;
  onToggle: () => void;
}

export function ShoppingListItem({ item, checked, onToggle }: ShoppingListItemProps) {
  return (
    <ListItem
      accessibilityRole="checkbox"
      accessibilityLabel={item}
      accessibilityState={{ checked }}
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
      <Text style={[styles.label, checked && styles.checkedLabel]}>{item}</Text>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  checked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
  },
  label: { flex: 1 },
  checkedLabel: { color: colors.text.muted, opacity: 0.72, textDecorationLine: 'line-through' },
});
