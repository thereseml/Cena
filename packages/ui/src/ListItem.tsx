import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { colors, spacing } from './theme';

export interface ListItemProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  showSeparator?: boolean;
}

export function ListItem({
  children,
  leading,
  trailing,
  showSeparator = true,
  onPress,
  disabled,
  accessibilityRole,
  accessibilityState,
  style,
  ...props
}: ListItemProps) {
  return (
    <Pressable
      {...props}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={{ ...accessibilityState, ...(disabled ? { disabled: true } : {}) }}
      style={(state) => [
        styles.row,
        showSeparator && styles.separator,
        disabled && styles.disabled,
        state.pressed && onPress && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>{children}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  content: { flex: 1, minWidth: 0 },
  leading: { flexShrink: 0 },
  trailing: { flexShrink: 0 },
  separator: { borderBottomWidth: 1, borderBottomColor: colors.border },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
