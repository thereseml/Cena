import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from './theme';

export interface CheckboxProps extends Omit<PressableProps, 'children'> {
  label: string;
  checked?: boolean;
}

export function Checkbox({
  label,
  checked = false,
  disabled,
  style,
  accessibilityLabel,
  accessibilityState,
  ...props
}: CheckboxProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={(state) => [
        styles.row,
        disabled && styles.disabled,
        state.pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.box, checked && styles.checked]}
      >
        {checked ? <View style={styles.checkmark} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  box: {
    width: spacing.lg,
    height: spacing.lg,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: spacing.xs,
    borderColor: colors.brand.primary,
    backgroundColor: colors.background.elevated,
  },
  checked: { backgroundColor: colors.brand.primary },
  checkmark: {
    width: spacing.sm,
    height: spacing.md,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text.inverse,
    transform: [{ translateY: -spacing.xs / 2 }, { rotate: '45deg' }],
  },
  label: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
