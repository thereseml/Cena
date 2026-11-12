import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View accessible accessibilityLabel={label} style={[styles.badge, styles[`${variant}Badge`]]}>
      <Text variant="caption" style={styles[variant]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.subtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  neutral: { color: colors.brand.primary },
  success: { color: colors.text.primary },
  warning: { color: colors.text.primary },
  error: { color: colors.text.primary },
  neutralBadge: { borderColor: colors.border },
  successBadge: { borderColor: colors.semantic.success },
  warningBadge: { borderColor: colors.semantic.warning },
  errorBadge: { borderColor: colors.semantic.error },
});
