import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { colors, spacing } from './theme';
import { Text } from './Text';
import type { ReactNode } from 'react';

export interface StatItem {
  value: string | number;
  label: string;
}

export interface StatCardProps {
  items: readonly StatItem[];
  title?: string;
  trailing?: ReactNode;
  note?: string;
}

export function StatCard({ items, title, trailing, note }: StatCardProps) {
  return (
    <Card style={styles.card}>
      {title ? (
        <View style={styles.heading}>
          <Text variant="h3" style={styles.title}>
            {title}
          </Text>
          {trailing}
        </View>
      ) : null}
      <View style={styles.items}>
        {items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.item}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Text variant="h2" style={styles.value}>
              {item.value}
            </Text>
            <Text variant="bodySmall">{item.label}</Text>
          </View>
        ))}
      </View>
      {note ? (
        <Text variant="caption" style={styles.note}>
          {note}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    backgroundColor: colors.background.subtle,
    borderColor: 'transparent',
  },
  heading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: { color: colors.brand.primary },
  items: { flexDirection: 'row', paddingVertical: spacing.base },
  item: { flex: 1, minWidth: 0, gap: spacing.xs },
  value: { color: colors.brand.primary },
  divider: {
    position: 'absolute',
    left: -spacing.base,
    top: spacing.xs,
    bottom: spacing.xs,
    width: 1,
    backgroundColor: colors.border,
  },
  note: { color: colors.text.muted, marginTop: spacing.md },
});
