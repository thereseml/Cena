import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading = false, disabled, style, accessibilityLabel, accessibilityState, ...props }: ButtonProps) {
  const inactive = Boolean(disabled || loading);
  const foreground = variant === 'primary' ? colors.text.inverse : colors.brand.primary;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.outline,
        inactive && styles.inactive,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <Text variant="label" style={{ color: foreground }}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.button, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.brand.primary },
  secondary: { backgroundColor: colors.background.subtle },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brand.primary },
  inactive: { opacity: 0.5 },
});
