import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from './theme';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  trailing?: ReactNode;
}

export function SectionHeader({ title, description, trailing }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text variant="h2" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {description ? <Text variant="bodySmall">{description}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heading: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { color: colors.brand.primary },
  trailing: { flexShrink: 0 },
});
