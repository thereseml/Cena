import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, radius } from './theme';

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: ReactNode;
  accessibilityLabel: string;
  variant?: 'subtle' | 'filled' | 'outline';
}

export function IconButton({
  icon,
  accessibilityLabel,
  variant = 'subtle',
  disabled,
  style,
  accessibilityState,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        state.pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  subtle: { backgroundColor: colors.background.subtle },
  filled: { backgroundColor: colors.brand.primary },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
