import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from './theme';

export interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, eyebrow, trailing, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.heading}>
        {eyebrow ? (
          <Text variant="caption" style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="h1" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: { flex: 1, minWidth: 0, paddingRight: spacing.base },
  eyebrow: { color: colors.semantic.success, marginBottom: spacing.xs },
  title: { color: colors.brand.primary },
  trailing: { flexShrink: 0 },
});
