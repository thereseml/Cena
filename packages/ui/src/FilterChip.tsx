import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, radius, spacing } from './theme';
import { Text } from './Text';

export interface FilterChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
}

export function FilterChip({
  label,
  selected = false,
  disabled,
  style,
  ...props
}: FilterChipProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ ...props.accessibilityState, selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={(state) => [
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        state.pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text variant="label" style={selected ? styles.selectedLabel : styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.primary,
  },
  selected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  label: { color: colors.text.primary },
  selectedLabel: { color: colors.text.inverse },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
